import ticketService from '../services/ticket.service.js';
import * as ticketRepository from '../repositories/ticketRepository.js';

/**
 * Crea un nuevo ticket
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const crearTicket = async (req, res) => {
  try {
    // El ID del usuario autenticado está disponible en req.user.id
    const usuarioId = req.user.id;
    const ticketData = req.body;
    
    // Validar datos requeridos
    if (!ticketData.titulo) {
      return res.status(400).json({ error: 'El título del ticket es requerido' });
    }
    
    // Crear el ticket usando el servicio
    const nuevoTicket = await ticketService.create(ticketData, usuarioId);
    
    res.status(201).json({
      mensaje: 'Ticket creado exitosamente',
      ticket: nuevoTicket
    });
  } catch (error) {
    console.error('Error en crearTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al crear el ticket'
    });
  }
};

/**
 * Obtiene un ticket por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const usuarioId = req.user.id;
    
    // Obtener el ticket usando el servicio (verifica permisos internamente)
    const ticket = await ticketService.getById(ticketId, usuarioId);
    
    res.json(ticket);
  } catch (error) {
    console.error('Error en obtenerTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al obtener el ticket'
    });
  }
};

/**
 * Obtiene todos los tickets del usuario autenticado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerMisTickets = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('Error: No se pudo obtener el ID del usuario de la solicitud');
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'No se pudo autenticar al usuario'
      });
    }

    const usuarioId = req.user.id;
    // console.log(`Obteniendo tickets para el usuario ID: ${usuarioId}`);
    
    const { estado, prioridad, categoria } = req.query;
    // console.log('Parámetros de consulta:', { estado, prioridad, categoria });
    
    // Aplicar filtros si existen
    const filtros = {};
    if (estado) filtros.estado = estado;
    if (prioridad) filtros.prioridad = prioridad;
    if (categoria) filtros.categoria = categoria;
    
    try {
      // Obtener los tickets del usuario usando el servicio
      // console.log('Llamando a ticketService.getAll con:', { usuarioId, ...filtros });
      const tickets = await ticketService.getAll({
        usuarioId,
        ...filtros
      });
      
      // console.log(`Se encontraron ${tickets ? tickets.length : 0} tickets`);
      return res.json(tickets || []);
    } catch (serviceError) {
      console.error('Error en ticketService.getAll:', serviceError);
      throw serviceError; // Re-lanzar para ser manejado por el catch externo
    }
  } catch (error) {
    console.error('Error en obtenerMisTickets:', error);
    
    // Determinar el código de estado y mensaje de error apropiados
    let statusCode = 500;
    let errorMessage = 'Error al obtener los tickets';
    let errorDetails = {};
    
    if (error.status) {
      statusCode = error.status;
      errorMessage = error.message || errorMessage;
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorDetails = {
        message: error.message,
        stack: error.stack,
        ...(error.originalError && { originalError: error.originalError.message }),
        ...(error.query && { query: error.query }),
        ...(error.params && { params: error.params })
      };
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      ...(Object.keys(errorDetails).length > 0 && { detalles: errorDetails })
    });
  }
};

/**
 * Actualiza un ticket existente
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const actualizarTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const usuarioId = req.user.id;
    const datosActualizados = req.body;
    
    // Validar que hay datos para actualizar
    if (Object.keys(datosActualizados).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
    }
    
    // Actualizar el ticket usando el servicio
    const ticketActualizado = await ticketService.update(
      ticketId, 
      datosActualizados, 
      usuarioId
    );
    
    res.json({
      mensaje: 'Ticket actualizado exitosamente',
      ticket: ticketActualizado
    });
  } catch (error) {
    console.error('Error en actualizarTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al actualizar el ticket'
    });
  }
};

/**
 * Elimina un ticket
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const eliminarTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const usuarioId = req.user.id;
    
    // Eliminar el ticket usando el servicio (verifica permisos internamente)
    await ticketService.delete(ticketId, usuarioId);
    
    res.json({ mensaje: 'Ticket eliminado exitosamente' });
  } catch (error) {
    console.error('Error en eliminarTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al eliminar el ticket'
    });
  }
};

/**
 * Obtiene estadísticas de los tickets del usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerEstadisticas = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    
    // Obtener estadísticas usando el servicio
    const estadisticas = await ticketService.getStats(usuarioId);
    
    res.json(estadisticas);
  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas' });
  }
};

/**
 * Middleware para verificar si el usuario es el propietario del ticket
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * @param {Function} next - Función para continuar con el siguiente middleware
 */
export const esPropietarioOTienePermiso = async (req, res, next) => {
  try {
    const ticketId = parseInt(req.params.id);
    const usuarioId = req.user.id;
    
    // Verificar si el ticket existe y el usuario tiene acceso
    try {
      const ticket = await ticketService.getById(ticketId, usuarioId);
      
      // Si el usuario es el creador, está asignado al ticket, o tiene rol soporte/supervisor, permitir el acceso
      const esCreadorOAsignado = ticket.usuarioId === usuarioId || ticket.asignadoA === usuarioId;
      const esSoporteOSupervisor = req.user.role === 'soporte' || req.user.role === 'supervisor';
      
      if (esCreadorOAsignado || esSoporteOSupervisor) {
        req.ticket = ticket; // Adjuntar el ticket a la solicitud para usarlo en el controlador
        return next();
      }
      
      // Si llega aquí, el usuario no tiene permiso
      throw new Error('No tienes permiso para acceder a este ticket');
    } catch (error) {
      // Si hay un error (incluyendo acceso denegado), pasarlo al manejador de errores
      throw error;
    }
    
  } catch (error) {
    console.error('Error en esPropietarioOTienePermiso:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al verificar los permisos'
    });
  }
};

/**
 * Obtiene todos los tickets (para soporte, supervisores y admin)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerTodosLosTickets = async (req, res) => {
  try {
    // Verificar si el usuario tiene rol de soporte, supervisor o admin
    const userRole = req.user.role || req.user.rol; // Compatibilidad con ambas versiones
    if (userRole !== 'soporte' && userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No autorizado',
        mensaje: 'Solo el personal de soporte, supervisores y administradores pueden ver todos los tickets',
        userRole: userRole,
        user: req.user
      });
    }
    
    // console.log('Obteniendo todos los tickets (vista de soporte)');
    const tickets = await ticketService.getAllTickets();
    
    res.json(tickets || []);
  } catch (error) {
    console.error('Error en obtenerTodosLosTickets:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Error al obtener los tickets',
      detalles: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        user: req.user
      } : undefined
    });
  }
};

/**
 * Cambia el estado de un ticket
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const cambiarEstadoTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const usuarioId = req.user.id;
    const { estado, comentario } = req.body;
    
    if (!estado) {
      return res.status(400).json({ error: 'El nuevo estado es requerido' });
    }
    
    // Obtener el ticket actual para validar permisos
    const ticketActual = await ticketService.getById(ticketId, usuarioId);
    
    // Validar que solo el usuario asignado pueda cambiar el estado (excepto para tomar tickets)
    if (estado !== 'en_progreso' && ticketActual.usuario_asignado_id && ticketActual.usuario_asignado_id !== usuarioId) {
      return res.status(403).json({ 
        error: 'No tienes permiso para cambiar el estado de este ticket',
        mensaje: 'Solo el usuario asignado puede cambiar el estado del ticket'
      });
    }
    
    // Preparar datos de actualización
    const updateData = { estado };
    
    // Si el estado cambia a 'en_progreso', asignar automáticamente el ticket al usuario
    if (estado === 'en_progreso') {
      updateData.usuario_asignado_id = usuarioId;
      // console.log(`Asignando ticket ${ticketId} al usuario ${usuarioId} (estado: en_progreso)`);
    }
    
    const ticketActualizado = await ticketService.update(
      ticketId, 
      updateData, 
      usuarioId,
      comentario
    );
    
    res.json({
      mensaje: 'Estado del ticket actualizado exitosamente',
      ticket: ticketActualizado
    });
  } catch (error) {
    console.error('Error en cambiarEstadoTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al cambiar el estado del ticket'
    });
  }
};

/**
 * Asigna un ticket a un técnico
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const asignarTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { tecnicoId } = req.body;
    
    if (!tecnicoId) {
      return res.status(400).json({ error: 'El ID del técnico es requerido' });
    }
    
    // Debug: Verificar rol del usuario
    // console.log('🔍 DEBUG ASIGNAR TICKET:');
    // console.log('- Usuario ID:', req.user.id);
    // console.log('- Usuario role:', req.user.role);
    // console.log('- Ticket ID:', ticketId);
    // console.log('- Técnico ID:', tecnicoId);
    
    // Verificar permisos (soporte, supervisor y admin pueden asignar tickets)
    if (!['soporte', 'supervisor', 'admin'].includes(req.user.role)) {
      // console.log('❌ PERMISO DENEGADO - Rol no autorizado:', req.user.role);
      return res.status(403).json({ error: 'No tienes permiso para asignar tickets' });
    }
    
    // console.log('✅ PERMISO CONCEDIDO - Rol autorizado:', req.user.role);
    
    // Asignar el ticket usando el servicio
    const ticketActualizado = await ticketService.assignTo(ticketId, tecnicoId, req.user.id);
    
    res.json({
      mensaje: 'Ticket asignado exitosamente',
      ticket: ticketActualizado
    });
  } catch (error) {
    console.error('Error en asignarTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al asignar el ticket'
    });
  }
};

/**
 * Obtiene tickets pendientes de aprobación (solo para supervisores)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerTicketsPendientesAprobacion = async (req, res) => {
  try {
    // Verificar si el usuario tiene rol de supervisor
    const userRole = req.user.role || req.user.rol;
    if (userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No autorizado',
        mensaje: 'Solo los supervisores pueden ver tickets pendientes de aprobación'
      });
    }
    
    // console.log('Obteniendo tickets pendientes de aprobación');
    const tickets = await ticketService.getTicketsPendientesAprobacion();
    
    res.json(tickets || []);
  } catch (error) {
    console.error('Error en obtenerTicketsPendientesAprobacion:', error);
    res.status(500).json({
      error: 'Error al obtener los tickets pendientes de aprobación',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Aprueba un ticket (solo para supervisores)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const aprobarTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const supervisorId = req.user.id;
    const { comentario } = req.body;
    
    // Verificar si el usuario tiene rol de supervisor
    const userRole = req.user.role || req.user.rol;
    if (userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No autorizado',
        mensaje: 'Solo los supervisores pueden aprobar tickets'
      });
    }
    
    // console.log(`Aprobando ticket ${ticketId} por supervisor ${supervisorId}`);
    
    // Aprobar el ticket usando el servicio
    const resultado = await ticketService.aprobarTicket(ticketId, supervisorId, comentario);
    
    res.json({
      mensaje: 'Ticket aprobado exitosamente',
      ticket: resultado.ticket,
      aprobacion: resultado.aprobacion
    });
  } catch (error) {
    console.error('Error en aprobarTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al aprobar el ticket'
    });
  }
};

/**
 * Rechaza un ticket con notificación automática (solo para supervisores)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const rechazarTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const supervisorId = req.user.id;
    const { motivo, notificar_sucursal = true } = req.body;
    
    // Verificar si el usuario tiene rol de supervisor
    const userRole = req.user.role || req.user.rol;
    if (userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No autorizado',
        mensaje: 'Solo los supervisores pueden rechazar tickets'
      });
    }
    
    // Validar que se proporcione un motivo
    if (!motivo || motivo.trim().length === 0) {
      return res.status(400).json({ 
        error: 'El motivo del rechazo es obligatorio'
      });
    }
    
    // console.log(`Rechazando ticket ${ticketId} por supervisor ${supervisorId}`);
    
    // Rechazar el ticket usando el servicio
    const resultado = await ticketService.rechazarTicket(
      ticketId, 
      supervisorId, 
      motivo, 
      notificar_sucursal
    );
    
    res.json({
      mensaje: 'Ticket rechazado exitosamente',
      ticket: resultado.ticket,
      rechazo: resultado.rechazo,
      notificacion_enviada: resultado.notificacion_enviada
    });
  } catch (error) {
    console.error('Error en rechazarTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al rechazar el ticket'
    });
  }
};

/**
 * Obtiene el historial de decisiones del supervisor
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerHistorialSupervisor = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    
    // Validar que supervisorId es un número válido
    if (!supervisorId || isNaN(supervisorId)) {
      return res.status(400).json({
        error: 'ID de supervisor inválido',
        mensaje: 'El ID del supervisor debe ser un número válido'
      });
    }
    
    // Verificar si el usuario tiene rol de supervisor
    const userRole = req.user.role || req.user.rol;
    if (userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No autorizado',
        mensaje: 'Solo los supervisores pueden ver su historial'
      });
    }
    
    // console.log(`Obteniendo historial para supervisor ${supervisorId}`);
    
    const historial = await ticketService.getHistorialSupervisor(parseInt(supervisorId, 10));
    
    res.json(historial || []);
  } catch (error) {
    console.error('Error en obtenerHistorialSupervisor:', error);
    res.status(500).json({
      error: 'Error al obtener el historial del supervisor',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas del supervisor
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerEstadisticasSupervisor = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    
    // Validar que supervisorId es un número válido
    if (!supervisorId || isNaN(supervisorId)) {
      return res.status(400).json({
        error: 'ID de supervisor inválido',
        mensaje: 'El ID del supervisor debe ser un número válido'
      });
    }
    
    // Verificar si el usuario tiene rol de supervisor
    const userRole = req.user.role || req.user.rol;
    if (userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No autorizado',
        mensaje: 'Solo los supervisores pueden ver sus estadísticas'
      });
    }
    
    // console.log(`Obteniendo estadísticas para supervisor ${supervisorId}`);
    
    const estadisticas = await ticketService.getEstadisticasSupervisor(parseInt(supervisorId, 10));
    
    res.json(estadisticas);
  } catch (error) {
    console.error('Error en obtenerEstadisticasSupervisor:', error);
    res.status(500).json({
      error: 'Error al obtener las estadísticas del supervisor',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reasigna un ticket a otro usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const reasignarTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { nuevoUsuarioId, comentario } = req.body;
    const usuarioActual = req.user.id;
    
    if (!nuevoUsuarioId) {
      return res.status(400).json({ error: 'El ID del nuevo usuario es requerido' });
    }
    
    // Verificar que el ticket existe y obtener datos actuales
    const ticketActual = await ticketService.getById(ticketId, usuarioActual);
    
    // Validar que solo el usuario asignado pueda reasignar el ticket
    if (ticketActual.usuario_asignado_id && ticketActual.usuario_asignado_id !== usuarioActual) {
      return res.status(403).json({ 
        error: 'No tienes permiso para reasignar este ticket',
        mensaje: 'Solo el usuario asignado puede reasignar el ticket'
      });
    }
    
    if (!ticketActual) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    
    // Preparar datos de actualización para reasignación
    const updateData = {
      usuarioAsignadoId: nuevoUsuarioId,
      usuarioReasignado: nuevoUsuarioId,
      estado: 'en_progreso' // Cambiar estado a en_progreso si no lo está ya
    };
    
    // console.log(`Reasignando ticket ${ticketId} de usuario ${ticketActual.usuario_asignado_id || 'sin asignar'} a usuario ${nuevoUsuarioId}`);
    
    // Actualizar el ticket con la reasignación
    const ticketActualizado = await ticketService.update(
      ticketId, 
      updateData, 
      usuarioActual,
      comentario || `Ticket reasignado por ${req.user.nombre || req.user.usuario}`
    );
    
    res.json({
      mensaje: 'Ticket reasignado exitosamente',
      ticket: ticketActualizado,
      reasignacion: {
        usuarioAnterior: ticketActual.usuario_asignado_id,
        usuarioNuevo: nuevoUsuarioId,
        fechaReasignacion: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error en reasignarTicket:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al reasignar el ticket'
    });
  }
};

/**
 * Obtiene tickets activos (en progreso) de un usuario específico
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const obtenerTicketsActivosUsuario = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario solo pueda consultar sus propios tickets (excepto admin/supervisor)
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'No tienes permiso para consultar tickets de otros usuarios' });
    }
    
    // Obtener tickets en progreso del usuario
    const ticketsActivos = await ticketRepository.obtenerTicketsPorUsuario(userId, { estado: 'en_progreso' });
    
    res.json({
      ticketsActivos: ticketsActivos || [],
      count: ticketsActivos ? ticketsActivos.length : 0,
      hasActiveTickets: ticketsActivos && ticketsActivos.length > 0
    });
  } catch (error) {
    console.error('Error en obtenerTicketsActivosUsuario:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al obtener tickets activos del usuario'
    });
  }
};

/**
 * Envía un informe de ticket al supervisor
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const enviarInformeASupervisor = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { informe } = req.body;
    const usuarioId = req.user.id;
    
    // Validar que se proporcione el informe
    if (!informe) {
      return res.status(400).json({ error: 'El informe es requerido' });
    }
    
    // Verificar que el ticket existe y el usuario tiene permisos
    const ticket = await ticketRepository.obtenerTicketPorId(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    
    // Solo permitir enviar informes de tickets resueltos
    if (ticket.estado !== 'resuelto') {
      return res.status(400).json({ error: 'Solo se pueden enviar informes de tickets resueltos' });
    }
    
    // Actualizar el ticket con el informe para supervisor
    await ticketRepository.actualizarTicket(ticketId, {
      informe_supervisor: JSON.stringify(informe)
    }, usuarioId);
    
    res.json({
      mensaje: 'Informe enviado al supervisor exitosamente',
      ticketId: ticketId
    });
  } catch (error) {
    console.error('Error en enviarInformeASupervisor:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al enviar el informe al supervisor'
    });
  }
};
