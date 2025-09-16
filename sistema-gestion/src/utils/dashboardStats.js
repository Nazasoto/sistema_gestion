import TicketService from '../services/ticket.service';
import api from '../services/api.service';

/**
 * Función para obtener estadísticas del dashboard de soporte
 * @param {number} userId - ID del usuario de soporte
 * @returns {Promise<Object>} Estadísticas del dashboard
 */
export const getDashboardStats = async (userId, fechaSeleccionada = null) => {
  try {
    // Configurar zona horaria Argentina y rangos de fecha
    const timeZone = 'America/Argentina/Buenos_Aires';
    
    // Crear rango de fechas para el día seleccionado
    let fechaInicio, fechaFin;
    
    if (fechaSeleccionada) {
      // Usar la fecha seleccionada directamente como string para comparación
      fechaInicio = fechaSeleccionada + 'T00:00:00';
      fechaFin = fechaSeleccionada + 'T23:59:59';
    } else {
      // Para hoy, usar fecha actual
      const hoy = new Date().toISOString().split('T')[0];
      fechaInicio = hoy + 'T00:00:00';
      fechaFin = hoy + 'T23:59:59';
    }

    // Función helper para filtrar tickets por fecha seleccionada
    const filtrarTicketsPorFecha = (tickets, campoFecha = 'fechaActualizacion') => {
      // console.log(`🔍 Filtrando por fecha seleccionada: ${fechaSeleccionada}`);
      // console.log(`🔍 Rango de filtrado: ${fechaInicio} - ${fechaFin}`);
      
      const ticketsFiltrados = tickets?.filter(ticket => {
        const fechaTicketStr = ticket[campoFecha];
        if (!fechaTicketStr) return false;
        
        // Extraer solo la parte de fecha (YYYY-MM-DD) del timestamp
        const fechaTicketSolo = fechaTicketStr.split('T')[0];
        const fechaSeleccionadaSolo = fechaSeleccionada || new Date().toISOString().split('T')[0];
        
        const coincide = fechaTicketSolo === fechaSeleccionadaSolo;
        
        if (tickets.length <= 10) { // Mostrar detalles para debug
          // console.log(`🎫 Ticket ID ${ticket.id}: ${fechaTicketStr} -> fecha: ${fechaTicketSolo} vs ${fechaSeleccionadaSolo} -> ${coincide ? 'INCLUIDO' : 'EXCLUIDO'}`);
        }
        
        return coincide;
      }) || [];
      
      // console.log(`📊 Tickets filtrados: ${ticketsFiltrados.length} de ${tickets?.length || 0}`);
      return ticketsFiltrados;
    };

    // Obtener TODOS los tickets del usuario (sin filtro de fecha inicial)
    const todosTicketsUsuario = await TicketService.getAllTickets({
      ...(userId && { usuarioId: userId })
    });

    // Para tickets pendientes, obtener TODOS los del sistema usando el mismo endpoint que la bandeja
    const todosLosTicketsDelSistema = await api.get('/tickets/todos', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }).then(response => response.data || []).catch(error => {
      console.error('Error obteniendo tickets del sistema:', error);
      return [];
    });
    

    // Filtrar tickets del usuario por fecha seleccionada según su estado
    // TICKETS PENDIENTES: Mostrar TODOS los pendientes del sistema (no solo del usuario)
    const ticketsPendientesFecha = todosLosTicketsDelSistema.filter(t => ['nuevo', 'pendiente'].includes(t.estado));
    
    // Verificar si hay tickets con estado 'nuevo' específicamente
    const ticketsNuevos = todosLosTicketsDelSistema.filter(t => t.estado === 'nuevo');
    const ticketsPendientes = todosLosTicketsDelSistema.filter(t => t.estado === 'pendiente');

    const ticketsEnProgresoFecha = filtrarTicketsPorFecha(
      todosTicketsUsuario.filter(t => t.estado === 'en_progreso'),
      'fechaActualizacion'
    );

    const ticketsResueltosFecha = filtrarTicketsPorFecha(
      todosTicketsUsuario.filter(t => ['resuelto', 'cerrado'].includes(t.estado)),
      'fechaActualizacion'
    );

    const ticketsCanceladosFecha = filtrarTicketsPorFecha(
      todosTicketsUsuario.filter(t => t.estado === 'cancelado'),
      'fechaActualizacion'
    );

    // Obtener todos los tickets para análisis de categorías (filtrados por fecha seleccionada)
    const todosLosTickets = await TicketService.getAllTickets({});
    const todosLosTicketsFecha = filtrarTicketsPorFecha(todosLosTickets, 'fechaCreacion');
    

    // Obtener tickets resueltos del usuario específico para calcular SU tiempo promedio
    const ticketsResueltosUsuario = await TicketService.getAllTickets({
      estado: ['resuelto', 'cerrado'],
      ...(userId && { usuarioId: userId })
    });
    

    // Calcular estadísticas por categoría dinámicamente (solo tickets de la fecha seleccionada)
    const categoryStats = calculateCategoryStats(todosLosTicketsFecha);

    // Calcular tiempo promedio de resolución específico del usuario (solo tickets resueltos en la fecha)
    const tiempoPromedio = calculateAverageResolutionTime(ticketsResueltosFecha);

    const result = {
      ticketsNuevos: ticketsNuevos?.length || 0,
      ticketsPendientes: ticketsPendientesFecha?.length || 0,
      ticketsEnProgreso: ticketsEnProgresoFecha?.length || 0,
      ticketsResueltosHoy: ticketsResueltosFecha?.length || 0,
      ticketsCancelados: ticketsCanceladosFecha?.length || 0,
      tiempoPromedioResolucion: tiempoPromedio,
      totalTickets: todosLosTicketsFecha?.length || 0,
      eficiencia: calculateEfficiency(ticketsResueltosFecha?.length || 0, ticketsEnProgresoFecha?.length || 0),
      categorias: categoryStats
    };


    return result;
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return {
      ticketsNuevos: 0,
      ticketsPendientes: 0,
      ticketsEnProgreso: 0,
      ticketsResueltosHoy: 0,
      ticketsCancelados: 0,
      tiempoPromedioResolucion: '0 min',
      totalTickets: 0,
      eficiencia: 0,
      categorias: []
    };
  }
};

/**
 * Calcula el tiempo promedio de resolución de tickets
 * @param {Array} tickets - Array de tickets resueltos
 * @returns {string} Tiempo promedio formateado
 */
const calculateAverageResolutionTime = (tickets) => {
  
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
    return '0m';
  }

  let totalTime = 0;
  let validTickets = 0;

  tickets.forEach((ticket, index) => {
    // Usar exactamente los mismos campos que en el historial
    const fechaCreacion = ticket.fechaCreacion;
    const fechaCierre = ticket.fechaActualizacion;
    
    if (!fechaCreacion || !fechaCierre) {
      return;
    }
    
    try {
      const start = new Date(fechaCreacion);
      const end = new Date(fechaCierre);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return;
      }
      
      const diffTime = Math.abs(end - start);
      
      if (diffTime >= 0) {
        totalTime += diffTime;
        validTickets++;
      }
    } catch (error) {
      console.error('Error calculando tiempo de resolución:', error);
    }
  });


  if (validTickets === 0) {
    return '0m';
  }

  const averageTime = totalTime / validTickets;
  
  // Formatear usando la misma lógica que el historial
  const days = Math.floor(averageTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((averageTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((averageTime % (1000 * 60 * 60)) / (1000 * 60));
  
  const result = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  
  return result;
};

/**
 * Calcula la eficiencia basada en tickets resueltos vs en progreso
 * @param {number} resueltos - Número de tickets resueltos
 * @param {number} enProgreso - Número de tickets en progreso
 * @returns {number} Porcentaje de eficiencia
 */
const calculateEfficiency = (resueltos, enProgreso) => {
  const total = resueltos + enProgreso;
  if (total === 0) return 100;
  return Math.round((resueltos / total) * 100);
};

/**
 * Calcula estadísticas por categoría de tickets
 * @param {Array} tickets - Array de tickets
 * @returns {Array} Array de estadísticas por categoría
 */
const calculateCategoryStats = (tickets) => {
  if (!tickets || !Array.isArray(tickets)) return [];

  // Mapeo de categorías con sus nombres legibles y emojis
  const categoryMap = {
    'ajuste': { name: '💰 Ajuste', emoji: '💰' },
    'error_cuota': { name: '📊 Error de cuota', emoji: '📊' },
    'error_imputacion': { name: '📝 Error de imputación', emoji: '📝' },
    'diferencia_caja': { name: '💵 Diferencia de caja', emoji: '💵' },
    'reversiones_entrega_cancelacion': { name: '🔄 Reversiones entrega/cancelación', emoji: '🔄' },
    'reintegro': { name: '💸 Reintegro', emoji: '💸' },
    'no_puedo_entrar_sistema': { name: '🔒 Error al entrar a un programa o sistema', emoji: '🔒' },
    'otros': { name: '❓ Otro problema', emoji: '❓' },
    'general': { name: '📋 General', emoji: '📋' }
  };

  // Contar tickets por categoría
  const categoryCounts = {};
  const total = tickets.length;

  tickets.forEach(ticket => {
    const categoria = ticket.categoria || 'general';
    categoryCounts[categoria] = (categoryCounts[categoria] || 0) + 1;
  });

  // Convertir a array y calcular porcentajes
  const categoryStats = Object.entries(categoryCounts)
    .map(([key, count]) => ({
      categoria: key,
      nombre: categoryMap[key]?.name || `${categoryMap[key]?.emoji || '📋'} ${key}`,
      emoji: categoryMap[key]?.emoji || '📋',
      cantidad: count,
      porcentaje: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente

  return categoryStats;
};

/**
 * Formatea las estadísticas para mostrar en el dashboard
 * @param {Object} stats - Estadísticas obtenidas
 * @returns {Array} Array de objetos con estadísticas formateadas
 */
export const formatStatsForDisplay = (stats) => {
  return [
    {
      title: 'Tickets Pendientes',
      value: stats.ticketsPendientes,
      color: '#f39c12',
      description: 'Tickets nuevos esperando atención'
    },
    {
      title: 'Tickets Nuevos',
      value: stats.ticketsNuevos,
      color: '#E0CB07',
      description: 'Tickets nuevos esperando atención'
    }
    ,
    {
      title: 'En Progreso',
      value: stats.ticketsEnProgreso,
      color: '#3498db',
      description: 'Tickets que estás trabajando'
    },
    {
      title: 'Resueltos Hoy',
      value: stats.ticketsResueltosHoy,
      color: '#27ae60',
      description: 'Tickets completados hoy'
    },
    {
      title: 'Cancelados',
      value: stats.ticketsCancelados || 0,
      color: '#e74c3c',
      description: 'Tickets cancelados'
    }
  ];
};
