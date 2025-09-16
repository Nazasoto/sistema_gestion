import { API_BASE_URL } from '../config/api';

class ReportService {
  /**
   * Obtiene el reporte completo de tickets con filtros
   * @param {Object} filtros - Filtros para el reporte
   * @returns {Promise<Object>} - Reporte de tickets
   */
  async obtenerReporte(filtros = {}) {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const token = user.token;
      
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }
      
      const queryParams = new URLSearchParams();
      
      // Agregar filtros a los parámetros de consulta
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== '') {
          if (Array.isArray(filtros[key])) {
            filtros[key].forEach(value => {
              queryParams.append(`${key}[]`, value);
            });
          } else {
            queryParams.append(key, filtros[key]);
          }
        }
      });
      
      const url = `${API_BASE_URL}/reportes${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('Llamando a URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido - redirigir al login
          sessionStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        if (response.status === 404) {
          throw new Error('Endpoint de reportes no encontrado. Verifica la configuración del servidor.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al obtener reporte:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial detallado de un ticket específico
   * @param {number} ticketId - ID del ticket
   * @returns {Promise<Object>} - Historial del ticket
   */
  async obtenerHistorialTicket(ticketId) {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const token = user.token;
      
      const response = await fetch(`${API_BASE_URL}/reportes/ticket/${ticketId}/historial`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al obtener historial del ticket:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas de tiempo para un ticket
   * @param {Object} ticket - Datos del ticket
   * @returns {Object} - Métricas calculadas
   */
  calcularMetricas(ticket) {
    const fechaCreacion = new Date(ticket.fecha_creacion);
    const fechaTomado = ticket.fecha_tomado ? new Date(ticket.fecha_tomado) : null;
    const fechaResuelto = ticket.fecha_resuelto ? new Date(ticket.fecha_resuelto) : null;
    
    const metricas = {
      tiempoEspera: null,
      tiempoResolucion: null,
      tiempoTotal: null
    };
    
    // Tiempo de espera (desde creación hasta que se toma)
    if (fechaTomado) {
      metricas.tiempoEspera = this.calcularDiferenciaTiempo(fechaCreacion, fechaTomado);
    }
    
    // Tiempo de resolución (desde que se toma hasta que se resuelve)
    if (fechaTomado && fechaResuelto) {
      metricas.tiempoResolucion = this.calcularDiferenciaTiempo(fechaTomado, fechaResuelto);
    }
    
    // Tiempo total (desde creación hasta resolución)
    if (fechaResuelto) {
      metricas.tiempoTotal = this.calcularDiferenciaTiempo(fechaCreacion, fechaResuelto);
    }
    
    return metricas;
  }

  /**
   * Calcula la diferencia de tiempo entre dos fechas
   * @param {Date} fechaInicio - Fecha de inicio
   * @param {Date} fechaFin - Fecha de fin
   * @returns {Object} - Diferencia en días, horas y minutos
   */
  calcularDiferenciaTiempo(fechaInicio, fechaFin) {
    const diferencia = fechaFin - fechaInicio;
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);
    
    return {
      total: diferencia,
      dias: dias,
      horas: horas,
      minutos: minutos % 60,
      texto: this.formatearTiempo(dias, horas % 24, minutos % 60)
    };
  }

  /**
   * Formatea el tiempo en texto legible
   * @param {number} dias - Días
   * @param {number} horas - Horas
   * @param {number} minutos - Minutos
   * @returns {string} - Tiempo formateado
   */
  formatearTiempo(dias, horas, minutos) {
    const partes = [];
    
    if (dias > 0) {
      partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
    }
    
    if (horas > 0) {
      partes.push(`${horas} hora${horas !== 1 ? 's' : ''}`);
    }
    
    if (minutos > 0 || partes.length === 0) {
      partes.push(`${minutos} minuto${minutos !== 1 ? 's' : ''}`);
    }
    
    return partes.join(', ');
  }

  /**
   * Obtiene estadísticas detalladas por empleado y sucursal
   * @param {Object} filtros - Filtros para las estadísticas
   * @returns {Promise<Object>} - Estadísticas por empleado
   */
  async obtenerEstadisticasEmpleados(filtros = {}) {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const token = user.token;
      const queryParams = new URLSearchParams();
      
      // Agregar filtros a los parámetros de consulta
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== '') {
          queryParams.append(key, filtros[key]);
        }
      });
      
      const url = `${API_BASE_URL}/reportes/empleados${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al obtener estadísticas de empleados:', error);
      throw error;
    }
  }

  /**
   * Exporta el reporte a CSV
   * @param {Array} tickets - Lista de tickets
   * @param {string} nombreArchivo - Nombre del archivo
   */
  exportarCSV(tickets, nombreArchivo = 'reporte_tickets.csv') {
    const headers = [
      'ID',
      'Título',
      'Estado',
      'Prioridad',
      'Categoría',
      'Fecha Creación',
      'Usuario Creador',
      'Usuario Asignado',
      'Fecha Tomado',
      'Fecha Resuelto',
      'Tiempo Espera',
      'Tiempo Resolución',
      'Tiempo Total',
      'Comentario Tomado',
      'Comentario Resuelto'
    ];
    
    const filas = tickets.map(ticket => {
      const metricas = this.calcularMetricas(ticket);
      return [
        ticket.id,
        `"${ticket.titulo.replace(/"/g, '""')}"`,
        ticket.estado,
        ticket.prioridad,
        ticket.categoria || '',
        ticket.fecha_creacion,
        ticket.nombre_creador || '',
        ticket.nombre_asignado || '',
        ticket.fecha_tomado || '',
        ticket.fecha_resuelto || '',
        metricas.tiempoEspera?.texto || '',
        metricas.tiempoResolucion?.texto || '',
        metricas.tiempoTotal?.texto || '',
        `"${(ticket.comentario_tomado || '').replace(/"/g, '""')}"`,
        `"${(ticket.comentario_resuelto || '').replace(/"/g, '""')}"`
      ];
    });
    
    const csvContent = [headers.join(','), ...filas.map(fila => fila.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta estadísticas de empleados a CSV
   * @param {Array} empleados - Lista de empleados con estadísticas
   * @param {string} nombreArchivo - Nombre del archivo
   */
  exportarEstadisticasCSV(empleados, nombreArchivo = 'estadisticas_empleados.csv') {
    const headers = [
      'ID Usuario',
      'Nombre',
      'Email',
      'Sucursal',
      'Total Tickets',
      'Tickets Nuevos',
      'Tickets En Progreso',
      'Tickets Resueltos',
      'Tickets Cerrados',
      'Tickets Cancelados',
      'Tiempo Promedio Resolución (horas)',
      'Primer Ticket',
      'Último Ticket'
    ];
    
    const filas = empleados.map(emp => [
      emp.id_usuario,
      `"${emp.nombre.replace(/"/g, '""')}"`,
      `"${emp.mail.replace(/"/g, '""')}"`,
      `"${(emp.sucursal || '').replace(/"/g, '""')}"`,
      emp.total_tickets,
      emp.tickets_nuevos,
      emp.tickets_en_progreso,
      emp.tickets_resueltos,
      emp.tickets_cerrados,
      emp.tickets_cancelados,
      emp.tiempo_promedio_resolucion_horas || '',
      emp.primer_ticket || '',
      emp.ultimo_ticket || ''
    ]);
    
    const csvContent = [headers.join(','), ...filas.map(fila => fila.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default new ReportService();
