import { query, getConnection, beginTransaction, commit, rollback } from '../config/database.js';
import moment from 'moment-timezone';

/**
 * Registra un cambio de estado en el historial del ticket
 * @param {number} ticketId - ID del ticket
 * @param {string} estadoAnterior - Estado anterior del ticket
 * @param {string} estadoNuevo - Nuevo estado del ticket
 * @param {number} usuarioId - ID del usuario que realiza el cambio
 * @param {string} comentario - Comentario del cambio
 * @returns {Promise<Object>} - El registro de historial creado
 */
async function registrarCambioEstado(ticketId, estadoAnterior, estadoNuevo, usuarioId, comentario = null) {
  const connection = await getConnection();
  try {
    await beginTransaction(connection);
    
    // Get current Argentina time using moment-timezone
    const argentinaTime = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');

    const [result] = await connection.query(
      `INSERT INTO ticket_history (
        ticket_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_cambio
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, estadoAnterior, estadoNuevo, usuarioId, comentario, argentinaTime]
    );
    
    const [historialCreado] = await connection.query(
      'SELECT * FROM ticket_history WHERE id = ?',
      [result.insertId]
    );
    
    await commit(connection);
    return historialCreado[0];
  } catch (error) {
    await rollback(connection);
    console.error('Error al registrar cambio de estado:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtiene el historial completo de un ticket
 * @param {number} ticketId - ID del ticket
 * @returns {Promise<Array>} - Historial del ticket
 */
async function obtenerHistorialTicket(ticketId) {
  try {
    const [historial] = await query(
      `SELECT th.*, u.nombre AS nombre_usuario, u.mail AS email_usuario
       FROM ticket_history th
       LEFT JOIN usuarios u ON th.usuario_id = u.id_usuario
       WHERE th.ticket_id = ?
       ORDER BY th.fecha_cambio ASC`,
      [ticketId]
    );
    
    return historial;
  } catch (error) {
    console.error('Error al obtener historial del ticket:', error);
    throw error;
  }
}

/**
 * Obtiene timestamps específicos para reportes
 * @param {number} ticketId - ID del ticket
 * @returns {Promise<Object>} - Timestamps del ticket
 */
async function obtenerTimestampsTicket(ticketId) {
  try {
    const [historial] = await query(
      `SELECT 
        MIN(CASE WHEN estado_nuevo = 'en_progreso' THEN fecha_cambio END) AS fecha_tomado,
        MIN(CASE WHEN estado_nuevo IN ('resuelto', 'pendiente') THEN fecha_cambio END) AS fecha_resuelto,
        (SELECT usuario_id FROM ticket_history WHERE ticket_id = ? AND estado_nuevo = 'en_progreso' ORDER BY fecha_cambio ASC LIMIT 1) AS usuario_asignado_id
       FROM ticket_history 
       WHERE ticket_id = ?`,
      [ticketId, ticketId]
    );
    
    return historial[0] || {};
  } catch (error) {
    console.error('Error al obtener timestamps del ticket:', error);
    throw error;
  }
}

/**
 * Obtiene reporte completo de tickets con timestamps
 * @param {Object} filtros - Filtros para el reporte
 * @returns {Promise<Array>} - Reporte de tickets
 */
async function obtenerReporteTickets(filtros = {}) {
  try {
    let queryStr = `
      SELECT 
        t.id,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.categoria,
        t.fecha_creacion,
        t.fecha_actualizacion,
        uc.nombre AS nombre_creador,
        uc.mail AS email_creador,
        uc.sucursal AS sucursal_creador,
        ua.nombre AS nombre_asignado,
        ua.mail AS email_asignado,
        ua.sucursal AS sucursal_asignado,
        (SELECT MIN(th1.fecha_cambio) 
         FROM ticket_history th1 
         WHERE th1.ticket_id = t.id AND th1.estado_nuevo = 'en_progreso') AS fecha_tomado,
        (SELECT MIN(th2.fecha_cambio) 
         FROM ticket_history th2 
         WHERE th2.ticket_id = t.id AND th2.estado_nuevo IN ('resuelto', 'pendiente', 'cerrado')) AS fecha_resuelto,
        (SELECT th3.comentario 
         FROM ticket_history th3 
         WHERE th3.ticket_id = t.id AND th3.estado_nuevo = 'en_progreso' 
         ORDER BY th3.fecha_cambio ASC LIMIT 1) AS comentario_tomado,
        (SELECT th4.comentario 
         FROM ticket_history th4 
         WHERE th4.ticket_id = t.id AND th4.estado_nuevo IN ('resuelto', 'pendiente', 'cerrado') 
         ORDER BY th4.fecha_cambio ASC LIMIT 1) AS comentario_resuelto
      FROM tickets t
      LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id_usuario
      LEFT JOIN usuarios ua ON t.usuario_asignado_id = ua.id_usuario
      WHERE 1=1
    `;
    
    const params = [];
    
    // Aplicar filtros
    if (filtros.fechaDesde) {
      queryStr += ' AND t.fecha_creacion >= ?';
      params.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
      queryStr += ' AND t.fecha_creacion <= ?';
      params.push(filtros.fechaHasta);
    }
    
    if (filtros.estado) {
      if (Array.isArray(filtros.estado)) {
        const placeholders = filtros.estado.map(() => '?').join(', ');
        queryStr += ` AND t.estado IN (${placeholders})`;
        params.push(...filtros.estado);
      } else {
        queryStr += ' AND t.estado = ?';
        params.push(filtros.estado);
      }
    }
    
    if (filtros.usuarioAsignado) {
      // Check if the value is numeric (ID) or text (name)
      if (isNaN(filtros.usuarioAsignado)) {
        // Filter by name
        queryStr += ' AND ua.nombre = ?';
        params.push(filtros.usuarioAsignado);
      } else {
        // Filter by ID
        queryStr += ' AND t.usuario_asignado_id = ?';
        params.push(filtros.usuarioAsignado);
      }
    }
    
    queryStr += ' ORDER BY t.fecha_creacion DESC';
    
    const [tickets] = await query(queryStr, params);
    return tickets;
  } catch (error) {
    console.error('Error al obtener reporte de tickets:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas detalladas por empleado y sucursal
 * @param {Object} filtros - Filtros para las estadísticas
 * @returns {Promise<Array>} - Estadísticas por empleado
 */
async function obtenerEstadisticasEmpleados(filtros = {}) {
  try {
    let queryStr = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.mail,
        u.sucursal,
        COUNT(t.id) as total_tickets,
        COUNT(CASE WHEN t.estado = 'nuevo' THEN 1 END) as tickets_nuevos,
        COUNT(CASE WHEN t.estado = 'en_progreso' THEN 1 END) as tickets_en_progreso,
        COUNT(CASE WHEN t.estado = 'resuelto' THEN 1 END) as tickets_resueltos,
        COUNT(CASE WHEN t.estado = 'cerrado' THEN 1 END) as tickets_cerrados,
        COUNT(CASE WHEN t.estado = 'cancelado' THEN 1 END) as tickets_cancelados,
        COUNT(CASE WHEN t.usuario_reasignado IS NOT NULL THEN 1 END) as tickets_reasignados,
        AVG(CASE 
          WHEN t.estado IN ('resuelto', 'cerrado') AND t.fecha_cierre IS NOT NULL 
          THEN CASE 
            WHEN t.fecha_reasignacion IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, t.fecha_reasignacion, t.fecha_cierre)
            ELSE TIMESTAMPDIFF(HOUR, t.fecha_creacion, t.fecha_cierre)
          END
        END) as tiempo_promedio_resolucion_horas,
        MIN(t.fecha_creacion) as primer_ticket,
        MAX(t.fecha_creacion) as ultimo_ticket
      FROM usuarios u
      LEFT JOIN tickets t ON u.id_usuario = t.usuario_creador_id
      WHERE u.rol IN ('usuario', 'empleado')
    `;
    
    const params = [];
    
    // Aplicar filtros
    if (filtros.fechaDesde) {
      queryStr += ' AND (t.fecha_creacion >= ? OR t.fecha_creacion IS NULL)';
      params.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
      queryStr += ' AND (t.fecha_creacion <= ? OR t.fecha_creacion IS NULL)';
      params.push(filtros.fechaHasta);
    }
    
    if (filtros.sucursal) {
      queryStr += ' AND u.sucursal = ?';
      params.push(filtros.sucursal);
    }
    
    queryStr += `
      GROUP BY u.id_usuario, u.nombre, u.mail, u.sucursal
      ORDER BY total_tickets DESC, u.nombre ASC
    `;
    
    const [estadisticas] = await query(queryStr, params);
    
    // Formatear los resultados
    return estadisticas.map(emp => ({
      ...emp,
      tiempo_promedio_resolucion_horas: emp.tiempo_promedio_resolucion_horas ? 
        Math.round(emp.tiempo_promedio_resolucion_horas * 100) / 100 : null
    }));
  } catch (error) {
    console.error('Error al obtener estadísticas de empleados:', error);
    throw error;
  }
}

export {
  registrarCambioEstado,
  obtenerHistorialTicket,
  obtenerTimestampsTicket,
  obtenerReporteTickets,
  obtenerEstadisticasEmpleados
};
