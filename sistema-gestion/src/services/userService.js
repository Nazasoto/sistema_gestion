import api from './api.service';

const userService = {
  // Obtener todos los usuarios
  getAllUsers: async () => {
    try {
      const response = await api.get('/usuarios');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  },

  // Obtener usuarios por rol
  getUsersByRole: async (role) => {
    try {
      const response = await api.get(`/usuarios?role=${role}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuarios por rol:', error);
      throw error;
    }
  },

  // Obtener usuario por ID
  getUserById: async (id) => {
    try {
      const response = await api.get(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  },

  // Obtener usuarios de soporte
  getSupportUsers: async () => {
    try {
      const response = await api.get('/usuarios?role=soporte');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuarios de soporte:', error);
      throw error;
    }
  },

  // Obtener supervisores
  getSupervisors: async () => {
    try {
      const response = await api.get('/usuarios?role=supervisor');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo supervisores:', error);
      throw error;
    }
  },

  // Crear usuario de soporte
  createSupportUser: async (userData) => {
    try {
      const response = await api.post('/auth/create-support-user', userData);
      return response.data;
    } catch (error) {
      console.error('Error creando usuario de soporte:', error);
      throw error;
    }
  },

  // Obtener usuarios conectados/activos
  getActiveUsers: async (role = null) => {
    try {
      const url = role ? `/auth/active-users?role=${role}` : '/auth/active-users';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuarios activos:', error);
      throw error;
    }
  }
};

export default userService;
