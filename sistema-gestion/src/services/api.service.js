import axios from 'axios';

// Configuración de la API
// Usar variable de entorno o fallback según el entorno
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : (import.meta.env.PROD 
    ? 'https://soporte-backend-production.up.railway.app/api' 
    : 'http://localhost:3001/api');

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación a las peticiones
api.interceptors.request.use(
  (config) => {
    // Solo modificar la configuración si no tiene ya un header de autorización
    if (!config.headers.Authorization) {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // No registrar errores 401 en la consola para evitar ruido
    if (error.response?.status !== 401) {
      console.error('Error en la petición a la API:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    // Manejar errores de autenticación
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Solo limpiar datos si no estamos ya en la página de login
      if (!currentPath.includes('/login')) {
        console.log('Sesión expirada o no autenticado.');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        // Dejar que React Router maneje la navegación automáticamente
        // cuando detecte que no hay usuario autenticado
      }
    }
    
    // Proporcionar un mensaje de error más descriptivo
    let errorMessage = 'Error de conexión con el servidor';
    
    if (error.response) {
      // El servidor respondió con un estado fuera del rango 2xx
      errorMessage = error.response.data?.message || 
                    error.response.data?.error || 
                    `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    }
    
    const apiError = new Error(errorMessage);
    apiError.status = error.response?.status;
    apiError.response = error.response;
    
    return Promise.reject(apiError);
  }
);

export default api;
