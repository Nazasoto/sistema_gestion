import api from './api.service';

const bitacoraService = {
  // Obtener eventos de la bitácora con filtros
  getEventos: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.severidad) params.append('severidad', filtros.severidad);
      if (filtros.sucursal) params.append('sucursal', filtros.sucursal);
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      
      const response = await api.get(`/bitacora?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo eventos de bitácora:', error);
      throw error;
    }
  },

  // Registrar un nuevo evento en la bitácora
  registrarEvento: async (evento) => {
    try {
      const response = await api.post('/bitacora', evento);
      return response.data;
    } catch (error) {
      console.error('Error registrando evento en bitácora:', error);
      throw error;
    }
  },

  // Obtener estadísticas de eventos
  getEstadisticas: async (periodo = '7d') => {
    try {
      const response = await api.get(`/bitacora/estadisticas?periodo=${periodo}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas de bitácora:', error);
      throw error;
    }
  },

  // Limpiar todos los eventos de la bitácora
  limpiarBitacora: async () => {
    try {
      const response = await api.delete('/bitacora/limpiar');
      return response.data;
    } catch (error) {
      console.error('Error limpiando bitácora:', error);
      throw error;
    }
  }
};

export default bitacoraService;
