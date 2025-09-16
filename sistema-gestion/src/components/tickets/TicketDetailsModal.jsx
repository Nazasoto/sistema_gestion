import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faUser, 
  faCalendarAlt, 
  faFlag, 
  faInfoCircle,
  faFileAlt,
  faHashtag,
  faClock,
  faEdit,
  faBuilding,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import TicketService from '../../services/ticket.service';
import moment from 'moment';
import './TicketDetailsModal.css';

const TicketDetailsModal = ({ show, onHide, ticketId, ticketData = null, isReportMode = false, ticketReport = null, onGeneratePDF = null }) => {
  const [ticket, setTicket] = useState(ticketData);
  const [loading, setLoading] = useState(!ticketData);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && ticketId) {
      // Siempre hacer fetch para obtener datos completos con JOINs
      fetchTicketDetails();
    } else if (show && ticketData && !ticketId) {
      // Solo usar ticketData si no hay ticketId disponible
      // console.log('TicketDetailsModal - Usando datos recibidos (sin ticketId):', ticketData);
      setTicket(ticketData);
      setLoading(false);
    }
  }, [show, ticketId, ticketData]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await TicketService.getTicketById(ticketId);
      // console.log('TicketDetailsModal - Datos obtenidos por getTicketById:', response);
      // console.log('TicketDetailsModal - Campos de creador desde API:', {
      //   nombre_creador: response.nombre_creador,
      //   apellido_creador: response.apellido_creador,
      //   numero_sucursal_creador: response.numero_sucursal_creador,
      //   nombre_sucursal_creador: response.nombre_sucursal_creador
      // });
      setTicket(response);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      setError('Error al cargar los detalles del ticket');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No disponible';
    try {
      // Since dates are now stored as strings in Argentina timezone,
      // parse them directly without timezone conversion
      const fechaMoment = moment(fecha, 'YYYY-MM-DD HH:mm:ss');
      return fechaMoment.format('DD/MM/YYYY [a las] HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  const getEstadoBadge = (estado) => {
    const estadoConfig = {
      'nuevo': { bg: 'primary', text: 'Nuevo' },
      'en_progreso': { bg: 'warning', text: 'En Progreso' },
      'resuelto': { bg: 'success', text: 'Resuelto' },
      'cerrado': { bg: 'secondary', text: 'Cerrado' },
      'cancelado': { bg: 'danger', text: 'Cancelado' },
      'pendiente': { bg: 'warning', text: 'Pendiente' }
    };
    
    const config = estadoConfig[estado] || { bg: 'secondary', text: estado };
    return <span className={`badge bg-${config.bg}`}>{config.text}</span>;
  };

  const getPrioridadBadge = (prioridad) => {
    const prioridadConfig = {
      'alta': { bg: 'danger', text: 'Alta' },
      'media': { bg: 'warning', text: 'Media' },
      'baja': { bg: 'info', text: 'Baja' }
    };
    
    const config = prioridadConfig[prioridad] || { bg: 'secondary', text: prioridad };
    return <span className={`badge bg-${config.bg}`}>{config.text}</span>;
  };

  const renderTicketDetails = () => {
    if (loading) {
      return (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando detalles del ticket...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-danger">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          {error}
        </div>
      );
    }

    if (!ticket) {
      return (
        <div className="alert alert-warning">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          No se encontraron detalles del ticket
        </div>
      );
    }

    return (
      <div className="ticket-details">
        {/* Header del Ticket */}
        <div className="ticket-header" style={{marginTop: '1rem'}}>
          <div className="ticket-id">
            <FontAwesomeIcon icon={faHashtag} className="me-2" />
            {isReportMode ? 'Informe del Ticket' : 'Numero de Ticket'} #{ticket.id}
          </div>
          <div className="ticket-badges" style={{marginTop: '1.1rem'}}>
            {getEstadoBadge(ticket.estado)}
            {getPrioridadBadge(ticket.prioridad || ticket.urgencia)}
          </div>
          <div className="ticket-date">
            Creado el {formatearFecha(ticket.fecha_creacion || ticket.fechaCreacion)}
          </div>
        </div>

        {/* Título y Descripción */}
        <div className="ticket-main-content">
          <div className="ticket-title">{ticket.titulo || ticket.asunto || 'Sin título'}</div>
          <div className="ticket-description">
            {ticket.descripcion || 'Sin descripción'}
          </div>
          
          {/* Usuario Asignado y sus Observaciones */}
        </div>

        {/* Información del Usuario */}
        <div className="user-info-grid">
          <div className="user-info-card">
            <FontAwesomeIcon icon={faUser} className="user-info-icon text-primary" />
            <div className="user-info-title">Creado por</div>
            <div className="user-info-name">
              {ticket.nombre_creador && ticket.apellido_creador 
                ? `${ticket.nombre_creador} ${ticket.apellido_creador}`
                : ticket.usuario?.nombre || ticket.creador?.nombre || ticket.usuario_creador || 'Usuario desconocido'
              }
            </div>
            {(ticket.email_creador || ticket.usuario?.email || ticket.creador?.email) && (
              <div className="user-info-email">{ticket.email_creador || ticket.usuario?.email || ticket.creador?.email}</div>
            )}
          </div>
          <div className="user-info-card">
            <FontAwesomeIcon icon={faBuilding} className="user-info-icon text-success" />
            <div className="user-info-title">Sucursal</div>
            <div className="user-info-name">
              {ticket.numero_sucursal_creador && ticket.nombre_sucursal_creador
                ? `Sucursal ${ticket.numero_sucursal_creador} - ${ticket.nombre_sucursal_creador}`
                : ticket.usuario?.sucursal ? `Sucursal ${ticket.usuario.sucursal}` : ticket.sucursal_creador || ticket.creador?.sucursal || ticket.sucursal || 'Central'
              }
            </div>
            {(ticket.localidad_sucursal_creador && ticket.provincia_sucursal_creador) && (
              <div className="user-info-email">
                {ticket.localidad_sucursal_creador}, {ticket.provincia_sucursal_creador}
              </div>
            )}
          </div>
        </div>

        {/* Asignación */}
        {(() => {
          // console.log('DEBUG ASIGNACION:', {
          //   asignadoA: ticket.asignadoA,
          //   asignado: ticket.asignado,
          //   usuario_asignado: ticket.usuario_asignado,
          //   nombre_asignado: ticket.nombre_asignado,
          //   email_asignado: ticket.email_asignado
          // });
          return null;
        })()}
        {(ticket.asignadoA && (ticket.asignado || ticket.nombre_asignado)) && (
          <div className="assignment-card">
            <FontAwesomeIcon icon={faUser} className="user-info-icon text-info" />
            <div className="user-info-title">Asignado a</div>
            <div className="user-info-name">
              {ticket.asignado ? ticket.asignado.nombre : ticket.nombre_asignado}
            </div>
            {(ticket.asignado?.email || ticket.email_asignado) && (
              <div className="user-info-email">{ticket.asignado?.email || ticket.email_asignado}</div>
            )}
          </div>
        )}
        {!ticket.asignadoA && (
          <div className="assignment-card">
            <FontAwesomeIcon icon={faExclamationTriangle} className="user-info-icon text-warning" />
            <div className="user-info-title">Estado de Asignación</div>
            <div className="user-info-name text-muted">Sin asignar</div>
          </div>
        )}

        {/* Categoría */}
        {ticket.categoria && (
          <div className="category-section">
            <h6 className="user-info-title mb-3">
              <FontAwesomeIcon icon={faFlag} className="me-2" />
              Categoría
            </h6>
            <span className="badge bg-secondary category-badge">{ticket.categoria}</span>
          </div>
        )}

        {/* Fechas */}
        <div className="dates-grid">
          <div className="date-card">
            <FontAwesomeIcon icon={faCalendarAlt} className="user-info-icon text-warning" />
            <div className="user-info-title">Fecha de Creación</div>
            <div className="user-info-name">
              {formatearFecha(ticket.fecha_creacion || ticket.fechaCreacion)}
            </div>
          </div>
          
          {ticket.fecha_tomado && (
            <div className="date-card">
              <FontAwesomeIcon icon={faUser} className="user-info-icon text-info" />
              <div className="user-info-title">Fecha Tomado</div>
              <div className="user-info-name">
                {formatearFecha(ticket.fecha_tomado)}
              </div>
            </div>
          )}
          
          {ticket.fecha_resuelto && (
            <div className="date-card">
              <FontAwesomeIcon icon={faCalendarAlt} className="user-info-icon text-success" />
              <div className="user-info-title">Fecha Resuelto</div>
              <div className="user-info-name">
                {formatearFecha(ticket.fecha_resuelto)}
              </div>
            </div>
          )}
          
          {ticket.fecha_cierre && (
            <div className="date-card">
              <FontAwesomeIcon icon={faClock} className="user-info-icon text-dark" />
              <div className="user-info-title">Fecha Cierre</div>
              <div className="user-info-name">
                {formatearFecha(ticket.fecha_cierre)}
              </div>
            </div>
          )}
          
          <div className="date-card">
            <FontAwesomeIcon icon={faClock} className="user-info-icon text-secondary" />
            <div className="user-info-title">Última Actualización</div>
            <div className="user-info-name">
              {(ticket.estado === 'nuevo' || !ticket.fecha_actualizacion && !ticket.fechaActualizacion) 
                ? <span className="text-muted">⏳ Esperando cambios</span>
                : formatearFecha(ticket.fecha_actualizacion || ticket.fechaActualizacion)
              }
            </div>
          </div>
        </div>

        {/* Archivos adjuntos */}
        {ticket.archivos && ticket.archivos.length > 0 && (
          <div className="files-section">
            <h6 className="user-info-title mb-3">
              <FontAwesomeIcon icon={faFileAlt} className="me-2" />
              Archivos Adjuntos
            </h6>
            <div className="files-grid">
              {ticket.archivos.map((archivo, index) => (
                <a 
                  key={index}
                  href={archivo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm file-button"
                >
                  <FontAwesomeIcon icon={faFileAlt} className="me-1" />
                  {archivo.nombre}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comentarios adicionales */}
        {ticket.comentarios && (
          <div className="comments-section">
            <h6 className="user-info-title mb-3">
              <FontAwesomeIcon icon={faEdit} className="me-2" />
              Comentarios
            </h6>
            <div className="card comments-card">
              <div className="card-body">
                <p className="mb-0 comments-text">
                  {ticket.comentarios}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!show) return null;

  const modalContent = (
    <div className="ticket-modal-overlay" onClick={onHide}>
      <div className="ticket-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-modal-header">
          <button type="button" className="ticket-modal-close" style={{fontSize: '1.5rem'}} onClick={onHide}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="ticket-modal-body">
          {renderTicketDetails()}
        </div>
        <div className="ticket-modal-footer">
          {isReportMode && onGeneratePDF && (
            <button type="button" className="btn btn-primary me-2" onClick={onGeneratePDF}>
              <FontAwesomeIcon icon={faFileAlt} className="me-2" />
              Generar PDF
            </button>
          )}
          <button type="button" className="btn btn-outline-secondary close-button" onClick={onHide}>
            <FontAwesomeIcon icon={faTimes} className="me-2" />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TicketDetailsModal;
