import { criticalApiLimiter, validateOrigin, detectAttackPatterns } from './apiSecurity.js';
import { secureLogger } from './secureLogger.js';

// Middleware específico para endpoints administrativos críticos
export const protectAdminEndpoints = (req, res, next) => {
  // Log del acceso a endpoint administrativo
  secureLogger.logSecurity('ADMIN_ENDPOINT_ACCESS', {
    ip: req.ip,
    endpoint: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userRole: req.user?.role
  });

  // Validar que el usuario tenga rol admin
  if (!req.user || req.user.role !== 'admin') {
    secureLogger.logSecurity('UNAUTHORIZED_ADMIN_ACCESS', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    return res.status(403).json({ error: 'Acceso denegado: Se requieren privilegios de administrador' });
  }

  next();
};

// Middleware para endpoints de gestión de usuarios
export const protectUserManagement = (req, res, next) => {
  const allowedRoles = ['admin', 'supervisor'];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    secureLogger.logSecurity('UNAUTHORIZED_USER_MANAGEMENT_ACCESS', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    return res.status(403).json({ error: 'Acceso denegado: Se requieren privilegios de administrador o supervisor' });
  }

  next();
};

// Middleware para endpoints de reportes
export const protectReports = (req, res, next) => {
  const allowedRoles = ['admin', 'supervisor'];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    secureLogger.logSecurity('UNAUTHORIZED_REPORTS_ACCESS', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    return res.status(403).json({ error: 'Acceso denegado: Se requieren privilegios de administrador o supervisor' });
  }

  next();
};

// Middleware para endpoints de tickets (más permisivo)
export const protectTickets = (req, res, next) => {
  const allowedRoles = ['admin', 'supervisor', 'soporte', 'sucursal'];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    secureLogger.logSecurity('UNAUTHORIZED_TICKETS_ACCESS', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    return res.status(403).json({ error: 'Acceso denegado: Usuario no autorizado' });
  }

  next();
};

// Middleware para validar IP en endpoints críticos
export const validateTrustedIP = (req, res, next) => {
  const trustedIPs = [
    '127.0.0.1',
    '::1',
    'localhost'
  ];

  // En producción, agregar IPs específicas de la oficina
  if (process.env.NODE_ENV === 'production') {
    const prodTrustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];
    trustedIPs.push(...prodTrustedIPs);
  }

  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!trustedIPs.includes(clientIP) && !clientIP.includes('127.0.0.1')) {
    secureLogger.logSecurity('UNTRUSTED_IP_ACCESS', {
      ip: clientIP,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
    
    // En desarrollo, solo log. En producción, bloquear
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Acceso denegado: IP no autorizada' });
    }
  }

  next();
};

// Middleware combinado para máxima protección
export const maximumProtection = [
  criticalApiLimiter,
  validateOrigin,
  detectAttackPatterns,
  validateTrustedIP,
  protectAdminEndpoints
];

export default {
  protectAdminEndpoints,
  protectUserManagement,
  protectReports,
  protectTickets,
  validateTrustedIP,
  maximumProtection
};
