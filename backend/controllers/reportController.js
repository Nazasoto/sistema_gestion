import { obtenerReporteTickets, obtenerHistorialTicket, obtenerEstadisticasEmpleados as obtenerEstadisticasEmpleadosRepo } from '../repositories/ticketHistoryRepository.js';

/**
 * Obtiene el reporte completo de tickets con timestamps
 */
export const obtenerReporte = async (req, res) => {
  try {
    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      estado: req.query.estado,
      usuarioAsignado: req.query.usuarioAsignado
    };

    // Limpiar filtros undefined
    Object.keys(filtros).forEach(key => {
      if (filtros[key] === undefined || filtros[key] === '') {
        delete filtros[key];
      }
    });

    const reporte = await obtenerReporteTickets(filtros);

    res.json({
      success: true,
      data: reporte || [],
      total: (reporte && Array.isArray(reporte)) ? reporte.length : 0
    });
  } catch (error) {
    console.error('Error al obtener reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene el historial detallado de un ticket específico
 */
export const obtenerHistorialDetallado = async (req, res) => {
  try {
    const { id } = req.params;
    const historial = await obtenerHistorialTicket(id);

    res.json({
      success: true,
      data: historial
    });
  } catch (error) {
    console.error('Error al obtener historial del ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas detalladas por empleado y sucursal
 */
export const obtenerEstadisticasEmpleados = async (req, res) => {
  try {
    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      sucursal: req.query.sucursal
    };

    // Limpiar filtros undefined
    Object.keys(filtros).forEach(key => {
      if (filtros[key] === undefined || filtros[key] === '') {
        delete filtros[key];
      }
    });

    const estadisticas = await obtenerEstadisticasEmpleadosRepo(filtros);

    res.json({
      success: true,
      data: estadisticas || []
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
