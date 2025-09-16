/**
 * Cambia el estado de un ticket
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const cambiarEstadoTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const usuarioId = req.usuario.id_usuario;
    const { estado } = req.body;
    
    if (!estado) {
      return res.status(400).json({ error: 'El nuevo estado es requerido' });
    }
    
    const ticketActualizado = await ticketService.update(
      ticketId, 
      { estado },
      usuarioId
    );
    
    res.json({
      mensaje: 'Estado del ticket actualizado exitosamente',
      ticket: ticketActualizado
    });
  } catch (err) {
    console.error('Error en cambiarEstadoTicket:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Error al cambiar el estado del ticket'
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
    const usuarioId = req.usuario.id_usuario;
    const { tecnicoId } = req.body;
    
    if (!tecnicoId) {
      return res.status(400).json({ error: 'El ID del técnico es requerido' });
    }
    
    const ticketActualizado = await ticketService.update(
      ticketId,
      { asignadoA: tecnicoId },
      usuarioId
    );
    
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
