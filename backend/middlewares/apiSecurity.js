import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { secureLogger } from './secureLogger.js';

// Rate limiting más agresivo para APIs críticas
export const criticalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Solo 10 requests por ventana para APIs críticas
  message: {
    error: 'Demasiadas solicitudes a API crítica',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    secureLogger.logSecurity('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent'),
      type: 'critical_api'
    });
    res.status(429).json({
      error: 'Demasiadas solicitudes a API crítica',
      retryAfter: '15 minutos'
    });
  }
});

// Rate limiting para APIs de autenticación (más permisivo para desarrollo)
export const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 en desarrollo, 100 en producción
  message: {
    error: 'Demasiados intentos de autenticación',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar rate limiting para endpoints de solo lectura y endpoints frecuentes en desarrollo
    const readOnlyEndpoints = [
      '/api/auth/sucursales', 
      '/api/auth/check-username',
      '/api/auth/active-users',
      '/api/auth/me'
    ];
    
    // En desarrollo, ser más permisivo con endpoints de usuario autenticado
    if (process.env.NODE_ENV === 'development') {
      return readOnlyEndpoints.some(endpoint => req.originalUrl.includes(endpoint));
    }
    
    // En producción, solo saltar endpoints de solo lectura básicos
    return ['/api/auth/sucursales', '/api/auth/check-username'].some(endpoint => req.originalUrl.includes(endpoint));
  },
  handler: (req, res) => {
    secureLogger.logSecurity('AUTH_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Demasiados intentos de autenticación',
      retryAfter: '15 minutos'
    });
  }
});

// Rate limiting general para APIs (más permisivo para desarrollo)
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // Aumentado a 500 requests por ventana
  message: {
    error: 'Demasiadas solicitudes',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar IP real considerando Railway proxy
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Slow down para APIs después de cierto límite
export const apiSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos 
  delayAfter: 20, // Permitir 20 requests a velocidad normal
  delayMs: () => 500, // Agregar 500ms de delay por cada request adicional
  maxDelayMs: 10000, // Máximo 10 segundos de delay
  validate: { delayMs: false } // Disable warning
});

// Middleware para validar headers de seguridad
export const validateSecurityHeaders = (req, res, next) => {
  const requiredHeaders = ['user-agent'];
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /scanner/i,
    /exploit/i
  ];

  // Validar User-Agent
  const userAgent = req.get('User-Agent');
  if (!userAgent) {
    secureLogger.logSecurity('MISSING_USER_AGENT', {
      ip: req.ip,
      endpoint: req.originalUrl
    });
    return res.status(400).json({ error: 'User-Agent requerido' });
  }

  // Detectar User-Agents sospechosos
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  if (isSuspicious) {
    secureLogger.logSecurity('SUSPICIOUS_USER_AGENT', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userAgent: userAgent
    });
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  next();
};

// Middleware para validar origen de requests
export const validateOrigin = (req, res, next) => {
  const allowedOrigins = [
    'https://soportepalmares.vercel.app',
    'https://soporte-palmares.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const origin = req.get('Origin') || req.get('Referer');
  
  // En desarrollo, ser más permisivo
  if (process.env.NODE_ENV === 'development') {
    // Permitir requests sin origen si hay autenticación válida
    if (!origin && req.user) {
      return next();
    }
    
    // Permitir cualquier localhost
    if (origin && origin.includes('localhost')) {
      return next();
    }
  }
  
  // Para requests sin origen, requerir autenticación válida
  if (!origin && !req.user) {
    secureLogger.logSecurity('NO_ORIGIN_NO_AUTH', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({ error: 'Origen no válido' });
  }

  // Si hay origen, validar que esté en la lista permitida
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => 
      origin.startsWith(allowed) || 
      (process.env.NODE_ENV === 'development' && origin.includes('localhost'))
    );

    if (!isAllowed) {
      secureLogger.logSecurity('INVALID_ORIGIN', {
        ip: req.ip,
        endpoint: req.originalUrl,
        origin: origin,
        userAgent: req.get('User-Agent')
      });
      return res.status(403).json({ error: 'Origen no autorizado' });
    }
  }

  next();
};

// Middleware para detectar patrones de ataque
export const detectAttackPatterns = (req, res, next) => {
  const attackPatterns = [
    // SQL Injection - más específico para evitar falsos positivos
    /(\bunion\s+select\b|\bselect\s+.*\bfrom\b|\binsert\s+into\b|\bdelete\s+from\b|\bdrop\s+table\b)/i,
    // XSS
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    // Path Traversal
    /\.\.\/.*\.\./g,
    /\.\.\\.*\.\./g,
    // Command Injection - más específico
    /(\||;|&)\s*(rm\s|del\s|cat\s|type\s|wget\s|curl\s)/g
  ];

  // Solo verificar body y params, no query params normales
  const requestData = JSON.stringify({
    body: req.body,
    params: req.params
  });

  // Excluir parámetros legítimos comunes
  const legitimateParams = ['usuarioId', 'ticketId', 'page', 'limit', '_t', 'estado', 'prioridad'];
  const queryString = Object.keys(req.query || {}).join(',');
  const hasOnlyLegitimateParams = Object.keys(req.query || {}).every(key => 
    legitimateParams.includes(key) || /^[a-zA-Z0-9_]+$/.test(key)
  );

  if (!hasOnlyLegitimateParams) {
    const foundAttack = attackPatterns.find(pattern => pattern.test(requestData));
    
    if (foundAttack) {
      secureLogger.logSecurity('ATTACK_PATTERN_DETECTED', {
        ip: req.ip,
        endpoint: req.originalUrl,
        pattern: foundAttack.toString(),
        data: requestData.substring(0, 500),
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({ error: 'Solicitud inválida' });
    }
  }

  next();
};

// Middleware para endpoints administrativos
export const adminEndpointProtection = (req, res, next) => {
  // Aplicar todas las protecciones para endpoints admin
  criticalApiLimiter(req, res, (err) => {
    if (err) return next(err);
    
    validateSecurityHeaders(req, res, (err) => {
      if (err) return next(err);
      
      validateOrigin(req, res, (err) => {
        if (err) return next(err);
        
        detectAttackPatterns(req, res, next);
      });
    });
  });
};

// Headers de seguridad mejorados
export const enhancedSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Necesario para React en desarrollo
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"], // Para APIs y WebSockets
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"], // Equivalente a X-Frame-Options: DENY
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Agregar headers faltantes explícitamente
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  noSniff: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' } // Referrer-Policy
});

export default {
  criticalApiLimiter,
  authApiLimiter,
  generalApiLimiter,
  apiSlowDown,
  validateSecurityHeaders,
  validateOrigin,
  detectAttackPatterns,
  adminEndpointProtection,
  enhancedSecurityHeaders
};
