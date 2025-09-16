import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTicketAlt, 
  faUsers, 
  faChartLine, 
  faFilter,
  faSearch,
  faCalendarAlt,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faSpinner,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import ticketService from '../../../services/ticket.service';
import PDFService from '../../../services/pdfService';
import { useAuth } from '../../../context/AuthContext';
import reportService from '../../../services/reportService';
import api from '../../../services/api.service';
import LoadingSpinner from '../../common/LoadingSpinner';
import { formatearFecha } from '../../../utils/dateUtils';
import './SupervisorDashboard.css';

// Lazy load del componente de reportes
const { lazy } = React;
const ReportesProfesional = lazy(() => import('../../../pages/supervisor/reportes/ReportesProfesional'));

const SupervisorDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('monitoreo');
  const [tickets, setTickets] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Filtros para monitoreo
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroSucursalMonitoreo, setFiltroSucursalMonitoreo] = useState('');
  const [busquedaTitulo, setBusquedaTitulo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(() => {
    // Inicializar con fecha actual en formato YYYY-MM-DD
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });

  // Función para obtener fecha actual en formato YYYY-MM-DD
  const obtenerFechaHoy = () => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  };

  // Función para verificar si la fecha seleccionada es hoy
  const esFechaHoy = () => {
    return filtroFecha === obtenerFechaHoy();
  };

  useEffect(() => {
    loadData();
  }, []);


  // Auto-refresh para monitoreo en tiempo real (solo si está en la tab activa)
  useEffect(() => {
    if (activeTab === 'monitoreo' && autoRefresh && document.visibilityState === 'visible') {
      const interval = setInterval(() => {
        loadData();
      }, 60000); // Reducido a 60 segundos para menos requests
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [activeTab, autoRefresh]);

  // Limpiar interval al desmontar componente
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Función para mostrar notificaciones
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  }, []);


  // Memoizar filtros para evitar re-renderizados innecesarios
  const filteredTickets = useMemo(() => {
    let tickets = [...allTickets];
    
    // Filtro por estado
    if (filtroEstado) {
      tickets = tickets.filter(ticket => ticket.estado === filtroEstado);
    }
    
    // Filtro por prioridad
    if (filtroPrioridad) {
      tickets = tickets.filter(ticket => ticket.prioridad === filtroPrioridad);
    }
    
    // Filtro por usuario creador
    if (filtroUsuario) {
      tickets = tickets.filter(ticket => 
        (ticket.creador?.nombre || ticket.nombre_creador || '')
          .toLowerCase()
          .includes(filtroUsuario.toLowerCase())
      );
    }
    
    // Filtro por sucursal
    if (filtroSucursalMonitoreo) {
      tickets = tickets.filter(ticket => 
        (ticket.creador?.sucursal || ticket.sucursal_creador || ticket.sucursal || '')
          .toLowerCase()
          .includes(filtroSucursalMonitoreo.toLowerCase())
      );
    }
    
    // Búsqueda por título
    if (busquedaTitulo) {
      tickets = tickets.filter(ticket => 
        ticket.titulo.toLowerCase().includes(busquedaTitulo.toLowerCase())
      );
    }
    
    // Filtro por fecha específica
    if (filtroFecha) {
      tickets = tickets.filter(ticket => {
        const fechaCreacion = new Date(ticket.fechaCreacion || ticket.fecha_creacion);
        const fechaFiltro = new Date(filtroFecha + 'T00:00:00');
        
        return fechaCreacion.getFullYear() === fechaFiltro.getFullYear() &&
               fechaCreacion.getMonth() === fechaFiltro.getMonth() &&
               fechaCreacion.getDate() === fechaFiltro.getDate();
      });
    }
    
    return tickets;
  }, [allTickets, filtroEstado, filtroPrioridad, filtroUsuario, filtroSucursalMonitoreo, busquedaTitulo, filtroFecha]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener todos los tickets para supervisores
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      };
      
      const ticketsResponse = await api.get('/tickets/todos', config);
      const ticketsData = Array.isArray(ticketsResponse.data) ? ticketsResponse.data : [];
      
      
      setTickets(ticketsData);
      setAllTickets(ticketsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los datos del dashboard');
      setTickets([]);
      setAllTickets([]);
      setEstadisticas({});
    } finally {
      setLoading(false);
    }
  }, []);



  const getPrioridadColor = (prioridad) => {
    switch (prioridad?.toLowerCase()) {
      case 'urgente': return 'priority-urgent';
      case 'alta': return 'priority-high';
      case 'media': return 'priority-medium';
      case 'baja': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const formatDate = (dateString) => {
    return formatearFecha(dateString);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const handleLogout = () => {
    logout();
  };

  if (loading && tickets.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="supervisor-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1 style={{ color: '#2c3e50', fontFamily: 'Arial, sans-serif', fontSize: '30px' }}>{getGreeting()}, {user?.nombre}!</h1>
          </div>
        </div>
        <button 
            className="logout-button"
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{}}
          >
            Cerrar Sesión
          </button>
      </header>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs y botón de recarga */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'monitoreo' ? 'active' : ''}`} 
            onClick={() => setActiveTab('monitoreo')}
            style={{textDecoration: 'none', color: 'black'}}
          >
            Monitoreo en Tiempo Real
          </button>
          <button 
            className={`tab ${activeTab === 'reportes' ? 'active' : ''}`} 
            onClick={() => setActiveTab('reportes')}
            style={{textDecoration: 'none', color: 'black'}}
          >
            Reportes y Estadísticas
          </button>
        </div>
        <div className="refresh-controls">
          {activeTab === 'monitoreo' && (
            <label className="auto-refresh-toggle">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="toggle-text">Auto-actualizar (60s)</span>
            </label>
          )}
          <button 
            style={{textDecoration: 'none', fontSize: '16px'}}
            className="refresh-button"
            onClick={loadData}
            disabled={loading}
            title="Recargar datos"
          >
            {loading ? '🔄' : '🔄'} Actualizar
          </button>
        </div>
      </div>

      {/* Contenido de tabs */}
      {activeTab === 'monitoreo' && (
        <div className="tickets-section">
          <div className="section-eheader" style={{padding: '16px', marginBottom: '20px'}}>
            <h2 style={{color: '#2c3e50', fontFamily: 'Arial, sans-serif', fontSize: '30px'}}>📊 Monitoreo de Tickets</h2>
            {autoRefresh && (
              <div className="refresh-indicator">
                <span className="pulse-dot"></span>
                <span>Actualizando automáticamente</span>
              </div>
            )}
          </div>
          
          {/* Filtros de Monitoreo */}
          <div className="filtros-monitoreo">
            <div className="filtros-row">
              <div className="filtro-group">
                <label>🔍 Buscar por título:</label>
                <input 
                  type="text" 
                  placeholder="Buscar tickets..."
                  value={busquedaTitulo}
                  onChange={(e) => setBusquedaTitulo(e.target.value)}
                  className="filtro-busqueda"
                />
              </div>
              
              <div className="filtro-group">
                <label>📊 Estado:</label>
                <select 
                  value={filtroEstado} 
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="filtro-select"
                >
                  <option value="">Todos los estados</option>
                  <option value="nuevo">🆕 Nuevo</option>
                  <option value="pendiente">🟠 Pendiente</option>
                  <option value="en_progreso">⚙️ En Progreso</option>
                  <option value="resuelto">✅ Resuelto</option>
                  <option value="cancelado">❌ Cancelado</option>
                </select>
              </div>
              
              <div className="filtro-group">
                <label>⚡ Prioridad:</label>
                <select 
                  value={filtroPrioridad} 
                  onChange={(e) => setFiltroPrioridad(e.target.value)}
                  className="filtro-select"
                >
                  <option value="">Todas las prioridades</option>
                  <option value="urgente">🔴 Urgente</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🟢 Baja</option>
                </select>
              </div>
            </div>
            
            <div className="filtros-row">
              
              <div className="filtro-group">
                <label>📆 Fecha:</label>
                <input 
                  type="date" 
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="filtro-input"
                />
              </div>
            </div>
            
            <div className="filtros-row">
              <div className="filtro-group">
                <button 
                  style={{textDecoration: 'none', fontSize: '16px'}}
                  className="btn-limpiar-filtros"
                  onClick={() => {
                    setFiltroEstado('');
                    setFiltroPrioridad('');
                    setBusquedaTitulo('');
                    setFiltroFecha(obtenerFechaHoy());
                  }}
                >
                  🗑️ Limpiar Filtros
                </button>
              </div>
            </div>
            
            <div className="resultados-filtro">
              <span>Mostrando {filteredTickets.length} de {allTickets.length} tickets</span>
            </div>
          </div>
          
          {filteredTickets.length === 0 ? (
            <div className="empty-state">
              <p>
                {allTickets.length === 0 
                  ? 'No hay tickets para mostrar' 
                  : esFechaHoy() 
                    ? 'Hoy no se pidieron tickets' 
                    : `No se encontraron tickets para el ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}`
                }
              </p>
            </div>
          ) : (
            <div className="tickets-table-container">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Usuario</th>
                    <th>Sucursal</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Asignado a</th>
                    <th>Creado</th>
                    <th>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className={`ticket-row estado-${ticket.estado}`}>
                      <td>#{ticket.id}</td>
                      <td className="ticket-title">{ticket.titulo}</td>
                      <td>{ticket.usuario?.nombre || ticket.creador?.nombre || ticket.nombre_creador || 'N/A'}</td>
                      <td>{ticket.usuario?.sucursal || ticket.creador?.sucursal || ticket.sucursal_creador || ticket.sucursal || 'N/A'}</td>
                      <td>
                        <span className={`estado-badge ${ticket.estado}`}>
                          {ticket.estado === 'nuevo' && '🆕 Nuevo'}
                          {ticket.estado === 'en_progreso' && '⚙️ En Progreso'}
                          {ticket.estado === 'resuelto' && '✅ Resuelto'}
                          {ticket.estado === 'cerrado' && '🔒 Cerrado'}
                          {ticket.estado === 'cancelado' && '❌ Cancelado'}
                          {ticket.estado === 'pendiente' && '🟠 Pendiente'}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-badge ${getPrioridadColor(ticket.prioridad)}`}>
                          {ticket.prioridad?.toUpperCase()}
                        </span>
                      </td>
                      <td>{ticket.asignadoA?.nombre || ticket.asignado?.nombre || ticket.nombre_asignado || 'Sin asignar'}</td>
                      <td>{formatDate(ticket.fechaCreacion || ticket.fecha_creacion)}</td>
                      <td>{ticket.categoria || 'Sin categoría'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {activeTab === 'reportes' && (
        <div className="reportes-section">
          <Suspense fallback={<LoadingSpinner />}>
            <ReportesProfesional />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
