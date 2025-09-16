import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';
import { formatearFecha as formatearFechaUtil } from '../../../utils/dateUtils';
import { 
  faSearch, 
  faPlus, 
  faSpinner, 
  faExclamationCircle,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faInfoCircle,
  faCalendarAlt,
  faEye,
  faFilePdf,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import TicketService from '../../../services/ticket.service';
import AuthService from '../../../services/auth.service';
import TicketDetailsModal from '../../../components/tickets/TicketDetailsModal';
import './historial.css';

const HistorialSucursal = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [filtroUrgencia, setFiltroUrgencia] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [ticketToCancelId, setTicketToCancelId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const cargarTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar tickets del usuario
        const usuario = AuthService.getCurrentUser();
        
        // Si el usuario no existe o no tiene id, redirigir a la página de login
        if (!usuario || !usuario.id) {
          setError('No se pudo cargar la información del usuario. Por favor, inicie sesión nuevamente.');
          setLoading(false);
          return;
        }

        const tickets = await TicketService.getTicketsByUser(usuario.id); 
        
        // Si la respuesta no es un array de tickets, mostrar error
        if (!Array.isArray(tickets)) {
          console.error('La respuesta no es un array de tickets:', tickets);
          setError('Error al procesar los tickets. Formato de datos incorrecto.');
          setTickets([]);
          return;
        }
        
        
        // Ordenar por fecha de creación (más recientes primero)
        const ticketsOrdenados = [...tickets].sort((a, b) => {
          const fechaA = new Date(a.fechaCreacion || a.fecha_creacion || 0);
          const fechaB = new Date(b.fechaCreacion || b.fecha_creacion || 0);
          return fechaB - fechaA;
        });
        
        setTickets(ticketsOrdenados);
      } catch (err) {
        console.error('Error al cargar los tickets:', err);
        setError(`Error al cargar el historial de tickets: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    cargarTickets();
  }, []);

  // Filtrar tickets según el estado seleccionado, la búsqueda, la fecha y la urgencia
  const filtrarTickets = () => {
    return tickets.filter(ticket => {
      // Excluir tickets cancelados automáticamente para usuarios de sucursal
      if (ticket.estado.toLowerCase() === 'cancelado') {
        return false;
      }
      
      const coincideEstado = filtro === 'todos' || ticket.estado.toLowerCase() === filtro.toLowerCase();
      const coincideUrgencia = filtroUrgencia === 'todas' || ticket.prioridad?.toLowerCase() === filtroUrgencia.toLowerCase();
      const coincideBusqueda = ticket.titulo.toLowerCase().includes(busqueda.toLowerCase()) || 
                             (ticket.descripcion && ticket.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
      
      // Filtro por fecha
      let coincideFecha = true;
      if (fechaFiltro) {
        const fechaTicket = new Date(ticket.fecha_creacion || ticket.fechaCreacion);
        const fechaSeleccionada = new Date(fechaFiltro);
        
        // Comparar solo la fecha (sin hora)
        const fechaTicketStr = fechaTicket.toISOString().split('T')[0];
        const fechaSeleccionadaStr = fechaSeleccionada.toISOString().split('T')[0];
        coincideFecha = fechaTicketStr === fechaSeleccionadaStr;
      }
      
      return coincideEstado && coincideUrgencia && (busqueda === '' || coincideBusqueda) && coincideFecha;
    });
  };

  // Volver a la pagina anterior  
  const handleVolver = () => {
    window.history.back();
  }

  // Filtrar los tickets por día
  const filtrarTicketsPorDia = () => {
    return tickets.filter(ticket => {
      const fechaTicket = new Date(ticket.fecha_creacion);
      const fechaActual = new Date();
      return fechaTicket.getDate() === fechaActual.getDate() &&
             fechaTicket.getMonth() === fechaActual.getMonth() &&
             fechaTicket.getFullYear() === fechaActual.getFullYear();
    });

  }

  const getEstadoBadge = (estado) => {
    const iconos = {
      abierto: <FontAwesomeIcon icon={faClock} className="me-1" />,
      en_progreso: <FontAwesomeIcon icon={faSpinner} className="me-1" spin />,
      cerrado: <FontAwesomeIcon icon={faCheckCircle} className="me-1" />,
      cancelado: <FontAwesomeIcon icon={faTimesCircle} className="me-1" />
    };

    const clases = {
      abierto: 'bg-warning text-dark',
      en_progreso: 'bg-info',
      cerrado: 'bg-success',
      cancelado: 'bg-danger'
    };

    return (
      <span className={`badge ${clases[estado] || 'bg-secondary'}`}>
        {iconos[estado]}
        {estado.replace('_', ' ')}
      </span>
    );
  };

  const formatearFecha = (fechaInput) => {
    if (!fechaInput) return 'N/A';
    
    try {
      const fechaUTC = parseISO(fechaInput);
      const fechaArgentina = toZonedTime(fechaUTC, 'America/Argentina/Buenos_Aires');
      return format(fechaArgentina, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha inválida';
    }
  };

  const handleVerDetalles = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedTicket(null);
  };

  // Función para generar PDF del ticket (reutilizada de soporte)
  const handleGenerarPDF = async (ticket) => {
    if (!ticket) {
      alert('No hay ticket seleccionado para generar el PDF');
      return;
    }

    try {
      // Obtener datos completos del ticket con JOINs
      const ticketCompleto = await TicketService.getTicketById(ticket.id);

      if (!ticketCompleto) {
        alert('Error al obtener los datos completos del ticket');
        return;
      }

      // Crear el contenido (HTML) del informe // Si se desea hacer un cambio del informe, se debe modificar el archivo de soporte tambien
      const printContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Informe Ticket #${ticket.id}</title>
          <style>
            @media print {
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; margin-bottom: 8px; }
            .info-grid { gap: 10px; }
            .timeline-container { max-height: 200px; overflow: hidden; }
            .no-print { display: none !important; }
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.3; 
              color: #2c3e50; 
              margin: 0; 
              padding: 8px; 
              background: #ffffff;
              font-size: 11px;
            }
            
            .header { 
              background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
              color: white;
              text-align: center; 
              margin: -8px -8px 12px -8px; 
              padding: 15px 12px; 
              box-shadow: 0 1px 5px rgba(0,0,0,0.1);
            }
            .header h1 { 
              margin: 0; 
              font-size: 18px; 
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .header h2 { 
              margin: 4px 0 0 0; 
              font-size: 13px; 
              opacity: 0.9;
              font-weight: 400;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 12px;
            }
            
            .section { 
              margin-bottom: 10px; 
              background: #ffffff;
              border: 1px solid #e8ecef;
              border-radius: 4px;
              overflow: hidden;
            }
            .section h3 { 
              background: #f8f9fa;
              color: #495057; 
              margin: 0;
              padding: 8px 12px;
              font-size: 11px;
              font-weight: 600;
              border-bottom: 1px solid #e8ecef;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            
            .info-table { 
              width: 100%; 
              border-collapse: collapse; 
            }
            .info-table td { 
              padding: 6px 10px; 
              border-bottom: 1px solid #f1f3f4; 
              font-size: 10px;
              line-height: 1.2;
            }
            .info-table td:first-child { 
              font-weight: 600; 
              width: 35%; 
              background-color: #fafbfc; 
              color: #495057;
            }
            .info-table td:last-child {
              color: #2c3e50;
            }
            .info-table tr:last-child td {
              border-bottom: none;
            }
            
            .description-box { 
              background-color: #f8f9fa; 
              padding: 10px; 
              margin: 0;
              border-top: 1px solid #e8ecef;
              font-size: 10px;
              line-height: 1.3;
              max-height: 60px;
              overflow: hidden;
            }
            
            .status-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .status-nuevo { background: #e3f2fd; color: #1565c0; }
            .status-en_progreso { background: #fff3e0; color: #ef6c00; }
            .status-resuelto { background: #e8f5e8; color: #2e7d32; }
            .status-cerrado { background: #f3e5f5; color: #7b1fa2; }
            .status-cancelado { background: #ffebee; color: #c62828; }
            
            .priority-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .priority-urgente { background: #ffebee; color: #c62828; }
            .priority-alta { background: #fff3e0; color: #ef6c00; }
            .priority-media { background: #e3f2fd; color: #1565c0; }
            .priority-baja { background: #e8f5e8; color: #2e7d32; }
            
            .footer { 
              margin-top: 15px; 
              text-align: center; 
              color: #6c757d; 
              font-size: 9px; 
              border-top: 1px solid #e8ecef; 
              padding-top: 8px; 
              background: #f8f9fa;
              margin-left: -8px;
              margin-right: -8px;
              padding-left: 8px;
              padding-right: 8px;
            }
            
            .print-button { 
              background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
              color: white; 
              padding: 12px 24px; 
              border: none; 
              border-radius: 6px; 
              cursor: pointer; 
              margin: 15px 10px; 
              display: inline-block;
              font-size: 13px;
              font-weight: 500;
              transition: all 0.3s ease;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .print-button:hover { 
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            .print-button.secondary {
              background: #6c757d;
            }
            .print-button.secondary:hover {
              background: #5a6268;
            }
            
            .button-container {
              text-align: center;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 INFORME DE TICKET #${ticket.id}</h1>
            <p class="subtitle">Sistema de Gestión de Tickets</p>
          </div>
          
          <div class="section">
            <h2>📝 Información del Ticket</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>🎫 ID del Ticket:</strong> #${ticketCompleto.id}
              </div>
              <div class="info-item">
                <strong>📌 Título:</strong> ${ticketCompleto.titulo || 'Sin título'}
              </div>
              <div class="info-item">
                <strong>📄 Descripción:</strong> ${ticketCompleto.descripcion || 'Sin descripción'}
              </div>
              <div class="info-item">
                <strong>⚠️ Prioridad:</strong> <span class="priority-${ticketCompleto.prioridad}">${ticketCompleto.prioridad?.toUpperCase() || 'SIN PRIORIDAD'}</span>
              </div>
              <div class="info-item">
                <strong>📂 Categoría:</strong> ${ticketCompleto.categoria || 'Sin categoría'}
              </div>
              <div class="info-item">
                <strong>🏢 Sucursal:</strong> ${ticketCompleto.sucursal || 'Sin sucursal'}
              </div>
              <div class="info-item">
                <strong>📅 Fecha de Creación:</strong> ${(ticketCompleto.fechaCreacion || ticketCompleto.fecha_creacion) ? formatearFechaUtil(ticketCompleto.fechaCreacion || ticketCompleto.fecha_creacion) : 'Fecha no disponible'}
              </div>
              <div class="info-item">
                <strong>🔄 Última Actualización:</strong> ${
                  // Solo mostrar fecha si el ticket ha sido tomado/procesado (no es estado 'nuevo')
                  ticketCompleto.estado !== 'nuevo' && (ticketCompleto.fechaActualizacion || ticketCompleto.fecha_actualizacion)
                    ? formatearFechaUtil(ticketCompleto.fechaActualizacion || ticketCompleto.fecha_actualizacion)
                    : '⏳ Esperando cambios'
                }
              </div>
              <div class="info-item">
                <strong>📊 Estado Actual:</strong> <span class="status-badge status-${ticketCompleto.estado}">${ticketCompleto.estado?.toUpperCase() || 'SIN ESTADO'}</span>
              </div>
            </div>
          </div>
          
            
            <div class="section">
              <div class="description-box" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                <strong>👤 Usuario Solicitante</strong><br>
                <strong>Nombre Completo:</strong> ${
                  ticketCompleto.nombre_creador && ticketCompleto.apellido_creador
                    ? `${ticketCompleto.nombre_creador} ${ticketCompleto.apellido_creador}`
                    : ticketCompleto.usuario?.nombre || 'No proporcionado'
                }<br>
                <strong>Correo Electrónico:</strong> ${ticketCompleto.email_creador || ticketCompleto.usuario?.email || 'No proporcionado'}<br>
                <strong>Sucursal:</strong> ${
                  ticketCompleto.numero_sucursal_creador && ticketCompleto.nombre_sucursal_creador
                    ? `Sucursal ${ticketCompleto.numero_sucursal_creador} - ${ticketCompleto.nombre_sucursal_creador}`
                    : ticketCompleto.usuario?.sucursal ? `Sucursal ${ticketCompleto.usuario.sucursal}` : ticketCompleto.sucursal || 'No especificada'
                }${(ticketCompleto.localidad_sucursal_creador && ticketCompleto.provincia_sucursal_creador) ? 
                  `<br><strong>Ubicación:</strong> ${ticketCompleto.localidad_sucursal_creador}, ${ticketCompleto.provincia_sucursal_creador}` : ''
                }
              </div>
            </div>
          
          ${(ticketCompleto.usuario_asignado_id || ticketCompleto.asignadoA || ticketCompleto.nombre_asignado) ? `
          <div class="section">
            <div class="description-box" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
              <strong>👤 Usuario asignado</strong><br>
              <strong>Técnico:</strong> ${ticketCompleto.nombre_asignado || 'No especificado'}${ticketCompleto.apellido_asignado ? ` ${ticketCompleto.apellido_asignado}` : ''}<br>
              ${ticketCompleto.email_asignado ? `<strong>Email:</strong> ${ticketCompleto.email_asignado}` : ''}
            
              
              </div>
                <div class="section">
            <div class="description-box">
              <strong>📄 Observaciones</strong><br>
              ${ticketCompleto.descripcion || 'No se proporcionó descripción del problema'}
            </div>
          </div>
          </div>
          ` : ''}
          
          </div>
          
          <div class="footer">
            <p><strong>Informe generado:</strong> ${formatearFechaUtil(new Date().toISOString())}</p>
            <p><strong>PALMARES / COLLINS S.A.</strong> | Departamento de Soporte Técnico</p>
            <p style="font-size: 10px; margin-top: 8px; opacity: 0.7;">Este documento contiene información confidencial de la empresa</p>
          </div>
          
          <div class="button-container no-print">
            <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
            <button class="print-button secondary" onclick="window.close()">❌ Cerrar Ventana</button>
          </div>
        </body>
        </html>
      `;
      
      // Abrir nueva ventana con el contenido
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Enfocar la ventana para que aparezca al frente
      printWindow.focus();
      
      alert(`Informe del ticket #${ticket.id} abierto en nueva ventana`);
      
    } catch (error) {
      console.error('Error al generar el informe del ticket:', error);
      alert('Error al generar el informe del ticket');
    }
  };

  const handleCancelarTicket = async (ticketId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Querés borrar este ticket? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, borrar ticket',
      cancelButtonText: 'No, mantener ticket',
      reverseButtons: true,
      focusCancel: true
    });

    if (result.isConfirmed) {
      try {
        setCancelLoading(true);
        await TicketService.updateTicketStatus(ticketId, 'cancelado');
        
        // Actualizar la lista de tickets
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket.id === ticketId 
              ? { ...ticket, estado: 'cancelado' }
              : ticket
          )
        );

        // Mostrar confirmación de éxito
        await Swal.fire({
          title: '¡Ticket borrado!',
          text: 'El ticket ha sido borrado exitosamente.',
          icon: 'success',
          confirmButtonColor: '#28a745',
          timer: 3000,
          timerProgressBar: true
        });

      } catch (error) {
        console.error('Error al cancelar ticket:', error);
        
        // Mostrar error
        await Swal.fire({
          title: 'Error',
          text: error.message || 'No se pudo borrar el ticket. Intentá nuevamente.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      } finally {
        setCancelLoading(false);
      }
    }
  };

  // Función para determinar si un ticket puede ser cancelado
  const puedeSerCancelado = (ticket) => {
    // Solo se pueden borrar tickets que están en estado 'nuevo' (no asignados)
    return ticket.estado === 'nuevo';
  };

  const ticketsFiltrados = filtrarTickets();

  if (loading) {
    return (
      <div className="historial-container">
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" />
          <p className="mt-3">Cargando historial de tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historial-container">
        <div className="empty-state">
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p className="text-danger">{error}</p>
          <button 
            className="btn btn-primary mt-3"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="historial-container">
      <div className="historial-header">

      <div className="back-button-container">
          <button 
            style={{textDecoration: 'none', fontSize: '30px', border: 'none'}}
            onClick={() => navigate('/dashboard')}
            className="back-button"
          > 
            <i className="fas fa-arrow-left me-2" style={{fontSize: '30px'}}></i>
            <span>VOLVER</span>
          </button>
        </div>


        <h1>Historial de Tickets</h1>
        <Link to="/tickets/nuevo" className="btn btn-new-ticket">
          <FontAwesomeIcon icon={faPlus} />
          Nuevo Ticket
        </Link>
      </div>

      <div className="historial-card">
        <div className="historial-card-header">
          <div className="filters-container">
            <div className="filter-group">
              <label htmlFor="filtro-estado">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Estado:
              </label>
              <select 
                id="filtro-estado"
                className="form-select filter-select"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="nuevo">Nuevos</option>
                <option value="en_progreso">En progreso</option>
                <option value="resuelto">Resueltos</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="filtro-urgencia">
                <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
                Urgencia:
              </label>
              <select 
                id="filtro-urgencia"
                className="form-select filter-select"
                value={filtroUrgencia}
                onChange={(e) => setFiltroUrgencia(e.target.value)}
              >
                <option value="todas">Todas las urgencias</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>
          
          <div className="search-and-date-container" style={{display:'flex', alignItems:'right', justifyContent:'end', gap:60}}>
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por título o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="date-filter-box">
              <FontAwesomeIcon icon={faCalendarAlt} className="date-icon" />
              <input
                type="date"
                className="form-control"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                title="Filtrar por fecha de creación"
              />
              {fechaFiltro && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary ms-2"
                  onClick={() => setFechaFiltro('')}
                  title="Limpiar filtro de fecha"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="table-container">
         
          {ticketsFiltrados.length === 0 ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faInfoCircle} size="3x" />
              <p>No se encontraron tickets</p>
              <p className="text-muted">
                {filtro !== 'todos' || busqueda ? 'Prueba con otros filtros o términos de búsqueda.' : 'Aún no has creado ningún ticket.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Fecha de creación</th>
                    <th>Última actualización</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFiltrados.map((ticket) => {
                    return (
                    <tr key={ticket.id}>
                      <td>#{ticket.id}</td>
                      <td>
                        <div className="fw-semibold">{ticket.titulo}</div>
                        <small className="text-muted">
                          {ticket.descripcion && ticket.descripcion.length > 50
                            ? `${ticket.descripcion.substring(0, 50)}...`
                            : ticket.descripcion}
                        </small>
                      </td>
                      <td>{getEstadoBadge(ticket.estado)}</td>
                      <td>
                        <span className={`badge bg-${ticket.prioridad === 'alta' ? 'danger' : ticket.prioridad === 'media' ? 'warning' : 'info'}`}>
                          {ticket.prioridad}
                        </span>
                      </td>
                      <td>{formatearFechaUtil(ticket.fecha_creacion || ticket.fechaCreacion)}</td>
                      <td>{
                        ticket.estado !== 'nuevo' && (ticket.fecha_actualizacion || ticket.fechaActualizacion)
                          ? formatearFechaUtil(ticket.fecha_actualizacion || ticket.fechaActualizacion)
                          : '⏳ Esperando cambios'
                      }</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button 
                            style={{textDecoration: 'none'}} 
                            onClick={() => handleVerDetalles(ticket)}
                            className="btn btn-sm btn-outline-primary"
                            title="Ver detalles"
                          >
                            <FontAwesomeIcon icon={faEye} />
                            <span className="d-none d-md-inline ms-1">Ver Detalles</span>
                          </button>
                          
                          {/* Botón Cancelar - Solo para tickets que pueden ser cancelados */}
                          {puedeSerCancelado(ticket) && (
                            <button
                              style={{textDecoration: 'none'}} 
                              onClick={() => handleCancelarTicket(ticket.id)}
                              className="btn btn-sm btn-outline-danger"
                              title="Cancelar ticket"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                              <span className="d-none d-md-inline ms-1">Borrar ticket</span>
                            </button>
                          )}
                          
                          {/* Solo mostrar PDF si el ticket ha sido tomado/actualizado */}
                          {ticket.estado !== 'nuevo' && (
                            <button 
                              style={{textDecoration: 'none'}} 
                              onClick={() => handleGenerarPDF(ticket)}
                              className="btn btn-sm btn-outline-secondary"
                              title="Generar PDF"
                            >
                              <FontAwesomeIcon icon={faFilePdf} />
                              <span className="d-none d-md-inline ms-1">PDF</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles del ticket */}
      <TicketDetailsModal
        show={showDetailsModal}
        onHide={handleCloseModal}
        ticketId={selectedTicket?.id}
        ticketData={selectedTicket}
      />

    </div>
  );
};

export default HistorialSucursal;
