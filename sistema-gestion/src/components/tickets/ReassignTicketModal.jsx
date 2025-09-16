import React, { useState, useEffect } from 'react';
import CustomModal from '../common/CustomModal';
import userService from '../../services/userService';
import ticketService from '../../services/ticket.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExchangeAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';

const ReassignTicketModal = ({ 
  isOpen, 
  onClose, 
  ticket, 
  onReassignSuccess 
}) => {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
      setSelectedUserId('');
      setComentario('');
      setError('');
    }
  }, [isOpen]);

  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    try {
      // Obtener solo usuarios de soporte que están conectados
      const activeUsersResponse = await userService.getActiveUsers('soporte');
      const usuariosConectados = activeUsersResponse.users || [];
      
      console.log('👥 Usuarios de soporte conectados:', usuariosConectados);
      
      // Mapear usuarios para asegurar que tengan el campo correcto
      const usuariosMapeados = usuariosConectados.map(usuario => ({
        ...usuario,
        id_usuario: usuario.id_usuario || usuario.id || usuario.user_id,
        id: usuario.id_usuario || usuario.id || usuario.user_id,
        // Agregar indicador visual de que está conectado
        isOnline: true,
        lastSeen: usuario.lastSeen,
        minutesAgo: usuario.minutesAgo
      }));
      
      setUsuarios(usuariosMapeados);
    } catch (error) {
      console.error('❌ Error al cargar usuarios conectados:', error);
      setError('Error al cargar la lista de usuarios conectados');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    
    if (!selectedUserId) {
      setError('Debe seleccionar un usuario para la reasignación');
      return;
    }

    if (!ticket?.id) {
      setError('No se puede reasignar: ticket no válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Enviando reasignación:', {
        ticketId: ticket.id,
        selectedUserId: selectedUserId,
        selectedUserIdParsed: parseInt(selectedUserId),
        comentario: comentario.trim()
      });
      
      const result = await ticketService.reassignTicket(
        ticket.id, 
        parseInt(selectedUserId), 
        comentario.trim()
      );

      // Notificar éxito al componente padre
      if (onReassignSuccess) {
        onReassignSuccess(result);
      }

      // Cerrar modal
      onClose();
    } catch (error) {
      console.error('Error al reasignar ticket:', error);
      
      // Verificar si es un error de permisos (403)
      if (error.response?.status === 403) {
        alert('Este ticket no es tuyo. Solo podés reasignar tickets asignados a vos.');
        onClose(); // Cerrar el modal después del alert
      } else {
        setError(error.message || 'Error al reasignar el ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  
  // El usuario actual puede estar en diferentes formatos
  const usuarioActual = ticket?.asignadoA?.id || ticket?.asignadoA?.id_usuario || ticket?.usuario_asignado_id;
  
  // Filtrar usuarios disponibles (excluir el actual)
  const usuariosDisponibles = usuarios.filter(u => {
    const userId = u.id_usuario || u.id;
    return userId !== usuarioActual;
  });
  
  

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="d-flex align-items-center">
          <FontAwesomeIcon icon={faExchangeAlt} className="me-2 text-primary" />
          Reasignar Ticket #{ticket?.id}
        </div>
      }
      size="medium"
    >
      <form onSubmit={handleSubmit}>
        {/* Información del ticket */}
        <div className="mb-3">
          <div className="alert alert-info" style={{fontSize: '20px'}}>
            <strong>Titulo:</strong> {ticket?.titulo}<br/>
            <strong>Estado actual:</strong> <span className="badge bg-secondary">{ticket?.estado}</span><br/>
          </div>
        </div>

        {/* Selector de usuario */}
        <div className="mb-3">
          <label htmlFor="nuevoUsuario" className="form-label">
            <strong style={{fontSize: '20px'}}>Reasignar a :</strong>
          </label>
          {loadingUsers ? (
            <div className="text-center py-3">
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
              Cargando usuarios...
            </div>
          ) : (
            <select
              style={{fontSize: '16px', border: '1px solid #ccc', borderRadius: '5px', padding: '5px', width: '100%', height: '40px', color: '#333', boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)'}}
              id="nuevoUsuario"
              className="form-select"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
              }}
              disabled={loading}
              required
            >
              <option value="">Seleccionar usuario...</option>
              {usuariosDisponibles.length === 0 ? (
                <option disabled>No hay usuarios conectados disponibles</option>
              ) : (
                usuariosDisponibles.map(usuario => {
                  const minutesText = usuario.minutesAgo === 0 ? '' : `hace ${usuario.minutesAgo}m`;
                  return (
                    <option key={usuario.id_usuario} value={usuario.id_usuario}>
                      {usuario.nombre} {usuario.apellido} - {usuario.role || usuario.rol} (activo {minutesText})
                    </option>
                  );
                })
              )}
            </select>
          )}
        </div>

        {/* Comentario opcional */}
        <div className="mb-3" style={{ marginTop: '1rem' }}>
          <label htmlFor="comentario" className="form-label">
            Contexto del problema (opcional):
          </label>
          <textarea
            id="comentario"
            className="form-control"
            rows="3"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="No encuentro la solución..."
            disabled={loading}
            maxLength={500}
          />
          <div className="form-text" style={{fontSize:'12px'}}>
            {comentario.length}/500 caracteres
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="d-flex justify-content-end gap-2">
          <button
            style={{
              fontSize:'18px', 
              backgroundColor: 'white', 
              textDecoration: 'none'
            }}
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            style={{
              fontSize:'18px', 
              backgroundColor: 'white', 
              textDecoration: 'none'
            }}
            type="submit"
            className="btn btn-primary"
            disabled={loading || !selectedUserId || loadingUsers}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                Reasignando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                Reasignar Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default ReassignTicketModal;
