import api from './api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const activityService = {
  // Enviar heartbeat al servidor
  sendHeartbeat: async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      // console.log('💓 Enviando heartbeat a:', `${API_URL}/api/users/heartbeat`);
      const response = await fetch(`${API_URL}/api/users/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // console.log('💓 Heartbeat enviado correctamente');
      } else {
        console.error('❌ Error en heartbeat:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error enviando heartbeat:', error);
    }
  },

  // Limpiar actividad al hacer logout
  clearActivity: async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        // console.log('⚠️ No hay token para limpiar actividad');
        return;
      }

      // console.log('🚪 Enviando petición de logout a:', `${API_URL}/api/users/logout-activity`);
      const response = await fetch(`${API_URL}/api/users/logout-activity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        // console.log('🚪 Actividad limpiada al hacer logout:', result);
      } else {
        console.error('❌ Error limpiando actividad:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error limpiando actividad:', error);
    }
  },

  // Iniciar heartbeat cada 2 minutos
  startHeartbeat: () => {
    // console.log('🚀 Iniciando heartbeat cada 2 minutos');
    return setInterval(() => {
      activityService.sendHeartbeat();
    }, 2 * 60 * 1000); // 2 minutos
  },

  // Detener heartbeat
  stopHeartbeat: (intervalId) => {
    if (intervalId) {
      // console.log('🛑 Deteniendo heartbeat');
      clearInterval(intervalId);
    }
  }
};

export default activityService;
