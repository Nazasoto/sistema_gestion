import { query } from '../config/database.js';

// Obtener eventos de la bitácora con filtros
export const getEventos = async (req, res) => {
  try {
    const {
      tipo,
      severidad,
      sucursal,
      fechaDesde,
      fechaHasta,
      busqueda,
      limit = 100,
      offset = 0
    } = req.query;

    let whereConditions = [];
    let params = [];

    // Filtros
    if (tipo) {
      whereConditions.push('tipo_evento = ?');
      params.push(tipo);
    }

    if (severidad) {
      whereConditions.push('severidad = ?');
      params.push(severidad);
    }

    if (sucursal) {
      whereConditions.push('sucursal LIKE ?');
      params.push(`%${sucursal}%`);
    }

    if (fechaDesde) {
      whereConditions.push('fecha_evento >= ?');
      params.push(fechaDesde + ' 00:00:00');
    }

    if (fechaHasta) {
      whereConditions.push('fecha_evento <= ?');
      params.push(fechaHasta + ' 23:59:59');
    }

    if (busqueda) {
      whereConditions.push('descripcion LIKE ?');
      params.push(`%${busqueda}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const queryStr = `
      SELECT 
        be.*,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido
      FROM bitacora_eventos be
      LEFT JOIN usuarios u ON be.usuario_id = u.id_usuario
      ${whereClause}
      ORDER BY be.fecha_evento DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const eventos = await query(queryStr, params);

    // Contar total de eventos para paginación
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bitacora_eventos be
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2); // Remover limit y offset
    const [countResult] = await query(countQuery, countParams);

    res.json({
      eventos,
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error obteniendo eventos de bitácora:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Registrar un nuevo evento en la bitácora
export const registrarEvento = async (req, res) => {
  try {
    const {
      tipo_evento,
      descripcion,
      detalles,
      severidad = 'info',
      usuario_id,
      sucursal
    } = req.body;

    if (!tipo_evento || !descripcion) {
      return res.status(400).json({ 
        error: 'tipo_evento y descripcion son requeridos' 
      });
    }

    // Obtener información de la request
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.ip || 
                      req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    const result = await query(`
      INSERT INTO bitacora_eventos (
        tipo_evento, descripcion, detalles, severidad, 
        usuario_id, sucursal, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tipo_evento,
      descripcion,
      JSON.stringify(detalles),
      severidad,
      usuario_id,
      sucursal,
      ip_address,
      user_agent
    ]);

    res.status(201).json({
      message: 'Evento registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error registrando evento en bitácora:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de eventos
export const getEstadisticas = async (req, res) => {
  try {
    const { periodo = '7d' } = req.query;
    
    let fechaDesde;
    const now = new Date();
    
    switch (periodo) {
      case '1d':
        fechaDesde = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fechaDesde = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        fechaDesde = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        fechaDesde = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Estadísticas por tipo de evento
    const eventosPorTipo = await query(`
      SELECT tipo_evento, COUNT(*) as cantidad
      FROM bitacora_eventos
      WHERE fecha_evento >= ?
      GROUP BY tipo_evento
      ORDER BY cantidad DESC
    `, [fechaDesde]);

    // Estadísticas por severidad
    const eventosPorSeveridad = await query(`
      SELECT severidad, COUNT(*) as cantidad
      FROM bitacora_eventos
      WHERE fecha_evento >= ?
      GROUP BY severidad
      ORDER BY cantidad DESC
    `, [fechaDesde]);

    // Eventos por sucursal (top 10)
    const eventosPorSucursal = await query(`
      SELECT sucursal, COUNT(*) as cantidad
      FROM bitacora_eventos
      WHERE fecha_evento >= ? AND sucursal IS NOT NULL
      GROUP BY sucursal
      ORDER BY cantidad DESC
      LIMIT 10
    `, [fechaDesde]);

    // Total de eventos
    const [totalEventos] = await query(`
      SELECT COUNT(*) as total
      FROM bitacora_eventos
      WHERE fecha_evento >= ?
    `, [fechaDesde]);

    res.json({
      periodo,
      fechaDesde,
      totalEventos: totalEventos.total,
      eventosPorTipo,
      eventosPorSeveridad,
      eventosPorSucursal
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de bitácora:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Limpiar todos los eventos de la bitácora
export const limpiarBitacora = async (req, res) => {
  try {
    console.log('Usuario intentando limpiar bitácora:', {
      id: req.user.id,
      nombre: req.user.nombre,
      role: req.user.role
    });
    
    // Solo los administradores, supervisores y soporte pueden limpiar la bitácora
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.role !== 'soporte') {
      console.log('Acceso denegado - rol requerido: admin/supervisor/soporte, rol actual:', req.user.role);
      return res.status(403).json({ error: 'Solo los administradores, supervisores y soporte pueden limpiar la bitácora' });
    }

    // Obtener el conteo antes de limpiar para el log
    const [countResult] = await query('SELECT COUNT(*) as total FROM bitacora_eventos');
    const totalEventos = countResult.total;

    // Limpiar todos los eventos
    await query('DELETE FROM bitacora_eventos');

    // Registrar el evento de limpieza
    await query(`
      INSERT INTO bitacora_eventos (
        tipo_evento, descripcion, severidad, 
        usuario_id, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'limpieza_bitacora',
      `Bitácora limpiada por ${req.user.nombre} ${req.user.apellido}. Se eliminaron ${totalEventos} eventos.`,
      'warning',
      req.user.id,
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    ]);

    res.json({
      message: 'Bitácora limpiada exitosamente',
      eventosEliminados: totalEventos
    });
  } catch (error) {
    console.error('Error limpiando bitácora:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función helper para registrar eventos desde otros controladores
export const registrarEventoHelper = async (eventoData) => {
  try {
    const {
      tipo_evento,
      descripcion,
      detalles = null,
      severidad = 'info',
      usuario_id = null,
      sucursal = null,
      ip_address = null,
      user_agent = null
    } = eventoData;

    await query(`
      INSERT INTO bitacora_eventos (
        tipo_evento, descripcion, detalles, severidad, 
        usuario_id, sucursal, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tipo_evento,
      descripcion,
      detalles ? JSON.stringify(detalles) : null,
      severidad,
      usuario_id,
      sucursal,
      ip_address,
      user_agent
    ]);
  } catch (error) {
    console.error('Error registrando evento en bitácora (helper):', error);
    // No lanzar error para no interrumpir el flujo principal
  }
};
