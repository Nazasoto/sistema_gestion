import api from './api.service';
import { API_ENDPOINTS } from '../config/api';

// Función para extraer datos de la respuesta
const extractData = (response) => {
  if (!response || !response.data) {
    console.error('Respuesta inválida del servidor:', response);
    return null;
  }
  
  // Si la respuesta es un array, devolverlo directamente
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  // Si es un objeto con datos, devolver los datos
  return response.data.data || response.data;
};

const TicketService = {
  // Obtener todos los tickets del usuario autenticado
  async getAllTickets(filters = {}) {
    try {
      const response = await api.get(API_ENDPOINTS.TICKET.BASE, { 
        params: {
          ...filters,
          _t: Date.now() // Evitar caché
        },
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = extractData(response);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener los tickets:', error);
      if (error.response?.status === 401) {
        // Si no está autenticado, redirigir al login
        window.location.href = '/login';
        return [];
      }
      this.handleApiError(error);
      return [];
    }
  },

  // Obtener un ticket por ID
  async getTicketById(id) {
    try {
      const response = await api.get(`${API_ENDPOINTS.TICKET.BASE}/${id}`);
      return extractData(response);
    } catch (error) {
      console.error(`Error al obtener el ticket con ID ${id}:`, error);
      this.handleApiError(error);
      throw error;
    }
  },

  // Crear un nuevo ticket
  async createTicket(ticketData) {
    try {
      const response = await api.post(API_ENDPOINTS.TICKET.BASE, ticketData);
      return extractData(response);
    } catch (error) {
      console.error('Error al crear el ticket:', error);
      this.handleApiError(error);
      throw error;
    }
  },

  // Actualizar un ticket existente
  async updateTicket(id, ticketData) {
    try {
      const response = await api.put(`${API_ENDPOINTS.TICKET.BASE}/${id}`, ticketData);
      return extractData(response);
    } catch (error) {
      console.error(`Error al actualizar el ticket con ID ${id}:`, error);
      this.handleApiError(error);
      throw error;
    }
  },

  // Eliminar un ticket
  async deleteTicket(id) {
    try {
      const response = await api.delete(`${API_ENDPOINTS.TICKET.BASE}/${id}`);
      return extractData(response);
    } catch (error) {
      console.error(`Error al eliminar el ticket con ID ${id}:`, error);
      this.handleApiError(error);
      throw error;
    }
  },

  // Cambiar el estado de un ticket
  async updateTicketStatus(id, status, comentario = null) {
    try {
      const payload = { estado: status };
      if (comentario) {
        payload.comentario = comentario;
      }
      const response = await api.patch(API_ENDPOINTS.TICKET.STATUS(id), payload);
      return extractData(response);
    } catch (error) {
      console.error(`Error al actualizar el estado del ticket ${id}:`, error);
      this.handleApiError(error);
      throw error;
    }
  },
  
  // Asignar un ticket a un usuario
  async assignTicket(ticketId, userId) {
    try {
      const response = await api.post(API_ENDPOINTS.TICKET.ASSIGN(ticketId), { tecnicoId: userId });
      return extractData(response);
    } catch (error) {
      console.error(`Error al asignar el ticket ${ticketId} al usuario ${userId}:`, error);
      this.handleApiError(error);
      throw error;
    }
  },
  
  // Obtener estadísticas de tickets
  async getTicketStats(userId) {
    try {
      const response = await api.get(API_ENDPOINTS.TICKET.STATS);
      return extractData(response);
    } catch (error) {
      console.error('Error al obtener estadísticas de tickets:', error);
      this.handleApiError(error);
      throw error;
    }
  },
  
  // Manejador de errores de API
  handleApiError(error) {
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      console.error('Error en la respuesta del servidor:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Podemos manejar diferentes códigos de estado aquí si es necesario
      if (error.response.status === 401) {
        // No autorizado - quizás redirigir al login
        console.error('No autorizado - Por favor inicia sesión nuevamente');
      }
    }
    // Lanzar el error original si no se manejó específicamente
    throw error;
  },

  // Enviar informe a supervisor
  async enviarInformeASupervisor(ticketId, informeData) {
    try {
      const response = await api.post(`${API_ENDPOINTS.TICKET.BASE}/${ticketId}/enviar-informe-supervisor`, {
        informe: informeData
      });
      return extractData(response);
    } catch (error) {
      console.error('Error al enviar informe a supervisor:', error);
      this.handleApiError(error);
    }
  },

  // Obtener tickets por usuario (método alternativo usando el endpoint de filtros)
  async getTicketsByUser(userId, filters = {}) {
    try {
      
      // Usamos el endpoint de tickets con el parámetro de usuarioId
      const response = await api.get(API_ENDPOINTS.TICKET.USER_TICKETS(userId), {
        params: {
          ...filters,
          _t: Date.now() // Evitar caché
        },
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = extractData(response);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error al obtener los tickets del usuario ${userId}:`, error);
      this.handleApiError(error);
      return [];
    }
  },

  // Obtener el historial/reporte de un ticket específico
  async getTicketReport(ticketId) {
    try {
      const response = await api.get(API_ENDPOINTS.TICKET.REPORT(ticketId), {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      return extractData(response);
    } catch (error) {
      console.error(`Error al obtener el reporte del ticket ${ticketId}:`, error);
      this.handleApiError(error);
      throw error;
    }
  },

  // Verificar si el usuario tiene tickets en progreso
  async checkActiveTickets(userId) {
    try {
      const response = await api.get(`${API_ENDPOINTS.TICKET.BASE}/user/${userId}/active`);
      return extractData(response);
    } catch (error) {
      console.error('Error al verificar tickets activos:', error);
      this.handleApiError(error);
      throw error;
    }
  },

  // Reasignar un ticket a otro usuario
  async reassignTicket(ticketId, nuevoUsuarioId, comentario = '') {
    try {
      
      const response = await api.post(`${API_ENDPOINTS.TICKET.BASE}/${ticketId}/reasignar`, {
        nuevoUsuarioId,
        comentario
      });
      return extractData(response);
    } catch (error) {
      console.error(`Error al reasignar el ticket ${ticketId}:`, error);
      this.handleApiError(error);
      throw error;
    }
  }
};

export default TicketService;
