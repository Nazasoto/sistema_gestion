import api from './api.service';
import { secureLog, sanitizeUserData, isTokenExpired } from '../config/security.config';

const login = async (username, password) => {
  try {    
    // Asegurémonos de que los datos se envíen correctamente
    // El backend espera 'usuario' no 'email'
    const requestData = { usuario: username, password };

    const response = await api.post('/auth/login', requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Evitar que los datos se muestren en la consola
      validateStatus: () => true
    }).catch(error => {
      return {
        status: error.response ? error.response.status : 500,
        data: error.response ? error.response.data : {}
      };
    });
    
    
    // Verificar la respuesta exitosa (200-299)
    if (response.status >= 200 && response.status < 300 && response.data) {
      // El backend envía: { token, user: {...} }
      const { token, user } = response.data;
      const userData = user;
      
      
      // Asegurarse de que tenemos los campos necesarios
      const userId = userData?.id || userData?.id_usuario || userData?._id;
      if (!userId) {
        secureLog('error', 'Usuario sin ID válido');
        throw new Error('Datos de usuario incompletos. Falta el ID del usuario.');
      }
      
      // Normalizar y sanitizar la estructura del usuario
      const rawUserData = {
        id: userId,
        email: userData.email || userData.mail || username,
        nombre: userData.nombre || userData.name || 'Usuario',
        role: (userData.role || 'usuario').toLowerCase(),
        sucursal: userData.sucursal || null
      };
      
      const normalizedUser = sanitizeUserData(rawUserData);
      normalizedUser.token = token;
      
      secureLog('info', 'Usuario autenticado', { role: normalizedUser.role });
      
      
      // Guardar usuario (sin token por seguridad)
      const userDataToStore = { ...normalizedUser };
      delete userDataToStore.token; // No almacenar token en localStorage
      sessionStorage.setItem('user', JSON.stringify(userDataToStore));
      
      // Almacenar token por separado con expiración
      if (normalizedUser.token) {
        sessionStorage.setItem('authToken', normalizedUser.token);
        sessionStorage.setItem('tokenTimestamp', Date.now().toString());
      }
      
      // Configurar el token en los headers de las peticiones futuras
      if (normalizedUser.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${normalizedUser.token}`;
      }
      
      return normalizedUser;
    }
    
    // Si llegamos aquí, hubo un error
    const errorMessage = response.data?.error || response.data?.message || `Error ${response.status}: ${response.statusText || 'Error de autenticación'}`;
    throw new Error(errorMessage);
  } catch (error) {
    let errorMessage = 'Error al iniciar sesión';
    
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    } else {
      // Algo pasó en la configuración de la petición que generó un error
      errorMessage = error.message || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
};

const logout = () => {
  // Limpiar todos los datos de sesión
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('tokenTimestamp');
  
  // Limpiar header de autorización
  delete api.defaults.headers.common['Authorization'];
  
  secureLog('info', 'Usuario desconectado');
};

const getCurrentUser = () => {
  try {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
      return null;
    }
    
    // Verificar expiración del token solo para usuarios que no sean soporte
    const tokenTimestamp = sessionStorage.getItem('tokenTimestamp');
    if (tokenTimestamp && user.role !== 'soporte' && isTokenExpired(parseInt(tokenTimestamp))) {
      secureLog('warn', 'Token expirado, cerrando sesión');
      logout();
      return null;
    }
    
    // Asegurarse de que el usuario tenga un ID válido
    if (!user.id && !user._id) {
      secureLog('error', 'Usuario sin ID válido');
      return null;
    }
    
    // Normalizar el ID a 'id' para consistencia
    if (user._id && !user.id) {
      user.id = user._id;
    }
    
    // Recuperar y configurar token desde sessionStorage
    const token = sessionStorage.getItem('authToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      user.token = token; // Agregar token temporalmente para compatibilidad
    }
    
    return user;
  } catch (error) {
    secureLog('error', 'Error al obtener usuario actual', error.message);
    return null;
  }
};

const isAuthenticated = () => {
  return !!getCurrentUser();
};

const hasRole = (role) => {
  const user = getCurrentUser();
  return user && user.role === role;
};

export default {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasRole
};
