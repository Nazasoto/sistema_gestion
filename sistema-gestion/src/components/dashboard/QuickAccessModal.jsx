import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHandPaper,
  faEye,
  faClock,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faUser,
  faBuilding,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import CustomModal from '../common/CustomModal';
import TicketDetailsModal from '../tickets/TicketDetailsModal';
import { formatearFecha } from '../../utils/dateUtils';
import ticketService from '../../services/ticket.service';
import api from '../../services/api.service';
import './QuickAccessModal.css';

const QuickAccessModal = ({ 
  isOpen, 
  onClose, 
  cardType, 
  cardTitle,
  currentUser,
  onTicketUpdate,
  fechaSeleccionada = null
}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Cargar tickets según el tipo de card
  useEffect(() => {
    if (isOpen && cardType) {
      loadTickets();
    }
  }, [isOpen, cardType]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      // Usar el mismo endpoint que la bandeja
      const response = await api.get('/tickets/todos', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const allTickets = response.data || [];
      const filteredTickets = filterTicketsByType(allTickets, cardType);
      setTickets(filteredTickets);
    } catch (error) {
      console.error('Error cargando tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTicketsByType = (allTickets, type) => {
    // Función helper para filtrar por fecha
    const filtrarPorFecha = (tickets, campoFecha = 'fechaActualizacion') => {
      if (!fechaSeleccionada) {
        // Si no hay fecha seleccionada, usar hoy
        const hoy = new Date().toISOString().split('T')[0];
        return tickets.filter(ticket => {
          const fechaTicket = ticket[campoFecha];
          if (!fechaTicket) return false;
          const fechaTicketSolo = fechaTicket.split('T')[0];
          return fechaTicketSolo === hoy;
        });
      } else {
        // Usar fecha seleccionada
        return tickets.filter(ticket => {
          const fechaTicket = ticket[campoFecha];
          if (!fechaTicket) return false;
          const fechaTicketSolo = fechaTicket.split('T')[0];
          return fechaTicketSolo === fechaSeleccionada;
        });
      }
    };

    switch (type) {
      case 'nuevos':
        return allTickets.filter(t => t.estado === 'nuevo');
      case 'pendientes':
        return allTickets.filter(t => ['nuevo', 'pendiente'].includes(t.estado));
      case 'en_progreso':
        return allTickets.filter(t => 
          t.estado === 'en_progreso' && 
          t.usuario_asignado_id === currentUser?.id
        );
      case 'resueltos':
        // Filtrar por usuario Y por fecha de resolución
        const ticketsResueltosUsuario = allTickets.filter(t => 
          ['resuelto', 'cerrado'].includes(t.estado) && 
          t.usuario_asignado_id === currentUser?.id
        );
        return filtrarPorFecha(ticketsResueltosUsuario, 'fechaActualizacion');
      case 'cancelados':
        // Filtrar por estado cancelado Y por fecha de cancelación
        const ticketsCancelados = allTickets.filter(t => t.estado === 'cancelado');
        return filtrarPorFecha(ticketsCancelados, 'fechaActualizacion');
      default:
        return [];
    }
  };

  const handleTomarTicket = async (ticket) => {
    setActionLoading(prev => ({ ...prev, [ticket.id]: true }));
    
    try {
      await ticketService.updateTicketStatus(ticket.id, 'en_progreso');
      
      // Actualizar la lista local
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
      
      // Notificar al componente padre para actualizar las estadísticas
      if (onTicketUpdate) {
        onTicketUpdate();
      }
      
      showToast('Ticket tomado exitosamente', 'success');
    } catch (error) {
      console.error('Error al tomar ticket:', error);
      showToast('Error al tomar el ticket', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [ticket.id]: false }));
    }
  };

  const handleVerDetalles = (ticket) => {
    console.log('Ver detalles del ticket:', ticket);
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const showToast = (message, type) => {
    // Implementar notificación toast si es necesario
    console.log(`${type}: ${message}`);
  };

  const getPriorityIcon = (prioridad) => {
    switch (prioridad?.toLowerCase()) {
      case 'alta':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-danger" />;
      case 'media':
        return <FontAwesomeIcon icon={faClock} className="text-warning" />;
      case 'baja':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-success" />;
      default:
        return <FontAwesomeIcon icon={faClock} className="text-muted" />;
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'nuevo': 'badge bg-primary',
      'pendiente': 'badge bg-warning',
      'en_progreso': 'badge bg-info',
      'resuelto': 'badge bg-success',
      'cerrado': 'badge bg-secondary'
    };
    return badges[estado] || 'badge bg-secondary';
  };

  const canTakeTicket = (ticket) => {
    return ['nuevo', 'pendiente'].includes(ticket.estado);
  };

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        title={`${cardTitle} (${tickets.length})`}
        size="large"
      >
        <div className="quick-access-modal-content">
          {loading ? (
            <div className="text-center py-4">
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
              Cargando tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FontAwesomeIcon icon={faCheckCircle} size="2x" className="mb-3" />
              <p>No hay tickets en esta categoría</p>
            </div>
          ) : (
            <div className="tickets-list">
              {tickets.map(ticket => (
                <div key={ticket.id} className="ticket-card mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-2">
                        <span className={getEstadoBadge(ticket.estado)}>
                          {ticket.estado}
                        </span>
                        <span className="ms-2 me-2">#{ticket.id}</span>
                        {getPriorityIcon(ticket.prioridad)}
                        <span className="ms-1 small text-muted">
                          {ticket.prioridad || 'Media'}
                        </span>
                      </div>
                      
                      <h6 className="mb-2">{ticket.titulo || ticket.asunto}</h6>
                      
                      <div className="small text-muted mb-2">
                        <FontAwesomeIcon icon={faUser} className="me-1" />
                        {ticket.nombre_creador} {ticket.apellido_creador}
                        {ticket.nombre_sucursal_creador && (
                          <>
                            <FontAwesomeIcon icon={faBuilding} className="ms-2 me-1" />
                            {ticket.nombre_sucursal_creador}
                          </>
                        )}
                      </div>
                      
                      <div className="small text-muted">
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                        {formatearFecha(ticket.fechaCreacion)}
                      </div>
                    </div>
                    
                    <div className="d-flex flex-column gap-2">
                      <button
                        style={{ textDecoration: 'none' }}
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleVerDetalles(ticket)}
                      >
                        <FontAwesomeIcon icon={faEye} className="me-1" />
                        Ver
                      </button>
                      
                      {canTakeTicket(ticket) && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleTomarTicket(ticket)}
                          disabled={actionLoading[ticket.id]}
                        >
                          {actionLoading[ticket.id] ? (
                            <FontAwesomeIcon icon={faSpinner} spin className="me-1" />
                          ) : (
                            <FontAwesomeIcon icon={faHandPaper} className="me-1" />
                          )}
                          {ticket.estado === 'pendiente' ? 'Retomar' : 'Tomar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CustomModal>

      {/* Modal de detalles del ticket */}
      {showTicketDetails && selectedTicket && (
        <TicketDetailsModal
          show={showTicketDetails}
          onHide={() => {
            setShowTicketDetails(false);
            setSelectedTicket(null);
          }}
          ticketId={selectedTicket.id}
          ticketData={selectedTicket}
        />
      )}
    </>
  );
};

export default QuickAccessModal;
