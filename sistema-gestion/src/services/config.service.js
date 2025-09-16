import api from './api.service';

class ConfigService {
  // Obtener perfil del usuario actual
  async getProfile() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener el perfil');
    }
  }

  // Actualizar perfil del usuario
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al actualizar el perfil');
    }
  }

  // Cambiar contraseña
  async changePassword(passwordData) {
    try {
      const response = await api.put('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al cambiar la contraseña');
    }
  }

  // Guardar preferencias de notificaciones (localStorage por ahora)
  async saveNotificationPreferences(preferences) {
    try {
      sessionStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      return { success: true };
    } catch (error) {
      throw new Error('Error al guardar las preferencias de notificación');
    }
  }

  // Obtener preferencias de notificaciones
  async getNotificationPreferences() {
    try {
      const preferences = sessionStorage.getItem('notificationPreferences');
      return preferences ? JSON.parse(preferences) : {
        email: true,
        push: true
      };
    } catch (error) {
      return {
        email: true,
        push: true
      };
    }
  }

  // Guardar tema (localStorage por ahora)
  async saveTheme(theme) {
    try {
      sessionStorage.setItem('userTheme', theme);
      return { success: true };
    } catch (error) {
      throw new Error('Error al guardar el tema');
    }
  }

  // Obtener tema
  async getTheme() {
    try {
      return sessionStorage.getItem('userTheme') || 'claro';
    } catch (error) {
      return 'claro';
    }
  }
}

export default new ConfigService();
