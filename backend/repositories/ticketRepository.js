import { query, getConnection, beginTransaction, commit, rollback } from '../config/database.js';
import { registrarCambioEstado } from './ticketHistoryRepository.js';
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import moment from 'moment-timezone';

/**
 * Crea un nuevo ticket
 * @param {Object} ticketData - Datos del ticket
 * @param {number} usuarioId - ID del usuario que crea el ticket
 * @returns {Promise<Object>} - El ticket creado
 */
async function crearTicket(ticketData, usuarioId) {
  const { 
    titulo, 
    descripcion, 
    estado = 'abierto', 
    prioridad = 'media', 
    categoria, 
    usuarioAsignadoId, 
    archivos_adjuntos = []
  } = ticketData;
  
  const connection = await getConnection();
  try {
    await beginTransaction(connection);
    
    // Convertir el array de archivos a JSON si no es null/undefined
    const archivosJson = archivos_adjuntos ? JSON.stringify(archivos_adjuntos) : '[]';
    
    // Get current time in Argentina timezone as string (no timezone conversion needed)
    const argentinaTime = moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');

    const [result] = await connection.query(
      `INSERT INTO tickets (
        titulo, descripcion, estado, prioridad, categoria, 
        usuario_creador_id, usuario_asignado_id, archivos_adjuntos, fecha_creacion, fecha_actualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo, 
        descripcion, 
        estado, 
        prioridad, 
        categoria, 
        usuarioId, 
        usuarioAsignadoId,
        archivosJson,
        argentinaTime,
        argentinaTime
      ]
    );
    
    const [ticketCreado] = await connection.query(
      'SELECT * FROM tickets WHERE id = ?',
      [result.insertId]
    );
    
    await commit(connection);
    return ticketCreado[0];
  } catch (error) {
    await rollback(connection);
    console.error('Error al crear el ticket:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtiene un ticket por su ID
 * @param {number} ticketId - ID del ticket
 * @param {number} [usuarioId] - ID del usuario para verificación de permisos (opcional)
 * @returns {Promise<Object>} - El ticket encontrado
 */
async function obtenerTicketPorId(ticketId, usuarioId = null) {
  try {
    let queryStr = `
      SELECT t.id,
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
             t.informe_supervisor,
             t.usuario_creador_id,
             t.usuario_asignado_id,
             t.usuario_reasignado,
             t.fecha_reasignacion,
             uc.nombre AS nombre_creador,
             uc.apellido AS apellido_creador, 
             uc.mail AS email_creador,
             uc.sucursal AS sucursal_creador,
             sc.nro_sucursal AS numero_sucursal_creador,
             sc.nombre AS nombre_sucursal_creador,
             sc.localidad AS localidad_sucursal_creador,
             sc.provincia AS provincia_sucursal_creador,
             ua.nombre AS nombre_asignado,
             ua.apellido AS apellido_asignado,
             ua.mail AS email_asignado,
             ua.sucursal AS sucursal_asignado,
             ur.nombre AS nombre_reasignado,
             ur.apellido AS apellido_reasignado,
             ur.mail AS email_reasignado
      FROM tickets t
      LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id_usuario
      LEFT JOIN sucursales sc ON uc.sucursal COLLATE utf8mb4_unicode_ci = sc.nro_sucursal COLLATE utf8mb4_unicode_ci
      LEFT JOIN usuarios ua ON t.usuario_asignado_id = ua.id_usuario
      LEFT JOIN usuarios ur ON t.usuario_reasignado = ur.id_usuario
      WHERE t.id = ?
    `;
    
    // console.log('=== QUERY DEBUG ===');
    // console.log('Query SQL:', queryStr);
    // console.log('Ticket ID:', ticketId);
    
    const params = [ticketId];
    
    // Si se proporciona un usuarioId, verificar que tenga permisos
    // Para supervisores y soporte, no aplicar restricciones de acceso
    if (usuarioId) {
      queryStr += ' AND (t.usuario_creador_id = ? OR t.usuario_asignado_id = ? OR EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = ? AND (role = "supervisor" OR role = "soporte")))';
      params.push(usuarioId, usuarioId, usuarioId);
    }
    
    const tickets = await query(queryStr, params);
    
    // console.log('=== RESULTADO QUERY ===');
    // console.log('Tickets encontrados:', tickets.length);
    if (tickets.length > 0) {
      // console.log('Datos del ticket:', JSON.stringify(tickets[0], null, 2));
      // console.log('Campos de creador en resultado:');
      // console.log('- nombre_creador:', tickets[0].nombre_creador);
      // console.log('- apellido_creador:', tickets[0].apellido_creador);
      // console.log('- email_creador:', tickets[0].email_creador);
      // console.log('- usuario_creador_id:', tickets[0].usuario_creador_id);
      // console.log('Campos de asignado en resultado:');
      // console.log('- nombre_asignado:', tickets[0].nombre_asignado);
      // console.log('- apellido_asignado:', tickets[0].apellido_asignado);
      // console.log('- email_asignado:', tickets[0].email_asignado);
      // console.log('- usuario_asignado_id:', tickets[0].usuario_asignado_id);
      // console.log('Campos de reasignado en resultado:');
      // console.log('- nombre_reasignado:', tickets[0].nombre_reasignado);
      // console.log('- apellido_reasignado:', tickets[0].apellido_reasignado);
      // console.log('- email_reasignado:', tickets[0].email_reasignado);
      // console.log('- usuario_reasignado:', tickets[0].usuario_reasignado);
    }
    // console.log('=== FIN RESULTADO ===');
    
    if (tickets.length === 0) {
      const error = new Error('Ticket no encontrado o acceso denegado');
      error.status = 404;
      throw error;
    }
    
    return tickets[0];
  } catch (error) {
    console.error('Error al obtener el ticket:', error);
    throw error;
  }
}

/**
 * Obtiene todos los tickets de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {Object} [filtros] - Filtros opcionales
 * @param {string} [filtros.estado] - Estado del ticket
 * @param {string} [filtros.prioridad] - Prioridad del ticket
 * @param {string} [filtros.categoria] - Categoría del ticket
 * @returns {Promise<Array>} - Lista de tickets
 */
async function obtenerTicketsPorUsuario(usuarioId, filtros = {}) {
  const connection = await getConnection();
  try {
    // console.log('Obteniendo tickets para usuario ID:', usuarioId);
    // console.log('Filtros aplicados:', filtros);
    
    // Validar que el usuarioId es un número
    const usuarioIdNum = parseInt(usuarioId, 10);
    if (isNaN(usuarioIdNum)) {
      throw new Error('El ID de usuario proporcionado no es válido');
    }
    
    // Construir la consulta de manera segura
    let queryStr = `
      SELECT 
        t.*,
        uc.nombre AS nombre_creador, 
        uc.apellido AS apellido_creador,
        uc.mail AS email_creador,
        uc.sucursal AS sucursal_creador,
        sc.nro_sucursal AS numero_sucursal_creador,
        sc.nombre AS nombre_sucursal_creador,
        sc.localidad AS localidad_sucursal_creador,
        sc.provincia AS provincia_sucursal_creador,
        ua.nombre AS nombre_asignado,
        ua.apellido AS apellido_asignado,
        ua.mail AS email_asignado,
        ua.sucursal AS sucursal_asignado
      FROM tickets t
      LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id_usuario
      LEFT JOIN sucursales sc ON uc.sucursal COLLATE utf8mb4_unicode_ci = sc.nro_sucursal COLLATE utf8mb4_unicode_ci
      LEFT JOIN usuarios ua ON t.usuario_asignado_id = ua.id_usuario
      WHERE t.usuario_creador_id = ? OR t.usuario_asignado_id = ?
    `;
    
    const params = [usuarioIdNum, usuarioIdNum];
    
    // Aplicar filtros
    if (filtros.estado) {
      if (Array.isArray(filtros.estado)) {
        // Manejar array de estados con IN clause
        const placeholders = filtros.estado.map(() => '?').join(', ');
        queryStr += ` AND t.estado IN (${placeholders})`;
        params.push(...filtros.estado);
        // console.log(`Aplicando filtro de estados (array): ${filtros.estado.join(', ')}`);
      } else {
        // Manejar estado único
        queryStr += ' AND t.estado = ?';
        params.push(filtros.estado);
        // console.log(`Aplicando filtro de estado: ${filtros.estado}`);
      }
    }
    
    if (filtros.prioridad) {
      queryStr += ' AND t.prioridad = ?';
      params.push(filtros.prioridad);
      // console.log(`Aplicando filtro de prioridad: ${filtros.prioridad}`);
    }
    
    if (filtros.categoria) {
      queryStr += ' AND t.categoria = ?';
      params.push(filtros.categoria);
      // console.log(`Aplicando filtro de categoría: ${filtros.categoria}`);
    }
    
    // Ordenar por fecha de creación descendente
    queryStr += ' ORDER BY t.fecha_creacion DESC';
    
    // console.log('Ejecutando consulta SQL:', queryStr);
    // console.log('Parámetros:', params);
    
    // Usar la conexión directamente para obtener más información de error si falla
    const [tickets] = await connection.query(queryStr, params);
    
    if (!Array.isArray(tickets)) {
      console.error('La respuesta de la base de datos no es un array:', tickets);
      return [];
    }
    
    // console.log(`Se encontraron ${tickets.length} tickets para el usuario ${usuarioId}`);
    return tickets;
  } catch (error) {
    console.error('Error en obtenerTicketsPorUsuario:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      usuarioId,
      filtros
    });
    
    // Crear un error mejorado con más contexto
    const enhancedError = new Error(`Error al obtener los tickets: ${error.message}`);
    enhancedError.status = error.status || 500;
    enhancedError.code = error.code || 'TICKETS_FETCH_ERROR';
    enhancedError.originalError = error;
    
    // En desarrollo, incluir más detalles
    if (process.env.NODE_ENV === 'development') {
      enhancedError.details = {
        query: queryStr,
        params,
        stack: error.stack
      };
    }
    
    throw enhancedError;
  } finally {
    // Asegurarse de liberar la conexión
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error al liberar la conexión:', releaseError);
      }
    }
  }
}

/**
 * Actualiza un ticket existente
 * @param {number} ticketId - ID del ticket a actualizar
 * @param {Object} datosActualizados - Campos a actualizar
 * @param {number} [usuarioId] - ID del usuario que realiza la actualización (para verificación de permisos)
 * @returns {Promise<Object>} - El ticket actualizado
 */
async function actualizarTicket(ticketId, datosActualizados, usuarioId = null, comentario = null) {
  const { titulo, descripcion, estado, prioridad, categoria, usuarioAsignadoId, sucursal, usuarioReasignado } = datosActualizados;
  
  const connection = await getConnection();
  try {
    await beginTransaction(connection);
    
    // Verificar que el ticket existe y el usuario tiene permisos
    const ticketAnterior = await obtenerTicketPorId(ticketId, usuarioId);
    
    // Construir la consulta de actualización dinámicamente
    const camposActualizar = [];
    const params = [];
    
    if (titulo !== undefined) {
      camposActualizar.push('titulo = ?');
      params.push(titulo);
    }
    
    if (descripcion !== undefined) {
      camposActualizar.push('descripcion = ?');
      params.push(descripcion);
    }
    
    if (estado !== undefined) {
      camposActualizar.push('estado = ?');
      params.push(estado);
      
      // Si el ticket pasa a pendiente, liberar la asignación para que cualquiera pueda tomarlo
      if (estado.toLowerCase() === 'pendiente') {
        camposActualizar.push('usuario_asignado_id = NULL');
        console.log(`[DEBUG] Ticket ${ticketId} marcado como pendiente - liberando asignación`);
      }
      
      // Si el ticket se está cerrando/resolviendo, actualizar fecha_cierre
      if (['resuelto', 'cerrado', 'pendiente', 'cancelado'].includes(estado.toLowerCase())) {
        const fechaCierre = moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');
        // console.log(`[DEBUG] Actualizando fecha_cierre para ticket ${ticketId} con estado ${estado} a ${fechaCierre}`);
        camposActualizar.push('fecha_cierre = ?');
        params.push(fechaCierre);
      }
      
      // Si el ticket se está tomando (cambiando a en_progreso), solo registrar en logs
      if (estado === 'en_progreso' && ticketAnterior.estado !== 'en_progreso') {
        const fechaTomado = moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');
        // console.log(`[DEBUG] Ticket ${ticketId} tomado a las ${fechaTomado} - usando fecha_actualizacion`);
      }
      
      // Si el ticket se está resolviendo, solo registrar en logs
      if (estado === 'resuelto' && ticketAnterior.estado !== 'resuelto') {
        const fechaResuelto = moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');
        // console.log(`[DEBUG] Ticket ${ticketId} resuelto a las ${fechaResuelto} - usando fecha_actualizacion`);
      }
    }
    
    if (prioridad !== undefined) {
      camposActualizar.push('prioridad = ?');
      params.push(prioridad);
    }
    
    if (categoria !== undefined) {
      camposActualizar.push('categoria = ?');
      params.push(categoria);
    }
    
    if (sucursal !== undefined) {
      camposActualizar.push('sucursal = ?');
      params.push(sucursal);
    }
    
    if (usuarioAsignadoId !== undefined) {
      // console.log(`🔧 REPO DEBUG - Actualizando usuario_asignado_id a: ${usuarioAsignadoId}`);
      camposActualizar.push('usuario_asignado_id = ?');
      params.push(usuarioAsignadoId);
    }
    
    // Campos para reasignación
    if (usuarioReasignado !== undefined) {
      camposActualizar.push('usuario_reasignado = ?');
      params.push(usuarioReasignado);
      
      // Agregar fecha de reasignación automáticamente cuando se reasigna (usando CURRENT_TIMESTAMP)
      camposActualizar.push('fecha_reasignacion = CURRENT_TIMESTAMP');
      // No agregamos parámetro porque CURRENT_TIMESTAMP se maneja automáticamente
    }
    
    // Si hay un comentario, guardarlo como JSON válido en la columna comentarios
    if (comentario && comentario.trim() !== '') {
      camposActualizar.push('comentarios = ?');
      params.push(JSON.stringify(comentario.trim()));
    }
    
    // Si no hay campos para actualizar, retornar el ticket actual
    if (camposActualizar.length === 0) {
      return await obtenerTicketPorId(ticketId);
    }
    
    // Add Argentina timezone for fecha_actualizacion as string (no timezone conversion needed)
    const argentinaTime = moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss');
    
    camposActualizar.push('fecha_actualizacion = ?');
    params.push(argentinaTime);
    
    // Agregar el ID del ticket a los parámetros
    params.push(ticketId);
    
    // Ejecutar la actualización
    const updateQuery = `UPDATE tickets SET ${camposActualizar.join(', ')} WHERE id = ?`;
    // console.log('🔧 REPO DEBUG - Query SQL:', updateQuery);
    // console.log('🔧 REPO DEBUG - Parámetros:', params);
    // console.log('🔧 REPO DEBUG - Ticket ID a actualizar:', ticketId);
    
    const [result] = await connection.execute(updateQuery, params);
    
    // console.log('🔧 REPO DEBUG - Resultado completo:', result);
    // console.log('🔧 REPO DEBUG - Filas afectadas:', result.affectedRows);
    // console.log('🔧 REPO DEBUG - Changed rows:', result.changedRows);
    // console.log('🔧 REPO DEBUG - Info:', result.info);
    
    // Verificar inmediatamente después de la actualización
    const [verificacion] = await connection.execute(
      'SELECT id, estado, usuario_asignado_id FROM tickets WHERE id = ?', 
      [ticketId]
    );
    // console.log('🔧 REPO DEBUG - Verificación post-update:', verificacion[0]);
    
    await commit(connection);
    
    // Si cambió el estado, registrar en el historial DESPUÉS del commit
    if (estado !== undefined && estado !== ticketAnterior.estado) {
      try {
        await registrarCambioEstado(
          ticketId,
          ticketAnterior.estado,
          estado,
          usuarioId || ticketAnterior.usuario_creador_id,
          comentario || null // Usar el comentario del usuario o null si no hay
        );
      } catch (historialError) {
        console.error('Error al registrar historial (no crítico):', historialError);
        // No fallar la actualización por error en historial
      }
    }
    
    // Obtener el ticket actualizado con todos los datos
    const ticketActualizado = await obtenerTicketPorId(ticketId);
    return ticketActualizado;
  } catch (error) {
    await rollback(connection);
    console.error('Error al actualizar el ticket:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Elimina un ticket
 * @param {number} ticketId - ID del ticket a eliminar
 * @param {number} usuarioId - ID del usuario que realiza la eliminación
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
async function eliminarTicket(ticketId, usuarioId) {
  const connection = await getConnection();
  try {
    await beginTransaction(connection);
    
    // Verificar que el ticket existe y pertenece al usuario
    const ticket = await obtenerTicketPorId(ticketId, usuarioId);
    
    // Solo el creador del ticket puede eliminarlo
    if (ticket.usuario_creador_id !== usuarioId) {
      const error = new Error('No tienes permiso para eliminar este ticket');
      error.status = 403;
      throw error;
    }
    
    // Eliminar el ticket
    await connection.query('DELETE FROM tickets WHERE id = ?', [ticketId]);
    
    await commit(connection);
    return true;
  } catch (error) {
    await rollback(connection);
    console.error('Error al eliminar el ticket:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtiene estadísticas de tickets por usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object>} - Estadísticas de los tickets
 */
async function obtenerEstadisticasTickets(usuarioId) {
  try {
    const [result] = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN estado = 'nuevo' THEN 1 ELSE 0 END) AS nuevos,
        SUM(CASE WHEN estado = 'en_espera' THEN 1 ELSE 0 END) AS en_espera,
        SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) AS en_progreso,
        SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) AS resueltos,
        SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END) AS cerrados,
        SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
        SUM(CASE WHEN estado = 'err' THEN 1 ELSE 0 END) AS errores,
        SUM(CASE WHEN prioridad = 'baja' THEN 1 ELSE 0 END) AS prioridad_baja,
        SUM(CASE WHEN prioridad = 'media' THEN 1 ELSE 0 END) AS prioridad_media,
        SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) AS prioridad_alta,
        SUM(CASE WHEN prioridad = 'urgente' THEN 1 ELSE 0 END) AS prioridad_urgente
      FROM tickets
      WHERE usuario_creador_id = ? OR usuario_asignado_id = ?
    `, [usuarioId, usuarioId]);
    
    return result || {};
  } catch (error) {
    console.error('Error al obtener estadísticas de tickets:', error);
    throw error;
  }
}

/**
 * Obtiene el conteo de tickets asignados por usuario de soporte
 * @returns {Promise<Array>} - Array con id_usuario y count de tickets asignados
 */
async function obtenerConteoTicketsAsignados() {
  try {
    const queryStr = `
      SELECT 
        usuario_asignado_id as id_usuario,
        COUNT(*) as tickets_asignados
      FROM tickets 
      WHERE usuario_asignado_id IS NOT NULL 
        AND estado IN ('nuevo', 'en_progreso')
      GROUP BY usuario_asignado_id
    `;
    
    const result = await query(queryStr);
    return result;
  } catch (error) {
    console.error('Error obteniendo conteo de tickets asignados:', error);
    throw error;
  }
}

export {
  crearTicket,
  obtenerTicketPorId,
  obtenerTicketsPorUsuario,
  actualizarTicket,
  eliminarTicket,
  obtenerEstadisticasTickets,
  obtenerConteoTicketsAsignados
};
