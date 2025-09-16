import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import ticketService from '../../../services/ticket.service';
import { getDashboardStats, formatStatsForDisplay } from '../../../utils/dashboardStats';
import Sidebar from '../../layout/Sidebar/Sidebar';
import QuickAccessModal from '../QuickAccessModal';
import './SoporteDashboard.css';

const SoporteDashboard = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [quickAccessModal, setQuickAccessModal] = useState({ isOpen: false, type: null, title: '' });
  const location = useLocation();
  
  // Obtener saludo según la hora del día
  const getGreeting = () => {
    const timeZone = 'America/Argentina/Buenos_Aires';
    const now = new Date();
    const zonedDate = toZonedTime(now, timeZone);
    const hour = parseInt(format(zonedDate, 'HH'));
    
    if (hour >= 6 && hour < 12) {
      return '¡BUENOS DIAS!';
    } else if (hour >= 12 && hour < 19) {
      return '¡BUENAS TARDES!';
    } else {
      return '¡BUENAS NOCHES!';
    }
  };

  // Obtener el título de la página actual
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('bandeja')) return 'Bandeja de Entrada';
    if (path.includes('mis-tickets')) return 'Mis Tickets';
    if (path.includes('historial')) return 'Historial';
    if (path.includes('chat')) return 'Chat de Soporte';
    if (path.includes('configuracion')) return 'Configuración';
    return `${getGreeting()}`;
  };

  // Memoizar loadStats para evitar recreaciones innecesarias
  const loadStats = useCallback(async () => {
    // Verificar si el usuario está cargado y tiene datos
    if (!user || Object.keys(user).length === 0) {
      return;
    }
    
    const userId = user.id_usuario || user.id;
    if (!userId) {
      return;
    }
    
    setLoadingStats(true);
    try {
      const dashboardStats = await getDashboardStats(userId, fechaSeleccionada);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [user, fechaSeleccionada]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Memoizar función de refresh
  const handleRefreshStats = useCallback(async () => {
    if (refreshing || loadingStats) return;
    
    const userId = user?.id_usuario || user?.id;
    if (!userId) return;
    
    setRefreshing(true);
    try {
      const dashboardStats = await getDashboardStats(userId, fechaSeleccionada);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error al actualizar estadísticas:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadingStats, user, fechaSeleccionada]);

  // Memoizar verificación de página principal
  const isMainDashboard = useMemo(() => {
    return location.pathname === '/dashboard/soporte' || location.pathname === '/dashboard/soporte/';
  }, [location.pathname]);

  // Función para abrir el modal de acceso rápido
  const handleCardClick = useCallback((cardType, cardTitle) => {
    setQuickAccessModal({
      isOpen: true,
      type: cardType,
      title: cardTitle
    });
  }, []);

  // Función para cerrar el modal
  const handleCloseModal = useCallback(() => {
    setQuickAccessModal({ isOpen: false, type: null, title: '' });
  }, []);

  // Función para actualizar estadísticas después de tomar un ticket
  const handleTicketUpdate = useCallback(() => {
    handleRefreshStats();
  }, [handleRefreshStats]);

  // Mapear títulos de cards a tipos
  const getCardType = (title) => {
    switch (title) {
      case 'Tickets Nuevos':
        return 'nuevos';
      case 'Tickets Pendientes':
        return 'pendientes';
      case 'En Progreso':
        return 'en_progreso';
      case 'Resueltos Hoy':
        return 'resueltos';
      case 'Cancelados':
        return 'cancelados';
      default:
        return null;
    }
  };

  // Cargar estadísticas solo cuando es necesario
  useEffect(() => {
    // Solo cargar si estamos en el dashboard principal
    if (isMainDashboard) {
      loadStats();
    }
  }, [loadStats, location.pathname, isMainDashboard]);

  return (
    <div className="soporte-layout">
      <button 
        className={`mobile-menu-btn ${isSidebarOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
        aria-label="Menú de navegación"
      >
        <span></span>
      </button>
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className="soporte-main-content">
        <header className="soporte-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="header-left">
            <h1 style={{ color: '#1e1e1e', fontFamily: 'Arial, sans-serif', fontSize: '34px', margin: 0 }}>{getPageTitle()}</h1>
          </div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMainDashboard && (
              <div className="date-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="fecha-stats" style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                  Fecha:
                </label>
                <input
                  id="fecha-stats"
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: '#fff'
                  }}
                />
              </div>
            )}
            <div className="user-info">
              <span style={{ fontSize: '20px'}}>{user.nombre}</span>
              <span style={{ fontSize: '14px'}} className="user-role">Soporte Técnico</span>
            </div>
          </div>
        </header>
        
        <div className="soporte-content">
          {isMainDashboard && stats && (
            <div className="dashboard-stats">
              <div className="stats-grid">
                {formatStatsForDisplay(stats).map((stat, index) => {
                  const cardType = getCardType(stat.title);
                  const isClickable = cardType && ['nuevos', 'pendientes', 'en_progreso', 'resueltos', 'cancelados'].includes(cardType);
                  
                  return (
                    <div 
                      key={index} 
                      className={`stat-card ${isClickable ? 'clickable' : ''}`}
                      style={{ borderLeft: `4px solid ${stat.color}` }}
                      onClick={isClickable ? () => handleCardClick(cardType, stat.title) : undefined}
                      title={isClickable ? `Click para ver ${stat.title.toLowerCase()}` : ''}
                    >
                      <div className="stat-icon" style={{ fontSize: '2rem' }}>{stat.icon}</div>
                      <div className="stat-content">
                        <h3 className="stat-value" style={{ color: stat.color, fontSize: '1.8rem', margin: '0' }}>
                          {stat.value}
                        </h3>
                        <p className="stat-title" style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0.2rem 0' }}>
                          {stat.title}
                        </p>
                        <p className="stat-description" style={{ fontSize: '0.8rem', color: '#666', margin: '0' }}>
                          {stat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Estadísticas por Categoría */}
              {stats.categorias && stats.categorias.length > 0 && (
                <div className="category-stats">
                  <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>📊 Tickets por Categoría</h3>
                  <div className="category-grid">
                    {stats.categorias.slice(0, 6).map((categoria, index) => (
                      <div key={categoria.categoria} className="category-card">
                        <div className="category-header">
                          <span className="category-emoji">{categoria.emoji}</span>
                          <span className="category-name">{categoria.nombre}</span>
                        </div>
                        <div className="category-stats-content">
                          <div className="category-count">{categoria.cantidad}</div>
                          <div className="category-percentage">{categoria.porcentaje}%</div>
                        </div>
                        <div className="category-bar">
                          <div 
                            className="category-bar-fill" 
                            style={{ width: `${categoria.porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingStats && (
                <div className="loading-stats" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Cargando estadísticas...</p>
                </div>
              )}
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Modal de acceso rápido */}
      <QuickAccessModal
        isOpen={quickAccessModal.isOpen}
        onClose={handleCloseModal}
        cardType={quickAccessModal.type}
        cardTitle={quickAccessModal.title}
        currentUser={user}
        onTicketUpdate={handleTicketUpdate}
        fechaSeleccionada={fechaSeleccionada}
      />
    </div>
  );
};

export default SoporteDashboard;
