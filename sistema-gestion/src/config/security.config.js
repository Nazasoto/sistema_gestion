// Configuración de seguridad para el frontend
const SecurityConfig = {
  // Solo mostrar logs detallados en desarrollo
  isDevelopment: typeof process !== 'undefined' ? (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') : true,
  
  // Configuración de tokens
  tokenStorage: {
    // Usar sessionStorage en lugar de localStorage para mayor seguridad
    // sessionStorage se limpia al cerrar la pestaña
    useSessionStorage: true, // Siempre usar sessionStorage por seguridad
    
    // Tiempo de expiración del token deshabilitado (sesión permanente hasta logout manual)
    tokenExpiration: null // Sin expiración automática
  },
  
  // Configuración de logging
  logging: {
    // Solo logs críticos en producción
    enableConsoleLogging: typeof process !== 'undefined' ? (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') : true,
    enableErrorReporting: true
  },
  
  // Headers de seguridad
  securityHeaders: {
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  }
};

// Función para logging seguro
export const secureLog = (level, message, data = null) => {
  if (!SecurityConfig.logging.enableConsoleLogging) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  switch (level) {
    case 'error':
      break;
    case 'warn':
      break;
    case 'info':
      break;
    default:
      
  }
};

// Función para sanitizar datos antes de almacenar
export const sanitizeUserData = (userData) => {
  // Solo mantener campos esenciales
  return {
    id: userData.id,
    email: userData.email,
    nombre: userData.nombre,
    role: userData.role,
    sucursal: userData.sucursal || null,
    // No almacenar información sensible adicional
    loginTime: Date.now()
  };
};

// Función para verificar si el token ha expirado
export const isTokenExpired = (loginTime) => {
  // Si no hay tokenExpiration configurado, nunca expira
  if (!SecurityConfig.tokenStorage.tokenExpiration) return false;
  
  if (!loginTime) return true;
  
  const now = Date.now();
  const elapsed = now - loginTime;
  
  return elapsed > SecurityConfig.tokenStorage.tokenExpiration;
};

export default SecurityConfig;
