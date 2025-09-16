import { 
  crearTicket as repoCrearTicket,
  obtenerTicketPorId as repoObtenerTicketPorId,
  obtenerTicketsPorUsuario,
  actualizarTicket as repoActualizarTicket,
  eliminarTicket as repoEliminarTicket,
  obtenerEstadisticasTickets as repoObtenerEstadisticasTickets
} from '../repositories/ticketRepository.js';
import { query } from '../config/database.js';
import userService from './user.service.js';
import moment from 'moment-timezone';

/**
 * Mapea un ticket de la base de datos al formato de la API
 * @param {Object} ticket - Ticket de la base de datos
 * @returns {Object} - Ticket en formato de API
 */
function mapDbTicketToApi(ticket) {
  if (!ticket) return null;
  
  // Debug: Log raw ticket data from database
  // console.log('=== MAPEO TICKET DEBUG ===');
  // console.log('Ticket ID:', ticket.id);
  // console.log('usuario_creador_id:', ticket.usuario_creador_id);
  // console.log('usuario_asignado_id:', ticket.usuario_asignado_id);
  // console.log('nombre_creador:', ticket.nombre_creador);
  // console.log('nombre_asignado:', ticket.nombre_asignado);
  // console.log('Raw ticket data:', JSON.stringify(ticket, null, 2));
  // console.log('=== FIN DEBUG ===');
  
  // Determinar la sucursal a mostrar (prioridad: ticket.sucursal > creador.sucursal > asignado.sucursal)
  const sucursal = ticket.sucursal || ticket.sucursal_creador || ticket.sucursal_asignado || null;
  
  // Parsear archivos_adjuntos si existe, o devolver un array vacío
  let archivosAdjuntos = [];
  try {
    if (ticket.archivos_adjuntos) {
      archivosAdjuntos = typeof ticket.archivos_adjuntos === 'string' 
        ? JSON.parse(ticket.archivos_adjuntos)
        : ticket.archivos_adjuntos;
    }
  } catch (error) {
    console.error('Error al parsear archivos_adjuntos:', error);
    archivosAdjuntos = [];
  }

  return {
    id: ticket.id,
    titulo: ticket.titulo,
    descripcion: ticket.descripcion,
    estado: ticket.estado,
    prioridad: ticket.prioridad,
    urgencia: ticket.prioridad, // Para compatibilidad con el frontend
    categoria: ticket.categoria,
    sucursal: sucursal,
    usuarioId: ticket.usuario_creador_id,
    asignadoA: ticket.usuario_asignado_id,
    fechaCreacion: ticket.fecha_creacion,
    fechaActualizacion: ticket.fecha_actualizacion || ticket.fecha_creacion,
    archivos_adjuntos: archivosAdjuntos,
    // Campos adicionales de las relaciones
    creador: ticket.nombre_creador ? {
      id: ticket.usuario_creador_id,
      nombre: ticket.nombre_creador,
      apellido: ticket.apellido_creador,
      email: ticket.email_creador,
      sucursal: ticket.sucursal_creador || null
    } : null,
    asignado: ticket.nombre_asignado ? {
      id: ticket.usuario_asignado_id,
      nombre: ticket.nombre_asignado,
      apellido: ticket.apellido_asignado,
      email: ticket.email_asignado,
      sucursal: ticket.sucursal_asignado || null
    } : null,
    // Campos directos para compatibilidad con el frontend
    nombre_creador: ticket.nombre_creador,
    apellido_creador: ticket.apellido_creador,
    email_creador: ticket.email_creador,
    sucursal_creador: ticket.sucursal_creador,
    numero_sucursal_creador: ticket.numero_sucursal_creador,
    nombre_sucursal_creador: ticket.nombre_sucursal_creador,
    localidad_sucursal_creador: ticket.localidad_sucursal_creador,
    provincia_sucursal_creador: ticket.provincia_sucursal_creador,
    nombre_asignado: ticket.nombre_asignado,
    apellido_asignado: ticket.apellido_asignado,
    email_asignado: ticket.email_asignado,
    sucursal_asignado: ticket.sucursal_asignado
  };
}

class TicketService {
  /**
   * Obtiene todos los tickets de un usuario con filtros opcionales
   * @param {Object} filters - Filtros de búsqueda
   * @param {number} filters.usuarioId - ID del usuario autenticado (requerido)
   * @param {string} [filters.estado] - Estado del ticket
   * @param {string} [filters.prioridad] - Prioridad del ticket
   * @param {string} [filters.categoria] - Categoría del ticket
   * @returns {Promise<Array>} - Lista de tickets
   */
  async getAll(filters = {}) {
    try {
      // console.log('TicketService.getAll - Iniciando con filtros:', JSON.stringify(filters, null, 2));
      
      if (!filters.usuarioId) {
        const error = new Error('Se requiere el ID del usuario para obtener los tickets');
        error.status = 400;
        error.code = 'MISSING_USER_ID';
        throw error;
      }
      
      // Validar que el usuarioId es un número
      const usuarioId = parseInt(filters.usuarioId, 10);
      if (isNaN(usuarioId)) {
        const error = new Error('El ID del usuario no es válido');
        error.status = 400;
        error.code = 'INVALID_USER_ID';
        throw error;
      }
      
      // Preparar filtros para la consulta
      const filtrosConsulta = {};
      if (filters.estado) filtrosConsulta.estado = filters.estado;
      if (filters.prioridad) filtrosConsulta.prioridad = filters.prioridad;
      if (filters.categoria) filtrosConsulta.categoria = filters.categoria;
      
      // console.log('Obteniendo tickets del repositorio con usuarioId:', usuarioId, 'y filtros:', filtrosConsulta);
      
      // Obtener los tickets del repositorio
      const tickets = await obtenerTicketsPorUsuario(usuarioId, filtrosConsulta);
      
      if (!Array.isArray(tickets)) {
        console.error('Error: La respuesta de obtenerTicketsPorUsuario no es un array:', tickets);
        throw new Error('Error inesperado al obtener los tickets');
      }
      
      // console.log(`Se encontraron ${tickets.length} tickets`);
      
      try {
        // Mapear los tickets al formato de la API
        const ticketsMapeados = tickets.map(mapDbTicketToApi);
        return ticketsMapeados;
      } catch (mapeoError) {
        console.error('Error al mapear los tickets:', mapeoError);
        // Si hay un error en el mapeo, devolver los tickets sin mapear para diagnóstico
        return tickets;
      }
    } catch (error) {
      console.error('Error en TicketService.getAll:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status,
        filters: filters
      });
      
      // Mejorar el mensaje de error para el cliente
      if (!error.status) {
        error.status = 500;
      }
      
      if (!error.code) {
        error.code = 'TICKET_FETCH_ERROR';
      }
      
      throw error;
    }
  }

  /**
   * Obtiene un ticket por su ID
   * @param {number} id - ID del ticket
   * @param {number} [usuarioId] - ID del usuario autenticado (opcional para administradores)
   * @returns {Promise<Object>} - El ticket encontrado
   */
  async getById(id, usuarioId = null) {
    try {
      const ticket = await repoObtenerTicketPorId(id, usuarioId);
      return mapDbTicketToApi(ticket);
    } catch (error) {
      console.error(`Error al obtener el ticket ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea un nuevo ticket
   * @param {Object} ticketData - Datos del ticket
   * @param {number} usuarioId - ID del usuario que crea el ticket
   * @returns {Promise<Object>} - El ticket creado
   */
  async create(ticketData, usuarioId) {
    try {
      if (!usuarioId) {
        throw new Error('Se requiere el ID del usuario para crear un ticket');
      }
      
      // Obtener información del usuario creador para obtener su sucursal
      let sucursal = null;
      try {
        const creador = await userService.getById(usuarioId);
        if (creador) {
          sucursal = creador.sucursal;
        } else {
          console.warn(`Usuario con ID ${usuarioId} no encontrado, se creará el ticket sin sucursal`);
        }
      } catch (error) {
        console.error('Error al obtener información del usuario creador:', error);
        // Continuar sin sucursal si hay un error
      }
      
      const ticketCreado = await repoCrearTicket({
        titulo: ticketData.titulo,
        descripcion: ticketData.descripcion,
        estado: ticketData.estado || 'nuevo', // Los tickets van directamente a soporte
        prioridad: ticketData.prioridad || 'media',
        categoria: ticketData.categoria,
        usuarioAsignadoId: ticketData.asignadoA || null,
        archivos_adjuntos: ticketData.archivos_adjuntos || []
      }, usuarioId);
      
      return mapDbTicketToApi(ticketCreado);
    } catch (error) {
      console.error('Error al crear el ticket:', error);
      throw error;
    }
  }

  /**
   * Actualiza un ticket existente
   * @param {number} id - ID del ticket a actualizar
   * @param {Object} updates - Campos a actualizar
   * @param {number} usuarioId - ID del usuario que realiza la actualización
   * @param {string} [comentario] - Comentario del cambio de estado
   * @returns {Promise<Object>} - El ticket actualizado
   */
  async update(id, updates, usuarioId, comentario = null) {
    try {
      if (!usuarioId) {
        throw new Error('Se requiere el ID del usuario para actualizar un ticket');
      }
      
      // Preparar los campos a actualizar
      const camposActualizacion = {
        titulo: updates.titulo,
        descripcion: updates.descripcion,
        estado: updates.estado,
        prioridad: updates.prioridad,
        categoria: updates.categoria,
        usuarioAsignadoId: updates.asignadoA || updates.usuarioAsignadoId
      };
      
      // Si se está cambiando el estado a "en_progreso" y no hay usuario asignado explícito,
      // asignar automáticamente al usuario que está tomando el ticket
      if (updates.estado === 'en_progreso' && !updates.asignadoA && !updates.usuarioAsignadoId) {
        camposActualizacion.usuarioAsignadoId = usuarioId;
      }
      
      // Si se está actualizando el usuario asignado, actualizamos también la sucursal
      if (updates.asignadoA) {
        const userService = new UserService();
        const usuarioAsignado = await userService.getById(updates.asignadoA);
        if (usuarioAsignado?.sucursal) {
          camposActualizacion.sucursal = usuarioAsignado.sucursal;
        }
      }
      
      // Si se está actualizando explícitamente la sucursal
      if (updates.sucursal !== undefined) {
        camposActualizacion.sucursal = updates.sucursal;
      }
      
      const ticketActualizado = await repoActualizarTicket(id, camposActualizacion, usuarioId, comentario);
      
      return mapDbTicketToApi(ticketActualizado);
    } catch (error) {
      console.error(`Error al actualizar el ticket ${id}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un ticket
   * @param {number} id - ID del ticket a eliminar
   * @param {number} usuarioId - ID del usuario que realiza la eliminación
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  async delete(id, usuarioId) {
    try {
      if (!usuarioId) {
        throw new Error('Se requiere el ID del usuario para eliminar un ticket');
      }
      
      await repoEliminarTicket(id, usuarioId);
      return true;
    } catch (error) {
      console.error(`Error al eliminar el ticket ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cambia el estado de un ticket
   * @param {number} id - ID del ticket
   * @param {string} newStatus - Nuevo estado
   * @param {number} usuarioId - ID del usuario que realiza el cambio
   * @returns {Promise<Object>} - El ticket actualizado
   */
  /**
   * Cambia el estado de un ticket
  async changeStatus(id, newStatus, usuarioId) {
    try {
      const validStatuses = ['abierto', 'en_progreso', 'en_revision', 'cerrado', 'cancelado'];
      if (!validStatuses.includes(newStatus)) {
        throw { status: 400, message: 'Estado no válido' };
      }
      
      const ticketActualizado = await repoActualizarTicket(id, { estado: newStatus }, usuarioId);
      return mapDbTicketToApi(ticketActualizado);
    } catch (error) {
      console.error(`Error al cambiar el estado del ticket ${id}:`, error);
      throw error;
    }
  }

  /**
   * Asigna un ticket a un usuario
   * @param {number} ticketId - ID del ticket
   * @param {number} userId - ID del usuario al que se asigna el ticket
   * @param {number} usuarioId - ID del usuario que realiza la asignación
   * @returns {Promise<Object>} - El ticket actualizado
   */
  async assignTo(ticketId, userId, usuarioId) {
    try {
      if (!userId) {
        throw { status: 400, message: 'Se requiere el ID del usuario asignado' };
      }
      
      // Primero obtenemos el ticket actual para verificar permisos
      const ticketActual = await this.getById(ticketId, usuarioId);
      
      // Si el ticket ya está cerrado o cancelado, no se puede reasignar
      if (['cerrado', 'cancelado'].includes(ticketActual.estado)) {
        throw { status: 400, message: 'No se puede reasignar un ticket cerrado o cancelado' };
      }
      
      // Actualizamos el ticket con el nuevo asignado
      // console.log(`🔧 ASSIGN DEBUG - Asignando ticket ${ticketId} al usuario ${userId}`);
      // console.log(`🔧 ASSIGN DEBUG - Estado actual del ticket: ${ticketActual.estado}`);
      
      const ticketActualizado = await repoActualizarTicket(
        ticketId, 
        { 
          usuarioAsignadoId: userId,
          // Si el ticket está nuevo/abierto, lo movemos a 'en_progreso' al asignarlo
          estado: ['nuevo', 'abierto'].includes(ticketActual.estado) ? 'en_progreso' : ticketActual.estado
        }, 
        usuarioId
      );
      
      // console.log(`🔧 ASSIGN DEBUG - Ticket actualizado:`, ticketActualizado);
      
      return mapDbTicketToApi(ticketActualizado);
    } catch (error) {
      console.error(`Error al asignar el ticket ${ticketId}:`, error);
      throw error;
    }
  }
  
  /**
   * Obtiene estadísticas de tickets para un usuario
   * @param {number} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Estadísticas de los tickets
   */
  async getStats(usuarioId) {
    try {
      if (!usuarioId) {
        throw { status: 400, message: 'Se requiere el ID del usuario para obtener las estadísticas' };
      }
      
      const estadisticas = await repoObtenerEstadisticasTickets(usuarioId);
      
      // Asegurarse de que siempre se devuelvan los campos esperados
      return {
        total: estadisticas.total || 0,
        nuevos: estadisticas.nuevos || 0,
        enEspera: estadisticas.en_espera || 0,
        enProgreso: estadisticas.en_progreso || 0,
        resueltos: estadisticas.resueltos || 0,
        cerrados: estadisticas.cerrados || 0,
        cancelados: estadisticas.cancelados || 0,
        errores: estadisticas.errores || 0,
        porPrioridad: {
          baja: estadisticas.prioridad_baja || 0,
          media: estadisticas.prioridad_media || 0,
          alta: estadisticas.prioridad_alta || 0,
          urgente: estadisticas.prioridad_urgente || 0
        },
        porCategoria: estadisticas.por_categoria || {}
      };
    } catch (error) {
      console.error('Error al obtener las estadísticas de tickets:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los tickets sin filtrar por usuario (solo para soporte)
   * @returns {Promise<Array>} Lista de todos los tickets
   */
  async getAllTickets() {
    try {
      // console.log('Obteniendo todos los tickets (servicio)');
      
      // Consulta SQL para obtener todos los tickets con información de usuarios y sucursales
      // Usando COLLATE para resolver conflictos de collation entre tablas
      const sql = `
        SELECT 
          t.id,
          t.titulo,
          t.descripcion,
          t.estado,
          t.prioridad,
          t.categoria,
          t.fecha_creacion,
          t.fecha_actualizacion,
          t.fecha_cierre,
          t.archivos_adjuntos,
          t.comentarios,
          t.usuario_creador_id,
          t.usuario_asignado_id,
          t.usuario_reasignado,
          t.fecha_reasignacion,
          uc.nombre as nombre_creador,
          uc.apellido as apellido_creador,
          uc.mail as email_creador,
          uc.sucursal as sucursal_creador,
          sc.nro_sucursal as numero_sucursal_creador,
          sc.nombre as nombre_sucursal_creador,
          sc.localidad as localidad_sucursal_creador,
          sc.provincia as provincia_sucursal_creador,
          ua.nombre as nombre_asignado,
          ua.apellido as apellido_asignado,
          ua.mail as email_asignado,
          ua.sucursal as sucursal_asignado,
          ur.nombre as nombre_reasignado,
          ur.apellido as apellido_reasignado,
          ur.mail as email_reasignado
        FROM tickets t
        LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id_usuario
        LEFT JOIN sucursales sc ON uc.sucursal COLLATE utf8mb4_unicode_ci = sc.nro_sucursal COLLATE utf8mb4_unicode_ci
        LEFT JOIN usuarios ua ON t.usuario_asignado_id = ua.id_usuario
        LEFT JOIN usuarios ur ON t.usuario_reasignado = ur.id_usuario
        ORDER BY t.fecha_creacion DESC
      `;
      
      // console.log('Ejecutando consulta SQL...');
      // console.log('Consulta SQL:', sql);
      const result = await query(sql);
      
      // console.log('Resultado de la consulta:', {
      //   esArray: Array.isArray(result),
      //   longitud: result ? result.length : 0,
      //   primerosElementos: Array.isArray(result) ? result.slice(0, 2) : result
      // });
      
      if (!result) {
        console.error('Error: La consulta no devolvió ningún resultado');
        return [];
      }
      
      if (!Array.isArray(result)) {
        console.error('Error: El resultado no es un array:', result);
        return [];
      }
      
      // console.log(`Se encontraron ${result.length} tickets`);
      
      if (result.length > 0) {
        // console.log('Primer ticket recibido:', JSON.stringify(result[0], null, 2));
      }
      
      // Mapear los resultados al formato de la API
      const ticketsMapeados = result.map(ticket => {
        const ticketMapeado = {
          id: ticket.id,
          titulo: ticket.titulo || 'Sin título',
          descripcion: ticket.descripcion || '',
          estado: ticket.estado?.toLowerCase() || 'abierto',
          prioridad: ticket.prioridad?.toLowerCase() || 'media',
          categoria: ticket.categoria || 'general',
          sucursal: ticket.sucursal || ticket.sucursal_asignado || ticket.sucursal_creador || null,
          fechaCreacion: ticket.fecha_creacion || new Date().toISOString(),
          fechaActualizacion: ticket.fecha_actualizacion || ticket.fecha_creacion || new Date().toISOString(),
          // Campos directos para compatibilidad con frontend
          usuario_creador_id: ticket.usuario_creador_id,
          usuario_asignado_id: ticket.usuario_asignado_id,
          usuario_reasignado: ticket.usuario_reasignado,
          fecha_reasignacion: ticket.fecha_reasignacion,
          usuario: null,
          asignadoA: null
        };

        // Agregar información del usuario creador si existe
        if (ticket.usuario_creador_id) {
          ticketMapeado.usuario = {
            id: ticket.usuario_creador_id,
            nombre: ticket.nombre_creador || 'Usuario desconocido',
            email: ticket.email_creador || '',
            sucursal: ticket.sucursal_creador || ''
          };
        }

        // Debug: verificar usuario_asignado_id
        // console.log(`🔍 Ticket ${ticket.id}: usuario_asignado_id = ${ticket.usuario_asignado_id}`);
        // console.log(`🔍 Ticket ${ticket.id}: nombre_asignado = ${ticket.nombre_asignado}`);
        // console.log(`🔍 Ticket ${ticket.id}: asignadoA inicial = ${ticketMapeado.asignadoA}`);

        // Agregar información del usuario asignado si existe
        if (ticket.usuario_asignado_id) {
          ticketMapeado.asignadoA = {
            id: ticket.usuario_asignado_id,
            nombre: ticket.nombre_asignado || 'Sin asignar',
            email: ticket.email_asignado || '',
            sucursal: ticket.sucursal_asignado || ''
          };
          // console.log(`🔍 Ticket ${ticket.id}: asignadoA actualizado =`, ticketMapeado.asignadoA);
        } else {
          // console.log(`🔍 Ticket ${ticket.id}: NO tiene usuario_asignado_id, asignadoA queda como:`, ticketMapeado.asignadoA);
        }

        // Agregar información del usuario reasignado si existe
        if (ticket.usuario_reasignado) {
          ticketMapeado.reasignadoA = {
            id: ticket.usuario_reasignado,
            nombre: ticket.nombre_reasignado || 'Usuario reasignado',
            email: ticket.email_reasignado || '',
            apellido: ticket.apellido_reasignado || ''
          };
          // console.log(`🔍 Ticket ${ticket.id}: reasignadoA =`, ticketMapeado.reasignadoA);
        }

        return ticketMapeado;
      });
      
      // console.log('Tickets mapeados correctamente');
      return ticketsMapeados;
    } catch (error) {
      console.error('Error en getAllTickets:', error);
      throw error;
    }
  }

  /**
   * Obtiene tickets pendientes de aprobación
   * @returns {Promise<Array>} Lista de tickets pendientes
   */
  async getTicketsPendientesAprobacion() {
    try {
      // console.log('Obteniendo tickets pendientes de aprobación');
      
      // Primero verificar qué estados existen en la base de datos
      const estadosQuery = `
        SELECT DISTINCT estado, COUNT(*) as cantidad 
        FROM tickets 
        GROUP BY estado 
        ORDER BY cantidad DESC
      `;
      
      // console.log('Verificando estados existentes en la base de datos...');
      const estadosResult = await query(estadosQuery, []);
      // console.log('Estados encontrados:', estadosResult);
      
      // Primero intentar una consulta simple sin JOIN para verificar si los tickets existen
      const simpleQuery = `
        SELECT COUNT(*) as total, estado 
        FROM tickets 
        WHERE estado = 'pendiente_aprobacion'
        GROUP BY estado
      `;
      
      // console.log('Verificando tickets con consulta simple...');
      const simpleResult = await query(simpleQuery, []);
      // console.log('Resultado consulta simple:', simpleResult);
      
      // Usar una consulta optimizada con JOIN (sin t.sucursal que no existe)
      const ticketsQuery = `
        SELECT 
          t.id,
          t.titulo,
          t.descripcion,
          t.estado,
          t.prioridad,
          t.categoria,
          t.fecha_creacion,
          t.fecha_actualizacion,
          t.usuario_creador_id,
          t.usuario_asignado_id,
          COALESCE(u.nombre, 'Usuario no encontrado') as nombre_creador,
          COALESCE(u.mail, '') as email_creador,
          COALESCE(u.sucursal, 'Sin sucursal') as sucursal_creador
        FROM tickets t
        LEFT JOIN usuarios u ON t.usuario_creador_id = u.id_usuario
        WHERE t.estado = 'pendiente_aprobacion'
        ORDER BY t.fecha_creacion ASC
      `;
      
      // console.log('Ejecutando consulta para tickets pendientes...');
      // console.log('Query SQL:', ticketsQuery);
      const result = await query(ticketsQuery, []); // Pasar array vacío explícitamente
      // console.log(`Encontrados ${result.length} tickets pendientes`);
      
      if (result.length === 0) {
        // console.log('No se encontraron tickets pendientes de aprobación');
        return [];
      }
      
      // Mapear los resultados al formato de la API
      const mappedTickets = result.map(ticket => {
        const mapped = mapDbTicketToApi(ticket);
        // Asegurar que la información del creador esté disponible
        mapped.creador = {
          id: ticket.usuario_creador_id,
          nombre: ticket.nombre_creador || 'Usuario desconocido',
          email: ticket.email_creador || '',
          sucursal: ticket.sucursal_creador || ticket.sucursal || 'Sin sucursal'
        };
        return mapped;
      });
      
      // console.log('Tickets mapeados correctamente:', mappedTickets.length);
      return mappedTickets;
      
    } catch (error) {
      console.error('Error en getTicketsPendientesAprobacion:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState
      });
      // En caso de error, retornar array vacío para evitar crashes en el frontend
      console.error('Retornando array vacío debido al error');
      return [];
    }
  }

  /**
   * Obtiene un usuario de soporte disponible para asignar tickets
   * @returns {Promise<Object|null>} Usuario de soporte o null si no hay disponible
   */
  async obtenerUsuarioSoporte() {
    try {
      const soporteQuery = `
        SELECT id_usuario as id, nombre, mail, role 
        FROM usuarios 
        WHERE role = 'soporte' 
        LIMIT 1
      `;
      const [usuarios] = await query(soporteQuery, []);
      return usuarios.length > 0 ? usuarios[0] : null;
    } catch (error) {
      console.error('Error al obtener usuario de soporte:', error);
      return null;
    }
  }

  /**
   * Aprueba un ticket
   * @param {number} ticketId - ID del ticket
   * @param {number} supervisorId - ID del supervisor
   * @param {string} comentario - Comentario opcional
   * @returns {Promise<Object>} Resultado de la aprobación
   */
  async aprobarTicket(ticketId, supervisorId, comentario = null) {
    try {
      // console.log(`Aprobando ticket ${ticketId} por supervisor ${supervisorId}`);
      
      // Verificar que el ticket existe y está pendiente (sin filtros de usuario para supervisores)
      const ticket = await repoObtenerTicketPorId(ticketId);
      // console.log('Ticket obtenido:', ticket);
      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }
      
      if (ticket.estado !== 'pendiente_aprobacion') {
        // console.log(`Ticket ${ticketId} tiene estado '${ticket.estado}', se requiere 'pendiente_aprobacion'`);
        throw new Error(`El ticket no está pendiente de aprobación. Estado actual: ${ticket.estado}`);
      }
      
      // Actualizar el ticket a estado nuevo y asignar a soporte
      const usuarioSoporte = await this.obtenerUsuarioSoporte();
      // console.log('Usuario de soporte asignado:', usuarioSoporte);
      
      const ticketActualizado = await repoActualizarTicket(
        ticketId, 
        { 
          estado: 'nuevo',
          supervisor_id: supervisorId,
          usuarioAsignadoId: usuarioSoporte ? usuarioSoporte.id : null
        }, 
        supervisorId
      );
      
      // console.log(`Ticket ${ticketId} aprobado: estado cambiado a 'nuevo', asignado a soporte ID ${usuarioSoporte?.id}`);
      
      // Registrar la aprobación en el historial con timezone de Argentina
      const fechaDecisionArgentina = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');
      const aprobacionSql = `
        INSERT INTO ticket_approvals 
        (ticket_id, supervisor_id, accion, motivo, fecha_decision) 
        VALUES (?, ?, 'aprobado', ?, ?)
      `;
      
      const aprobacionResult = await query(aprobacionSql, [
        ticketId, 
        supervisorId, 
        comentario || 'Ticket aprobado',
        fechaDecisionArgentina
      ]);
      
      return {
        ticket: mapDbTicketToApi(ticketActualizado),
        aprobacion: {
          id: aprobacionResult.insertId,
          accion: 'aprobado',
          motivo: comentario || 'Ticket aprobado',
          fecha_decision: fechaDecisionArgentina
        }
      };
    } catch (error) {
      console.error('Error en aprobarTicket:', error);
      throw error;
    }
  }

  /**
   * Rechaza un ticket con notificación automática
   * @param {number} ticketId - ID del ticket
   * @param {number} supervisorId - ID del supervisor
   * @param {string} motivo - Motivo del rechazo
   * @param {boolean} notificarSucursal - Si enviar notificación
   * @returns {Promise<Object>} Resultado del rechazo
   */
  async rechazarTicket(ticketId, supervisorId, motivo, notificarSucursal = true) {
    try {
      // console.log(`Rechazando ticket ${ticketId} por supervisor ${supervisorId}`);
      
      // Verificar que el ticket existe y está pendiente
      const ticket = await this.getById(ticketId);
      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }
      
      if (ticket.estado !== 'pendiente_aprobacion') {
        throw new Error('El ticket no está pendiente de aprobación');
      }
      
      // Actualizar el ticket a estado rechazado
      const ticketActualizado = await repoActualizarTicket(
        ticketId, 
        { 
          estado: 'rechazado',
          supervisor_id: supervisorId
        }, 
        supervisorId
      );
      
      // Registrar el rechazo en el historial con timezone de Argentina
      const fechaDecisionArgentina = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');
      const rechazoSql = `
        INSERT INTO ticket_approvals 
        (ticket_id, supervisor_id, accion, motivo, fecha_decision, notificacion_enviada) 
        VALUES (?, ?, 'rechazado', ?, ?, ?)
      `;
      
      const rechazoResult = await query(rechazoSql, [
        ticketId, 
        supervisorId, 
        motivo,
        fechaDecisionArgentina,
        notificarSucursal
      ]);
      
      let notificacionEnviada = false;
      
      // Crear notificación automática si se solicita
      if (notificarSucursal && ticket.creador?.sucursal) {
        try {
          const noticiaSql = `
            INSERT INTO noticias 
            (titulo, description, estado, fecha_creacion, sucursal_destino, ticket_id, supervisor_id, tipo) 
            VALUES (?, ?, 'activa', NOW(), ?, ?, ?, 'ticket_rechazado')
          `;
          
          const tituloNoticia = `Ticket #${ticketId} Rechazado - ${ticket.titulo}`;
          const descripcionNoticia = `Su ticket ha sido rechazado por el supervisor.

Motivo: ${motivo}

Por favor, cree un nuevo ticket con la información completa.

Ticket original: #${ticketId}
Fecha de rechazo: ${new Date().toLocaleString('es-ES')}
Supervisor: ${supervisorId}`;
          
          await query(noticiaSql, [
            tituloNoticia,
            descripcionNoticia,
            ticket.creador.sucursal,
            ticketId,
            supervisorId
          ]);
          
          notificacionEnviada = true;
          // console.log(`Notificación enviada a sucursal ${ticket.creador.sucursal}`);
        } catch (notificacionError) {
          console.error('Error al crear notificación:', notificacionError);
          // No fallar el rechazo si falla la notificación
        }
      }
      
      return {
        ticket: mapDbTicketToApi(ticketActualizado),
        rechazo: {
          id: rechazoResult.insertId,
          accion: 'rechazado',
          motivo: motivo,
          fecha_decision: fechaDecisionArgentina
        },
        notificacion_enviada: notificacionEnviada
      };
    } catch (error) {
      console.error('Error en rechazarTicket:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de decisiones del supervisor
   * @param {number} supervisorId - ID del supervisor
   * @returns {Promise<Array>} Historial de decisiones
   */
  async getHistorialSupervisor(supervisorId) {
    try {
      // Primero verificar si la tabla existe
      const checkTable = `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ticket_approvals'
      `;
      
      const tableExists = await query(checkTable);
      if (tableExists[0].count === 0) {
        // console.log('Tabla ticket_approvals no existe, retornando array vacío');
        return [];
      }

      const sql = `
        SELECT 
          ta.*,
          t.titulo as ticket_titulo,
          t.descripcion as ticket_descripcion,
          t.prioridad as ticket_prioridad,
          uc.nombre as creador_nombre,
          uc.sucursal as creador_sucursal
        FROM ticket_approvals ta
        JOIN tickets t ON ta.ticket_id = t.id
        LEFT JOIN usuarios uc ON ta.supervisor_id = uc.id_usuario
        WHERE ta.supervisor_id = ?
        ORDER BY ta.fecha_decision DESC
      `;
      
      const result = await query(sql, [supervisorId]);
      return result || [];
    } catch (error) {
      console.error('Error en getHistorialSupervisor:', error);
      // Retornar array vacío en caso de error para evitar crash
      return [];
    }
  }

  /**
   * Obtiene estadísticas del supervisor
   * @param {number} supervisorId - ID del supervisor
   * @returns {Promise<Object>} Estadísticas
   */
  async getEstadisticasSupervisor(supervisorId) {
    try {
      // Primero verificar si la tabla existe
      const checkTable = `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ticket_approvals'
      `;
      
      const tableExists = await query(checkTable);
      if (tableExists[0].count === 0) {
        // console.log('Tabla ticket_approvals no existe, retornando estadísticas vacías');
        // Obtener solo tickets pendientes
        const pendientesQuery = `SELECT COUNT(*) as count FROM tickets WHERE estado = 'pendiente_aprobacion'`;
        const pendientesResult = await query(pendientesQuery);
        
        return {
          total_decisiones: 0,
          aprobados: 0,
          rechazados: 0,
          pendientes: pendientesResult[0]?.count || 0,
          tasa_aprobacion: 0
        };
      }

      const sql = `
        SELECT 
          COUNT(*) as total_decisiones,
          SUM(CASE WHEN accion = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
          SUM(CASE WHEN accion = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
          (SELECT COUNT(*) FROM tickets WHERE estado = 'pendiente_aprobacion') as pendientes
        FROM ticket_approvals 
        WHERE supervisor_id = ?
      `;
      
      const result = await query(sql, [supervisorId]);
      const stats = result[0] || {};
      
      return {
        total_decisiones: stats.total_decisiones || 0,
        aprobados: stats.aprobados || 0,
        rechazados: stats.rechazados || 0,
        pendientes: stats.pendientes || 0,
        tasa_aprobacion: stats.total_decisiones > 0 
          ? Math.round((stats.aprobados / stats.total_decisiones) * 100) 
          : 0
      };
    } catch (error) {
      console.error('Error en getEstadisticasSupervisor:', error);
      // Retornar estadísticas por defecto en caso de error
      return {
        total_decisiones: 0,
        aprobados: 0,
        rechazados: 0,
        pendientes: 0,
        tasa_aprobacion: 0
      };
    }
  }
  
}

export default new TicketService();
