import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInbox,
  faFileAlt,
  faEye,
  faEdit,
  faTrash,
  faClock,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faTimesCircle,
  faTimes,
  faFilePdf,
  faDownload,
  faSearch,
  faPlus,
  faFilter,
  faTag,
  faCalendarAlt,
  faExclamationTriangle,
  faUser,
  faEraser,
  faListAlt,
  faInfoCircle,
  faHandPaper,
  faExchangeAlt,
  faPaperPlane
} from '@fortawesome/free-solid-svg-icons';
import { formatearFecha } from '../../../utils/dateUtils';
import api from '../../../services/api.service';
import ticketService from '../../../services/ticket.service';
import PDFService from '../../../services/pdfService';
import TicketDetailsModal from '../../../components/tickets/TicketDetailsModal';
import ReassignTicketModal from '../../../components/tickets/ReassignTicketModal';
import StatusChangeModal from '../../../components/tickets/StatusChangeModal';
import './bandeja.css';
import './ticketDetails.css';

const BandejaPage = () => {
  // Estados principales
  const [tickets, setTickets] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [vistaActual, setVistaActual] = useState('bandeja');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  
  // Estados de modales simplificados
  const [modalState, setModalState] = useState({
    showDetails: false,
    showStatusChange: false,
    showCancel: false,
    showReassign: false,
    selectedTicket: null,
    newStatus: '',
    ticketToCancelId: null,
    loading: false
  });
  
  // Estado para notificaciones
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Estados posibles para los tickets
  const ESTADOS_TICKET = {
    NUEVO: 'nuevo',
    EN_PROGRESO: 'en_progreso',
    RESUELTO: 'resuelto',
    PENDIENTE: 'pendiente',
    CANCELADO: 'cancelado'
  };

  // Función para validar y formatear un ticket
  const validarYFormatearTicket = (ticket) => {
    if (!ticket || typeof ticket !== 'object') return null;
    
    return {
      id: ticket.id || Math.random().toString(36).substr(2, 9),
      titulo: String(ticket.titulo || 'Sin título').trim(),
      descripcion: String(ticket.descripcion || '').trim(),
      estado: String(ticket.estado || 'nuevo').toLowerCase(),
      prioridad: String(ticket.prioridad || 'media').toLowerCase(),
      categoria: String(ticket.categoria || 'general').trim(),
      sucursal: String(ticket.sucursal || '').trim(),
      fechaCreacion: ticket.fecha_creacion || ticket.fechaCreacion || new Date().toISOString(),
      fechaActualizacion: ticket.fecha_actualizacion || ticket.fechaActualizacion || ticket.fecha_creacion || ticket.fechaCreacion || new Date().toISOString(),
      usuario: ticket.usuario || {
        id: ticket.usuario_id || ticket.usuario_creador_id,
        nombre: String(ticket.nombre_creador || ticket.usuario_nombre || 'Usuario desconocido').trim(),
        email: String(ticket.email_creador || ticket.usuario_email || '').trim(),
        sucursal: String(ticket.sucursal_creador || ticket.usuario_sucursal || ticket.sucursal || '').trim()
      },
      // Preservar campos de asignación del backend
      usuario_asignado_id: ticket.usuario_asignado_id,
      usuario_reasignado: ticket.usuario_reasignado,
      fecha_reasignacion: ticket.fecha_reasignacion,
      asignadoA: ticket.asignadoA || (ticket.usuario_asignado_id ? {
        id: ticket.usuario_asignado_id,
        nombre: String(ticket.nombre_asignado || 'Sin asignar').trim(),
        email: String(ticket.email_asignado || '').trim(),
        sucursal: String(ticket.sucursal_asignado || '').trim()
      } : null)
    };
  };

  // Memoizar usuario actual para evitar múltiples llamadas a sessionStorage
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Memoizar permisos del usuario
  const userPermissions = useMemo(() => {
    const esSoporte = currentUser.role === 'soporte' || currentUser.role === 'supervisor';
    const esAdmin = currentUser.role === 'admin';
    return { esSoporte, esAdmin, userId: currentUser.id };
  }, [currentUser]);

  // Función para obtener los tickets (optimizada)
  const fetchTickets = useCallback(async () => {
    let isMounted = true;
    const controller = new AbortController();
    
    try {
      if (!currentUser?.token) {
        throw new Error('No se encontró la sesión del usuario');
      }
      
      const isSoporteOAdmin = userPermissions.esSoporte || userPermissions.esAdmin;
      const rutaTickets = isSoporteOAdmin ? '/tickets/todos' : '/tickets';
      
      const config = {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
      
      const response = await api.get(rutaTickets, config);
      
      if (!isMounted) return;
      
      if (!response?.data || !Array.isArray(response.data)) {
        throw new Error('Formato de respuesta inválido');
      }
      
      const ticketsProcesados = response.data
        .map(validarYFormatearTicket)
        .filter(Boolean);
      
      // Filtrar según la vista actual
      let filteredTickets;
      if (vistaActual === 'bandeja') {
        // Bandeja muestra tickets nuevos Y pendientes (disponibles para tomar)
        filteredTickets = ticketsProcesados.filter(t => 
          ['nuevo', 'pendiente'].includes(t.estado?.toLowerCase())
        );
        
        // Filtrar por prioridad en bandeja
        if (filtroPrioridad !== 'todos') {
          filteredTickets = filteredTickets.filter(t => 
            t.prioridad?.toLowerCase() === filtroPrioridad.toLowerCase()
          );
        }
      } else {
        let historialTickets = ticketsProcesados.filter(t => 
          ['en_progreso', 'resuelto', 'pendiente','cancelado'].includes(t.estado?.toLowerCase())
        );
        
        // Filtrar por estado
        if (filtro !== 'todos') {
          historialTickets = historialTickets.filter(t => t.estado?.toLowerCase() === filtro.toLowerCase());
        }
        
        // Filtrar por fecha
        if (filtroFecha !== 'todos') {
          const now = new Date();
          const filterDate = new Date();
          
          switch (filtroFecha) {
            case 'hoy':
              filterDate.setHours(0, 0, 0, 0);
              historialTickets = historialTickets.filter(t => {
                const ticketDate = new Date(t.fechaCreacion);
                return ticketDate >= filterDate;
              });
              break;
            case 'semana':
              filterDate.setDate(now.getDate() - 7);
              historialTickets = historialTickets.filter(t => {
                const ticketDate = new Date(t.fechaCreacion);
                return ticketDate >= filterDate;
              });
              break;
            case 'mes':
              filterDate.setMonth(now.getMonth() - 1);
              historialTickets = historialTickets.filter(t => {
                const ticketDate = new Date(t.fechaCreacion);
                return ticketDate >= filterDate;
              });
              break;
          }
        }
        
        // Filtrar por prioridad
        if (filtroPrioridad !== 'todos') {
          historialTickets = historialTickets.filter(t => 
            t.prioridad?.toLowerCase() === filtroPrioridad.toLowerCase()
          );
        }
        
        // Filtrar por técnico
        if (filtroTecnico !== 'todos') {
          historialTickets = historialTickets.filter(t => {
            const tecnico = t.asignadoA?.nombre || t.asignadoA || t.tecnico || '';
            return tecnico.toLowerCase().includes(filtroTecnico.toLowerCase());
          });
        }
        
        filteredTickets = historialTickets;
      }
      
      // Ordenar tickets según la vista actual
      const ticketsOrdenados = [...filteredTickets].sort((a, b) => {
        if (vistaActual === 'historial') {
          // En historial: ordenar por prioridad primero (urgente primero), luego por fecha
          const prioridadOrden = { 'alta': 3, 'media': 2, 'baja': 1 };
          const prioridadA = prioridadOrden[a.prioridad?.toLowerCase()] || 0;
          const prioridadB = prioridadOrden[b.prioridad?.toLowerCase()] || 0;
          
          // Si las prioridades son diferentes, ordenar por prioridad (alta primero)
          if (prioridadA !== prioridadB) {
            return prioridadB - prioridadA; // Esto pone alta (3) antes que media (2) y baja (1)
          }
          
          // Si tienen la misma prioridad, ordenar por fecha (más reciente primero)
          return new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0);
        } else {
          // En bandeja: ordenar solo por fecha (más reciente primero)
          return new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0);
        }
      });
      
      if (isMounted) {
        setTickets(ticketsOrdenados);
        setError(null);
      }
      
    } catch (error) {
      if (isMounted) {
        setError(`Error al cargar los tickets: ${error.message || 'Intente nuevamente'}`);
        setTickets([]);
      }
    } finally {
      if (isMounted) {
        setCargando(false);
      }
    }
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [vistaActual, filtro, filtroFecha, filtroPrioridad, filtroTecnico, currentUser, userPermissions]);

  // Obtener tickets al cargar el componente
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    
    const loadTickets = async () => {
      if (!isMounted) return;
      
      try {
        setCargando(true);
        setError('');
        await fetchTickets();
      } catch (error) {
        const errorMsg = vistaActual === 'bandeja' 
          ? 'No se pudieron cargar los tickets de la bandeja.'
          : 'No se pudo cargar el historial de tickets.';
        setError(errorMsg);
      } finally {
        if (isMounted) {
          setCargando(false);
        }
      }
    };
    
    loadTickets();
    
    // Sin actualización automática - solo manual
    
    return () => {
      isMounted = false;
    };
  }, [fetchTickets]);

  // Función para mostrar notificaciones
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  }, []);

  // Función para manejar el clic en el botón Tomar/Retomar (optimizada)
  const handleTomarClick = useCallback(async (ticket) => {
    try {
      if (!currentUser?.token || !currentUser?.id) {
        showToast('No se encontró la sesión del usuario', 'danger');
        return;
      }
      
      // Actualización optimista: remover el ticket inmediatamente de la vista
      setTickets(prevTickets => prevTickets.filter(t => t.id !== ticket.id));
      
      // Si es un ticket pendiente, primero cambiar estado a en_progreso
      if (ticket.estado === 'pendiente') {
        await ticketService.updateTicketStatus(ticket.id, 'en_progreso');
        showToast(`Ticket #${ticket.id} retomado exitosamente`, 'success');
      } else {
        // Para tickets nuevos, usar assignTicket que cambia a en_progreso automáticamente
        await ticketService.assignTicket(ticket.id, currentUser.id);
        showToast(`Ticket #${ticket.id} tomado exitosamente`, 'success');
      }
      
      // NO recargar todos los tickets - la actualización optimista ya se aplicó
      
    } catch (error) {
      console.error('Error al tomar/retomar ticket:', error);
      const accion = ticket.estado === 'pendiente' ? 'retomar' : 'tomar';
      showToast(`Error al ${accion} el ticket. Por favor intente nuevamente.`, 'danger');
      
      // En caso de error, recargar para restaurar el estado correcto
      await fetchTickets();
    }
  }, [currentUser, showToast, fetchTickets]);

  // Función para manejar modales (memoizada)
  const updateModalState = useCallback((updates) => {
    setModalState(prev => ({ ...prev, ...updates }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalState({
      showDetails: false,
      showStatusChange: false,
      showCancel: false,
      showReassign: false,
      selectedTicket: null,
      newStatus: '',
      ticketToCancelId: null,
      loading: false
    });
  }, []);

  // Función para cambiar estado de ticket (optimizada)
  const handleCambiarEstado = useCallback(async (nuevoEstado, comentario) => {
    if (!modalState.selectedTicket) return;
    
    try {
      if (!currentUser?.token) {
        throw new Error('No se encontró la sesión del usuario');
      }
      
      // Actualización optimista del estado local
      const ticketActualizado = {
        ...modalState.selectedTicket,
        estado: nuevoEstado,
        fechaActualizacion: new Date().toISOString()
      };
      
      setTickets(prevTickets => prevTickets.map(t => 
        t.id === modalState.selectedTicket.id ? ticketActualizado : t
      ));
      
      // Cerrar modal inmediatamente para mejor UX
      closeAllModals();
      
      // Hacer la petición al servidor en segundo plano
      await ticketService.updateTicketStatus(
        modalState.selectedTicket.id, 
        nuevoEstado,
        comentario
      );
      
      const mensajesEstado = {
        'resuelto': 'marcado como resuelto',
        'pendiente': 'marcado como pendiente',
        'cancelado': 'cancelado',
        'en_progreso': 'puesto en progreso'
      };
      
      const mensajeEstado = mensajesEstado[nuevoEstado] || `actualizado a "${nuevoEstado}"`;
      showToast(`Ticket #${modalState.selectedTicket.id} ${mensajeEstado}`, 'success');
      
    } catch (error) {
      console.error('Error al actualizar ticket:', error);
      
      // En caso de error, revertir el cambio optimista
      setTickets(prevTickets => prevTickets.map(t => 
        t.id === modalState.selectedTicket.id 
          ? modalState.selectedTicket  // Revertir al estado original
          : t
      ));
      
      // Verificar si es un error de permisos (403)
      if (error.response?.status === 403) {
        alert('Este ticket no es tuyo. Solo puedes cambiar el estado de tickets asignados a ti.');
      } else {
        showToast('Error al actualizar el ticket. Por favor intente nuevamente.', 'danger');
      }
    }
  }, [modalState.selectedTicket, showToast, currentUser, closeAllModals]);

  // Función para ver detalles del ticket (memoizada)
  const handleVerDetalles = useCallback((ticket) => {
    updateModalState({
      selectedTicket: ticket,
      showDetails: true
    });
  }, []);

  // Función para generar PDF (memoizada)
  const handleGenerarPDF = useCallback(async (ticket) => {
    try {
      const ticketCompleto = await ticketService.getTicketById(ticket.id);
      const result = await PDFService.generateTicketReport(ticketCompleto);
      showToast(result.message, 'success');
    } catch (error) {
      showToast('Error al generar el informe del ticket', 'danger');
    }
  }, [showToast]);

  // Función para cancelar ticket (memoizada)
  const handleCancelarTicket = useCallback((ticketId) => {
    updateModalState({
      ticketToCancelId: ticketId,
      showCancel: true
    });
  }, []);

  // Función para reasignar ticket (memoizada)
  const handleReasignarTicket = useCallback((ticket) => {
    updateModalState({
      selectedTicket: ticket,
      showReassign: true
    });
  }, []);

  // Función para manejar éxito de reasignación (memoizada)
  const handleReassignSuccess = useCallback((ticketId, nuevoUsuario) => {
    setTickets(prevTickets => prevTickets.map(t => 
      t.id === ticketId 
        ? { 
            ...t, 
            asignadoA: nuevoUsuario,
            fechaActualizacion: new Date().toISOString()
          } 
        : t
    ));
    
    showToast(`Ticket reasignado exitosamente`, 'success');
    closeAllModals();
  }, [showToast, closeAllModals]);

  const confirmarCancelacion = useCallback(async () => {
    if (!modalState.ticketToCancelId) return;

    try {
      updateModalState({ loading: true });
      
      // Actualización optimista: remover el ticket inmediatamente
      setTickets(prevTickets => 
        prevTickets.filter(ticket => ticket.id !== modalState.ticketToCancelId)
      );
      
      // Cerrar modal inmediatamente
      closeAllModals();
      
      // Hacer la petición al servidor en segundo plano
      await ticketService.updateTicketStatus(modalState.ticketToCancelId, 'cancelado');
      showToast('Ticket cancelado exitosamente', 'success');
      
    } catch (error) {
      console.error('Error al cancelar ticket:', error);
      
      // En caso de error, recargar para restaurar el estado correcto
      await fetchTickets();
      
      // Verificar si es un error de permisos (403)
      if (error.response?.status === 403) {
        alert('Este ticket no es tuyo. Solo podés cancelar tickets que tengas asignados.');
      } else {
        showToast('Error al cancelar el ticket. Por favor, intentá nuevamente o recargá la página.', 'danger');
      }
    } finally {
      updateModalState({ loading: false });
    }
  }, [modalState.ticketToCancelId, updateModalState, closeAllModals, showToast, fetchTickets]);

  // Función para obtener estados disponibles según el estado actual (memoizada)
  const getEstadosDisponibles = useCallback((estadoActual) => {
    switch (estadoActual) {
      case 'nuevo':
        return [
          { value: 'en_progreso', label: 'En progreso' },
          { value: 'cancelado', label: 'Cancelado' }
        ];
      case 'en_progreso':
        return [
          { value: 'resuelto', label: 'Resuelto' },
          { value: 'pendiente', label: 'Pendiente' },
          { value: 'cancelado', label: 'Cancelado' }
        ];
      case 'pendiente':
        return [
          { value: 'en_progreso', label: 'Retomar' },
          { value: 'resuelto', label: 'Resuelto' },
          { value: 'cancelado', label: 'Cancelado' }
        ];
      case 'resuelto':
        return [{ value: 'pendiente', label: 'Pendiente' }];
      default:
        return [];
    }
  }, []);

  // Aplicar filtros de búsqueda (optimizado con debounce)
  const ticketsFiltrados = useMemo(() => {
    if (!busqueda.trim()) {
      return tickets;
    }
    
    const searchTerm = busqueda.toLowerCase();
    return tickets.filter(ticket => {
      // Optimizar búsqueda con early return
      const searchableText = [
        ticket.titulo,
        ticket.descripcion,
        ticket.categoria,
        ticket.sucursal,
        ticket.id?.toString(),
        ticket.estado,
        ticket.usuario?.nombre,
        ticket.usuario?.email,
        ticket.usuario?.sucursal,
        ticket.asignadoA?.nombre,
        ticket.asignadoA?.email,
        ticket.asignadoA,
        ticket.tecnico
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }, [tickets, busqueda]);

  // Función para obtener iconos de estado (memoizada)
  const obtenerIconoEstado = useCallback((estado) => {
    const iconos = {
      nuevo: <FontAwesomeIcon icon={faClock} className="me-1" />,
      en_progreso: <FontAwesomeIcon icon={faSpinner} className="me-1" spin />,
      resuelto: <FontAwesomeIcon icon={faCheckCircle} className="me-1" />,
      mal: <FontAwesomeIcon icon={faExclamationCircle} className="me-1" />,
      cancelado: <FontAwesomeIcon icon={faTimesCircle} className="me-1" />,
      cerrado: <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
    };

    const clases = {
      nuevo: 'bg-warning text-dark',
      en_progreso: 'bg-info',
      resuelto: 'bg-success',
      mal: 'bg-danger',
      cancelado: 'bg-secondary',
      cerrado: 'bg-dark'
    };

    const etiquetas = {
      nuevo: 'Nuevo',
      en_progreso: 'En proceso',
      resuelto: 'Resuelto',
      pendiente: 'Pendiente',
      cancelado: 'Cancelado',
    };

    return (
      <span className={`badge ${clases[estado] || 'bg-secondary'}`}>
        {iconos[estado]}
        {etiquetas[estado] || estado.replace('_', ' ')}
      </span>
    );
  }, []);

  // Componente de fila de ticket memoizado para evitar re-renders
  const TicketRow = memo(({ ticket, vistaActual, userPermissions, onVerDetalles, onTomarClick, onGenerarPDF, onEnviarASupervisor, onCancelarTicket, onReasignarTicket, onCambiarEstado, obtenerIconoEstado }) => {
    const { esSoporte, esAdmin, userId } = userPermissions;
    
    // Calcular permisos una sola vez por fila
    const usuarioAsignado = ticket.usuario_asignado_id || 
                           ticket.asignadoA?.id || 
                           (typeof ticket.asignadoA === 'number' ? ticket.asignadoA : null);
    
    const esAsignadoAlUsuario = usuarioAsignado && 
                              (usuarioAsignado == userId || 
                               parseInt(usuarioAsignado) === parseInt(userId));
    
    const puedeInteractuar = (esSoporte || esAdmin) && (esAsignadoAlUsuario || esAdmin);
    const mostrarBotonesEnProgreso = ticket.estado === 'en_progreso' && puedeInteractuar;
    
    const puedeVerInforme = ticket.estado === 'resuelto' && (esSoporte || esAdmin);
    const puedeCancelar = ticket.estado === 'nuevo' && (esSoporte || esAdmin);
    
    return (
      <tr key={ticket.id}>
        <td>#{ticket.id}</td>
        <td>
          <div className="fw-semibold">
            <button 
              className="btn btn-link text-decoration-none"
              onClick={() => onVerDetalles(ticket)}
            >
              {ticket.titulo}
            </button>
          </div>
          <small className="text-muted">
            {ticket.descripcion && ticket.descripcion.length > 50
              ? `${ticket.descripcion.substring(0, 50)}...`
              : ticket.descripcion}
          </small>
        </td>
        <td>{obtenerIconoEstado(ticket.estado)}</td>
        <td>
          <span className={`badge ${
            ticket.prioridad === 'alta' ? 'bg-danger' : 
            ticket.prioridad === 'media' ? 'bg-warning text-dark' : 'bg-info'
          }`}>
            {ticket.prioridad}
          </span>
        </td>
        <td>{ticket.categoria}</td>
        <td>
          {ticket.asignadoA?.sucursal || ticket.usuario?.sucursal ? (
            <span className="badge bg-primary">
              {ticket.asignadoA?.sucursal || ticket.usuario?.sucursal}
            </span>
          ) : (
            <span className="badge bg-secondary">Sin sucursal</span>
          )}
        </td>
        <td>{formatearFecha(ticket.fechaCreacion || ticket.fecha_creacion)}</td>
        <td>
          <div className="d-flex gap-2">
            {vistaActual === 'bandeja' ? (
              <button 
                style={{textDecoration: 'none'}}
                className={`btn btn-sm ${ticket.estado === 'pendiente' ? 'btn-warning' : 'btn-primary'}`}
                title={ticket.estado === 'pendiente' ? 'Retomar ticket pendiente' : 'Tomar ticket'}
                onClick={() => onTomarClick(ticket)}
              >
                <FontAwesomeIcon icon={faHandPaper} className="me-1" />
                <span className="d-none d-md-inline">
                  {ticket.estado === 'pendiente' ? 'Retomar' : 'Tomar'}
                </span>
              </button>
            ) : (
              <>
                {mostrarBotonesEnProgreso && (
                  <>
                    <button 
                      style={{textDecoration: 'none'}}
                      className="btn btn-sm btn-warning"
                      title="Cambiar estado"
                      onClick={() => onCambiarEstado(ticket)}
                    >
                      <FontAwesomeIcon icon={faSpinner} className="me-1" />
                      <span className="d-none d-md-inline">Cambiar Estado</span>
                    </button>
                    <button 
                      style={{textDecoration: 'none'}}
                      className="btn btn-sm btn-info"
                      title="Reasignar ticket"
                      onClick={() => onReasignarTicket(ticket)}
                    >
                      <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
                      <span className="d-none d-md-inline">Reasignar</span>
                    </button>
                  </>
                )}
                {puedeVerInforme && (
                  <>
                    <button 
                      style={{textDecoration: 'none'}}
                      className="btn btn-sm btn-success"
                      title="Ver informe"
                      onClick={() => onGenerarPDF(ticket)}
                    >
                      <FontAwesomeIcon icon={faFileAlt} className="me-1" />
                      <span className="d-none d-md-inline">Ver Informe</span>
                    </button>
                  </>
                )}
                {puedeCancelar && (
                  <button 
                    style={{textDecoration: 'none'}}
                    className="btn btn-sm btn-danger"
                    title="Cancelar ticket"
                    onClick={() => onCancelarTicket(ticket.id)}
                  >
                    <FontAwesomeIcon icon={faTimes} className="me-1" />
                    <span className="d-none d-md-inline">Cancelar</span>
                  </button>
                )}
              </>
            )}
            
            <button 
              style={{textDecoration: 'none'}}      
              className="btn btn-sm btn-outline-primary"
              title="Ver detalles"
              onClick={() => onVerDetalles(ticket)}
            >
              <FontAwesomeIcon icon={faSearch} />
              <span className="d-none d-md-inline ms-1">Detalles</span>
            </button>
          </div>
        </td>
      </tr>
    );
  });

  // Componente Modal Base Reutilizable
  const ModalBase = memo(({ show, onClose, title, children, size = 'md', maxWidth = null }) => {
    if (!show) return null;

    return (
      <div 
        className="modal fade show d-block" 
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          className={`modal-dialog modal-dialog-centered ${size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : ''}`}
          style={maxWidth ? { maxWidth } : {}}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Cerrar"
              />
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  });

  // Handlers memoizados para TicketRow
  const handleCambiarEstadoClick = useCallback((ticket) => {
    updateModalState({
      selectedTicket: ticket,
      newStatus: 'resuelto',
      showStatusChange: true
    });
  }, [updateModalState]);

  // El componente StatusChangeModal ahora está en un archivo separado

  // Mostrar estados de carga y error
  if (cargando && tickets.length === 0) {
    return (
      <div className="bandeja-container">
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" />
          <p className="mt-3">Cargando bandeja de entrada...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bandeja-container">
        <div className="empty-state">
          <FontAwesomeIcon icon={faExclamationCircle} size="3x" className="text-danger mb-3" />
          <p className="text-danger">{error}</p>
          <button 
            className="btn btn-danger mt-3"
            onClick={fetchTickets}
          >
            <FontAwesomeIcon icon={faSpinner} className={cargando ? 'me-2' : 'd-none'} spin />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bandeja-container">
      <div className="bandeja-header">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2">
            <button 
              className={`btn ${vistaActual === 'bandeja' ? 'btn-secondary' : 'btn-outline-primary'}`}
              onClick={() => setVistaActual('bandeja')}
            >
              <FontAwesomeIcon icon={faListAlt} className="me-1" />
              Bandeja
            </button>
            <button 
              className={`btn ${vistaActual === 'historial' ? 'btn-secondary' : 'btn-outline-primary'}`}
              onClick={() => setVistaActual('historial')}
            >
              <FontAwesomeIcon icon={faFileAlt} className="me-1" />
              Historial
            </button>
          </div>
          
          <button 
            style={{textDecoration: 'none', background: '#007bff', color: 'white'}}
            className="btn btn-outline-success btn-sm"
            onClick={fetchTickets}
            disabled={cargando}
            title="Actualizar lista de tickets"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="bandeja-card">
        <div className="bandeja-filtros">
          <div className="filtros-container">
            {/* Filtros para Bandeja */}
            {vistaActual === 'bandeja' && (
              <div className="filters-panel bg-light border rounded p-3 mb-4">
                <div className="d-flex align-items-center mb-3">
                  <FontAwesomeIcon icon={faFilter} className="text-primary me-2" />
                  <h6 className="mb-0 text-muted fw-semibold">Filtros</h6>
                </div>
                
                <div className="d-flex flex-wrap gap-3 align-items-end">
                  <div className="filter-group" style={{minWidth: '180px'}}>
                    <label className="form-label text-muted small fw-medium mb-1">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                      Prioridad
                    </label>
                    <select 
                      className="form-select form-select-sm shadow-sm"
                      value={filtroPrioridad}
                      onChange={(e) => setFiltroPrioridad(e.target.value)}
                    >
                      <option value="todos">Todas las prioridades</option>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  
                  <div className="filter-group" style={{minWidth: '120px'}}>
                    <button 
                      className="btn btn-outline-danger btn-sm w-100 shadow-sm d-flex align-items-center justify-content-center"
                      onClick={() => {
                        setFiltroPrioridad('todos');
                        setBusqueda('');
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros para Historial */}
            {vistaActual === 'historial' && (
              <div className="filters-panel bg-light border rounded p-3 mb-4">
                <div className="d-flex align-items-center mb-3">
                  <FontAwesomeIcon icon={faFilter} className="text-primary me-2" />
                  <h6 className="mb-0 text-muted fw-semibold">Filtros Avanzados</h6>
                </div>
                
                <div className="d-flex flex-wrap gap-3 align-items-end">
                  <div className="filter-group" style={{minWidth: '180px'}}>
                    <label className="form-label text-muted small fw-medium mb-1">
                      <FontAwesomeIcon icon={faTag} className="me-1" />
                      Estado
                    </label>
                    <select 
                      className="form-select form-select-sm shadow-sm"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="en_progreso">En progreso</option>
                      <option value="resuelto">Resueltos</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="cancelado">Cancelados</option>
                    </select>
                  </div>
                  
                  <div className="filter-group" style={{minWidth: '160px'}}>
                    <label className="form-label text-muted small fw-medium mb-1">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      Fecha
                    </label>
                    <select 
                      className="form-select form-select-sm shadow-sm"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                    >
                      <option value="todos">Todas las fechas</option>
                      <option value="hoy">Hoy</option>
                      <option value="semana">Última semana</option>
                      <option value="mes">Último mes</option>
                    </select>
                  </div>
                  
                  <div className="filter-group" style={{minWidth: '180px'}}>
                    <label className="form-label text-muted small fw-medium mb-1">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                      Prioridad
                    </label>
                    <select 
                      className="form-select form-select-sm shadow-sm"
                      value={filtroPrioridad}
                      onChange={(e) => setFiltroPrioridad(e.target.value)}
                    >
                      <option value="todos">Todas las prioridades</option>
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  
                  <div className="filter-group" style={{minWidth: '120px'}}>
                    <button 
                      className="btn btn-outline-danger btn-sm w-100 shadow-sm d-flex align-items-center justify-content-center"
                      onClick={() => {
                        setFiltro('todos');
                        setFiltroFecha('todos');
                        setFiltroPrioridad('todos');
                        setFiltroTecnico('todos');
                        setBusqueda('');
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="search-box">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por título o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          {ticketsFiltrados.length === 0 ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faInfoCircle} size="3x" className="text-muted mb-3" />
              <p>No hay tickets</p>
              <p className="text-muted">
                {vistaActual === 'bandeja' 
                  ? 'Hicieron un buen trabajo mi gente.' 
                  : (filtro !== 'todos' || busqueda 
                    ? 'Prueba con otros filtros o términos de búsqueda.' 
                    : 'No hay tickets en el historial.')
                }
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
                    <th>Categoría</th>
                    <th>Sucursal</th>
                    <th>Fecha de creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFiltrados.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      vistaActual={vistaActual}
                      userPermissions={userPermissions}
                      onVerDetalles={handleVerDetalles}
                      onTomarClick={handleTomarClick}
                      onGenerarPDF={handleGenerarPDF}
                      onCancelarTicket={handleCancelarTicket}
                      onReasignarTicket={handleReasignarTicket}
                      onCambiarEstado={handleCambiarEstadoClick}
                      obtenerIconoEstado={obtenerIconoEstado}
                    />
                  ))}
                </tbody>
              </table>
          </div>
        )}
      </div>
    </div>

    {/* Modal de Cambio de Estado */}
    <StatusChangeModal 
      show={modalState.showStatusChange}
      ticket={modalState.selectedTicket}
      onClose={closeAllModals}
      onSubmit={handleCambiarEstado}
      getEstadosDisponibles={getEstadosDisponibles}
      obtenerIconoEstado={obtenerIconoEstado}
    />
    
    {/* Modal de Detalles del Ticket */}
    <TicketDetailsModal 
      show={modalState.showDetails}
      onHide={closeAllModals}
      ticketId={modalState.selectedTicket?.id}
      ticketData={modalState.selectedTicket}
    />
    
    {/* Modal de Cancelación */}
    {modalState.showCancel && (
      <ModalBase 
        show={true}
        onClose={closeAllModals}
        title="Cancelar Ticket"
        maxWidth="350px"
      >
        <div className="modal-body">
          <p>¿Está seguro de cancelar el ticket #{modalState.ticketToCancelId}?</p>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-cancelar"
              onClick={closeAllModals}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn-guardar"
              onClick={confirmarCancelacion}
              disabled={modalState.loading}
            >
              {modalState.loading ? (
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
              ) : (
                <FontAwesomeIcon icon={faTimes} className="me-2" />
              )}
              Confirmar
            </button>
          </div>
        </div>
      </ModalBase>
    )}
    
    {/* Modal de Reasignación */}
    {modalState.showReassign && modalState.selectedTicket && (
      <ReassignTicketModal 
        isOpen={modalState.showReassign}
        ticket={modalState.selectedTicket}
        onClose={closeAllModals}
        onReassignSuccess={handleReassignSuccess}
      />
    )}
    
    {/* Toast Component */}
    {toast.show && (
      <div className={`toast-container position-fixed top-0 end-0 p-3`} style={{ zIndex: 1055 }}>
        <div className={`toast show align-items-center text-white bg-${toast.type} border-0`} role="alert">
          <div className="d-flex">
            <div className="toast-body">
              {toast.message}
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white me-2 m-auto" 
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
            ></button>
          </div>
        </div>
      </div>
    )}
  </div>
);

};

export default BandejaPage;
