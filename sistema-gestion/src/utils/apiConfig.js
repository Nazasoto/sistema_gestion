/**
 * Configuración centralizada de la API
 * Maneja las URLs del backend según el entorno
 */

export const getApiUrl = () => {
  // Prioridad: Variable de entorno > URL de producción > URL de desarrollo
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  
  if (import.meta.env.PROD) {
    return 'https://soporte-backend-production.up.railway.app/api';
  }
  
  return 'http://localhost:3001/api';
};

export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (import.meta.env.PROD) {
    return 'https://soporte-backend-production.up.railway.app';
  }
  
  return 'http://localhost:3001';
};

// Helper para hacer peticiones con configuración consistente
export const fetchWithConfig = async (endpoint, options = {}) => {
  const url = `${getApiUrl()}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Agregar token de autenticación si existe
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('token');
  if (token && !defaultOptions.headers.Authorization) {
    defaultOptions.headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, defaultOptions);
};

export default {
  getApiUrl,
  getBaseUrl,
  fetchWithConfig
};
