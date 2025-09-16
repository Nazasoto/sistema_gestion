import React, { useState, useEffect } from 'react';
import TicketService from '../../services/ticket.service';
import authService from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';
import './TicketsList.css';

const TicketsList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  // Obtener los tickets al cargar el componente
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let data;
        if (currentUser) {
          // console.log('Obteniendo tickets para el usuario:', currentUser.id);
          data = await TicketService.getTicketsByUser(currentUser.id);
        } else {
          // console.log('No hay usuario autenticado, obteniendo todos los tickets');
          data = await TicketService.getAllTickets();
        }
        
        // console.log('Tickets recibidos:', data);
        
        if (data && Array.isArray(data)) {
          // Ordenar por fecha de creación (más recientes primero)
          const sortedTickets = [...data].sort((a, b) => 
            new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
          );
          setTickets(sortedTickets);
        } else {
          console.error('Formato de datos inesperado:', data);
          setError('Formato de datos inesperado al cargar los tickets.');
          setTickets([]);
        }
      } catch (err) {
        console.error('Error al cargar los tickets:', err);
        setError('Error al cargar los tickets. Por favor, intente nuevamente.');
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [currentUser?.id]); // Se vuelve a ejecutar cuando cambia el ID del usuario

  // Función para obtener la clase CSS según el estado del ticket
  const getStatusClass = (estado) => {
    switch (estado.toLowerCase()) {
      case 'abierto':
        return 'status-open';
      case 'en_progreso':
        return 'status-in-progress';
      case 'cerrado':
        return 'status-closed';
      default:
        return '';
    }
  };

  // Función para obtener la clase CSS según la urgencia
  const getUrgencyClass = (urgencia) => {
    switch (urgencia.toLowerCase()) {
      case 'baja':
        return 'urgency-low';
      case 'media':
        return 'urgency-medium';
      case 'alta':
        return 'urgency-high';
      case 'urgente':
        return 'urgency-critical';
      default:
        return '';
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('es-AR', options);
  };

  return (
    <div className="tickets-container">
      <div className="tickets-header">
        <h2>Mis Tickets</h2>
        <button 
          className="btn-new-ticket"
          onClick={() => navigate('/nuevo-ticket')}
        >
          Nuevo Ticket
        </button>
      </div>

      {loading ? (
        <div className="loading">Cargando tickets...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : tickets.length === 0 ? (
        <div className="no-tickets">No hay tickets para mostrar.</div>
      ) : (
        <div className="tickets-list">
          <div className="tickets-list-header">
            <div className="header-item">ID</div>
            <div className="header-item">Título</div>
            <div className="header-item">Estado</div>
            <div className="header-item">Urgencia</div>
            <div className="header-item">Fecha de creación</div>
            <div className="header-item">Acciones</div>
          </div>
          
          {tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-item">
              <div className="ticket-cell">#{ticket.id}</div>
              <div className="ticket-cell">{ticket.titulo}</div>
              <div className="ticket-cell">
                <span className={`status-badge ${getStatusClass(ticket.estado)}`}>
                  {ticket.estado.replace('_', ' ')}
                </span>
              </div>
              <div className="ticket-cell">
                <span className={`urgency-badge ${getUrgencyClass(ticket.urgencia)}`}>
                  {ticket.urgencia}
                </span>
              </div>
              <div className="ticket-cell">{formatDate(ticket.fechaCreacion)}</div>
              <div className="ticket-cell">
                <button 
                  className="btn-view"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  Ver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketsList;
