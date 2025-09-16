import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Almacén en memoria para intentos fallidos por IP
const failedAttempts = new Map();
const blockedIPs = new Map();

// Configuración
const MAX_ATTEMPTS = process.env.NODE_ENV === 'development' ? 50 : 5;
const BLOCK_DURATION = process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000; // 1 min dev, 15 min prod
const ATTEMPT_WINDOW = process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000; // 1 min dev, 15 min prod

// Limpiar intentos antiguos cada 5 minutos
setInterval(() => {
  const now = Date.now();
  
  // Limpiar intentos fallidos antiguos
  for (const [ip, data] of failedAttempts.entries()) {
    if (now - data.firstAttempt > ATTEMPT_WINDOW) {
      failedAttempts.delete(ip);
    }
  }
  
  // Limpiar IPs bloqueadas que ya expiraron
  for (const [ip, blockTime] of blockedIPs.entries()) {
    if (now - blockTime > BLOCK_DURATION) {
      blockedIPs.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Lista de IPs de desarrollo que deben ser excluidas del rate limiting
const developmentIPs = ['127.0.0.1', '::1', 'localhost'];

// Función para verificar si es una IP de desarrollo
const isDevelopmentIP = (ip) => {
  return process.env.NODE_ENV === 'development' && 
         developmentIPs.some(devIP => ip.includes(devIP) || ip === devIP);
};

// Middleware principal de protección contra fuerza bruta
export const bruteForceProtection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Saltar protección para IPs de desarrollo
  if (isDevelopmentIP(ip)) {
    console.log(`🔓 Saltando rate limiting para IP de desarrollo: ${ip}`);
    return next();
  }
  
  // Verificar si la IP está bloqueada
  if (blockedIPs.has(ip)) {
    const blockTime = blockedIPs.get(ip);
    const timeRemaining = Math.ceil((BLOCK_DURATION - (now - blockTime)) / 1000 / 60);
    
    console.log(`IP bloqueada intentando acceder: ${ip}. Tiempo restante: ${timeRemaining} minutos`);
    
    return res.status(429).json({
      error: 'Demasiados intentos fallidos. Inténtalo de nuevo más tarde.',
      timeRemaining: timeRemaining,
      retryAfter: Math.ceil((BLOCK_DURATION - (now - blockTime)) / 1000)
    });
  }
  
  next();
};

// Función para registrar un intento fallido
export const recordFailedAttempt = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Saltar registro para IPs de desarrollo
  if (isDevelopmentIP(ip)) {
    console.log(`🔓 Saltando registro de intento fallido para IP de desarrollo: ${ip}`);
    return;
  }
  
  if (!failedAttempts.has(ip)) {
    failedAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });
  } else {
    const attempts = failedAttempts.get(ip);
    
    // Si han pasado más de 15 minutos desde el primer intento, reiniciar contador
    if (now - attempts.firstAttempt > ATTEMPT_WINDOW) {
      failedAttempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
      
      // Si se alcanzó el límite, bloquear la IP
      if (attempts.count >= MAX_ATTEMPTS) {
        blockedIPs.set(ip, now);
        failedAttempts.delete(ip);
        
        console.log(`IP bloqueada por ${MAX_ATTEMPTS} intentos fallidos: ${ip}`);
      }
    }
  }
  
  const currentAttempts = failedAttempts.get(ip);
  if (currentAttempts) {
    console.log(`Intento fallido ${currentAttempts.count}/${MAX_ATTEMPTS} para IP: ${ip}`);
  }
};

// Función para limpiar intentos fallidos tras login exitoso
export const clearFailedAttempts = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Limpiar para todas las IPs, incluyendo desarrollo
  if (failedAttempts.has(ip)) {
    failedAttempts.delete(ip);
    console.log(`Intentos fallidos limpiados para IP: ${ip}`);
  }
  
  if (blockedIPs.has(ip)) {
    blockedIPs.delete(ip);
    console.log(`IP desbloqueada tras login exitoso: ${ip}`);
  }
};

// Rate limiter general para login (más permisivo que el bloqueo por intentos fallidos)
export const loginRateLimit = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
  max: process.env.NODE_ENV === 'development' ? 1000 : 20, // 1000 dev, 20 prod
  message: {
    error: 'Demasiadas solicitudes de login. Inténtalo de nuevo más tarde.',
    retryAfter: process.env.NODE_ENV === 'development' ? 60 : 15 * 60 // 1 min dev, 15 min prod
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar IP real considerando Railway proxy
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Ralentización progresiva para login
export const loginSlowDown = slowDown({
  windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
  delayAfter: process.env.NODE_ENV === 'development' ? 100 : 5, // 100 dev, 5 prod
  delayMs: process.env.NODE_ENV === 'development' ? () => 0 : () => 500, // No delay dev, 500ms prod
  maxDelayMs: process.env.NODE_ENV === 'development' ? 0 : 10000, // No delay dev, 10s prod
  validate: { delayMs: false }, // Disable warning
  // Usar IP real considerando Railway proxy
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Función para obtener estadísticas (útil para monitoreo)
export const getBruteForceStats = () => {
  return {
    failedAttempts: failedAttempts.size,
    blockedIPs: blockedIPs.size,
    maxAttempts: MAX_ATTEMPTS,
    blockDuration: BLOCK_DURATION / 1000 / 60, // en minutos
    attemptWindow: ATTEMPT_WINDOW / 1000 / 60 // en minutos
  };
};

// Función para limpiar todos los bloqueos (solo para desarrollo/admin)
export const clearAllBlocks = () => {
  const clearedAttempts = failedAttempts.size;
  const clearedBlocks = blockedIPs.size;
  
  failedAttempts.clear();
  blockedIPs.clear();
  
  console.log(`🧹 Limpiados ${clearedAttempts} intentos fallidos y ${clearedBlocks} IPs bloqueadas`);
  
  return {
    clearedAttempts,
    clearedBlocks
  };
};

// Limpiar bloqueos al iniciar en desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('🔓 Modo desarrollo: Limpiando todos los bloqueos existentes...');
  clearAllBlocks();
}
