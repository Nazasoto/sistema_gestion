import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ChatBot from '../../common/ChatBot/ChatBot';
import sucursalService from '../../../services/sucursal.service';
import userService from '../../../services/userService';
import './SucursalDashboard.css';


const SucursalDashboard = ({ user = {} }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sucursalInfo, setSucursalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supportUsers, setSupportUsers] = useState([]);
  const [loadingSupportUsers, setLoadingSupportUsers] = useState(true);
  
  // Memoizar greeting para evitar recálculos
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);
  
  // Memoizar función de fetch sucursal
  const fetchSucursalInfo = useCallback(async () => {
    if (user.sucursal) {
      try {
        setLoading(true);
        const sucursal = await sucursalService.getSucursalByNumber(user.sucursal);
        setSucursalInfo(sucursal);
      } catch (error) {
        console.error('Error fetching sucursal info:', error);
        setSucursalInfo(null);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user.sucursal]);

  // Fetch sucursal information when component mounts or user changes
  useEffect(() => {
    fetchSucursalInfo();
  }, [fetchSucursalInfo]);

  // Memoizar función de fetch support users
  const fetchSupportUsers = useCallback(async () => {
    try {
      setLoadingSupportUsers(true);
      const users = await userService.getSupportUsers();
      setSupportUsers(users);
    } catch (error) {
      console.error('Error fetching support users:', error);
      setSupportUsers([]);
    } finally {
      setLoadingSupportUsers(false);
    }
  }, []);

  // Fetch support users con intervalo optimizado
  useEffect(() => {
    fetchSupportUsers();
    
    // Reducir frecuencia de actualización a 60 segundos
    const interval = setInterval(fetchSupportUsers, 60000);
    
    return () => clearInterval(interval);
  }, [fetchSupportUsers]);
  
  const handleLogout = () => {
    logout();
  };

  // Memoizar display de sucursal
  const sucursalDisplay = useMemo(() => {
    if (loading) return 'Cargando...';
    if (!user.sucursal) return 'Sucursal no asignada';
    if (!sucursalInfo) return `Sucursal: ${user.sucursal}`;
    return `${sucursalInfo.nro_sucursal} - ${sucursalInfo.nombre}`;
  }, [loading, user.sucursal, sucursalInfo]);

  // Memoizar función getTimeAgo
  const getTimeAgo = useCallback((date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return 'Hace más de 1 día';
  }, []);

  // Función para obtener el color y estado basado en tickets asignados
  const getAvailabilityStatus = useCallback((ticketsCount, isOnline) => {
    if (!isOnline) {
      return {
        color: '#6c757d', // Gris para desconectados
        description: 'Desconectado',
        textColor: '#6c757d'
      };
    }

    if (ticketsCount <= 2) {
      return {
        color: '#28a745', // Verde - Disponible
        description: 'Disponible',
        textColor: '#28a745'
      };
    } else if (ticketsCount === 3) {
      return {
        color: '#ffc107', // Amarillo - Ocupado
        description: 'Ocupado',
        textColor: '#856404'
      };
    } else {
      return {
        color: '#dc3545', // Rojo - No disponible
        description: 'No disponible',
        textColor: '#dc3545'
      };
    }
  }, []);

  // Memoizar action cards
  const actionCards = useMemo(() => [
    {
      title: 'CREAR TICKET',
      icon: '📝',
      action: () => navigate('/tickets/nuevo'),
      className: 'card-primary'
    },
    {
      title: 'HISTORIAL',
      icon: '📋',
      action: () => navigate('/dashboard/sucursal/historial'),
      className: 'card-success'
    },
    {
      title: 'CONFIGURACIÓN',
      icon: '⚙️',
      action: () => navigate('/dashboard/sucursal/configuracion'),
      className: 'card-warning'
    },
    {
      title: 'CERRAR SESIÓN',
      icon: '🚪',
      action: handleLogout,
      className: 'card-danger'
    }
  ], [navigate, handleLogout]);

  return (
    <div className="sucursal-dashboard">
      <ChatBot />
      <div className="dashboard-header" style={{ boxShadow: '0 10px 8px rgba(0, 0, 0, 0.1)' }}>
        <div className="user-welcome">
          <h1>{greeting}, {user.nombre || 'Usuario'}!</h1>
          <p className="text-muted">¿En qué podemos ayudarte hoy?</p>
        </div>
        <div className="sucursal-info">
          <span className="badge bg-primary">{sucursalDisplay}</span>
        </div>
      </div>
      
      <div className="dashboard-cards">
        {actionCards.map((card, index) => (
          <div 
            key={index} 
            className={`action-card ${card.className}`}
            onClick={card.action}
          >
            <div className="card-icon">{card.icon}</div>
            <h3>{card.title}</h3>
          </div>
        ))}
      </div>

      {/* Sección de usuarios de soporte conectados */}
      <div className="support-users-section">
        <div className="section-headr" style={{borderRadius: '12px'}}>
          <h2 style={{
            textAlign: 'center',
            color: 'white',
            fontFamily: 'Segoe UI',
            marginLeft: '10px',
            fontSize: '21px'
          }}>EQUIPO DE SOPORTE</h2>
          <span className="online-count" style={{backgroundColor: 'white', color: 'black', borderRadius: '15px', padding: '5px 10px', fontSize: '16px', marginRight: '10px'}}>
            {loadingSupportUsers ? (
              'Cargando...'
            ) : (
              `${supportUsers.filter(u => u.isOnline).length} de ${supportUsers.length} conectados`
            )}
          </span>
        </div>
        
        {loadingSupportUsers ? (
          <div className="loading-support">
            <div className="spinner"></div>
            <p>Cargando equipo de soporte...</p>
          </div>
        ) : (
          <div className="support-users-grid">
            {supportUsers.map((supportUser, index) => {
              const ticketsCount = supportUser.ticketsAsignados || 0;
              const availabilityStatus = getAvailabilityStatus(ticketsCount, supportUser.isOnline);
              
              return (
                <div 
                  key={`support-user-${supportUser.id_usuario || index}`} 
                  className={`support-user-card ${supportUser.isOnline ? 'online' : 'offline'}`}
                  style={{
                    backgroundColor: supportUser.isOnline ? '#ffffff' : '#f8f9fa',
                    borderColor: supportUser.isOnline ? '#dee2e6' : '#e9ecef',
                    opacity: supportUser.isOnline ? 1 : 0.7
                  }}
                >
                  <div className="user-avatar">
                    <div 
                      className="avatar-circle"
                      style={{
                        backgroundColor: supportUser.isOnline ? '#007bff' : '#6c757d',
                        color: 'white'
                      }}
                    >
                      {supportUser.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className={`status-indicator ${supportUser.isOnline ? 'online' : 'offline'}`}></div>
                  </div>
                  
                  <div className="user-info" style={{fontSize: '19px'}}>
                    <h4 style={{ color: supportUser.isOnline ? '#212529' : '#6c757d' }}>
                      {supportUser.nombre} {supportUser.apellido}
                    </h4>
                    
                    {/* Indicador de disponibilidad basado en tickets */}
                    <div className="availability-indicator" style={{ marginBottom: '8px', marginTop: '8px' }}>
                      <div 
                        className="availability-badge"
                        style={{
                          backgroundColor: availabilityStatus.color,
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '15px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'inline-block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {availabilityStatus.description}
                      </div>
                      <div style={{ 
                        fontSize: '15px', 
                        color: availabilityStatus.textColor, 
                        marginTop: '10px',
                        fontWeight: '500'
                      }}>
                        {ticketsCount} tickets tomados
                      </div>
                    </div>
                    
                    <div className="user-status">
                      {supportUser.isOnline ? (
                        <span className="status-text online" style={{ color: '#28a745' }}>
                          Conectado
                        </span>
                      ) : (
                        <span className="status-text offline" style={{ color: '#6c757d' }}>
                          {supportUser.minutesAgo !== null ? `Hace ${supportUser.minutesAgo}m` : 'Desconectado'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {supportUsers.length === 0 && (
              <div className="no-support-users">
                <p>No hay técnicos de soporte disponibles en este momento.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default SucursalDashboard;
