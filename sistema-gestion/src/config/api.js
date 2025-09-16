// Configuración base de la API
// Usamos la variable de entorno para conectar con Railway
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/me'
  },
  USERS: {
    BASE: '/api/users',
    PROFILE: '/api/users/profile'
  },
  TICKET: {
    BASE: '/api/tickets',
    STATUS: (id) => `/api/tickets/${id}/estado`,
    ASSIGN: (id) => `/api/tickets/${id}/asignar`,
    STATS: '/api/tickets/estadisticas',
    USER_TICKETS: (userId) => `/api/tickets?usuarioId=${userId}`,
    REPORT: (id) => `/api/reportes/ticket/${id}/historial`
  },
  AJUSTES: {
    BASE: '/api/ajustes'
  }
};

export const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
