import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import activityService from '../services/activityService';
import ticketService from '../services/ticket.service';
import api from '../services/api.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(null);
  const [hasActiveTickets, setHasActiveTickets] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userData = sessionStorage.getItem('user');
        const token = sessionStorage.getItem('authToken');
        
        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          
          // Configurar el token en los headers de API
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          try {
            // Hacer una petición simple para validar el token
            await api.get('/auth/me');
            // Token válido, restaurar sesión
            parsedUser.token = token;
            setUser(parsedUser);
            
            // Iniciar heartbeat para usuarios de soporte
            if (parsedUser.role === 'soporte') {
              const interval = activityService.startHeartbeat();
              setHeartbeatInterval(interval);
            }
          } catch (error) {
            console.error('Token inválido, limpiando sesión:', error);
            // Token inválido, limpiar datos
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('authToken');
            delete api.defaults.headers.common['Authorization'];
          }
        } else {
          // No hay datos de usuario o token, limpiar todo
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('tokenTimestamp');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Función para verificar tickets activos
  const checkActiveTickets = async () => {
    if (user && user.role === 'soporte') {
      try {
        const activeTicketsResponse = await ticketService.checkActiveTickets(user.id);
        const hasActive = activeTicketsResponse && activeTicketsResponse.hasActiveTickets;
        setHasActiveTickets(hasActive);
        return hasActive;
      } catch (error) {
        console.error('Error verificando tickets activos:', error);
        setHasActiveTickets(false);
        return false;
      }
    }
    setHasActiveTickets(false);
    return false;
  };

  // Efecto para verificar tickets activos periódicamente
  useEffect(() => {
    if (user && user.role === 'soporte') {
      // Verificar inmediatamente
      checkActiveTickets();
      
      // Verificar cada 30 segundos
      const interval = setInterval(checkActiveTickets, 30000);
      
      return () => clearInterval(interval);
    } else {
      setHasActiveTickets(false);
    }
  }, [user]);

  // Efecto para manejar el evento beforeunload
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasActiveTickets && user && user.role === 'soporte') {
        const message = 'Tenés tickets en progreso. ¿Estás seguro de que querés cerrar la página?';
        event.preventDefault();
        event.returnValue = message; // Para navegadores más antiguos
        return message;
      }
    };

    // Agregar el event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasActiveTickets, user]);

  const login = async (username, password) => {
    try {
      const userData = await authService.login(username, password);
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
      
      // El tracking automático se hace en el middleware del backend
      // Ya no necesitamos heartbeat manual
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    // Verificar si el usuario de soporte tiene tickets en progreso
    if (user && user.role === 'soporte') {
      try {
        const activeTicketsResponse = await ticketService.checkActiveTickets(user.id);
        
        if (activeTicketsResponse && activeTicketsResponse.hasActiveTickets) {
          // Mostrar alerta y prevenir el logout
          const ticketCount = activeTicketsResponse.count;
          const mensaje = `No podés cerrar sesión porque tenés ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} en progreso. Por favor, marcalo como pendiente o resuelto antes de cerrar sesión.`;
          
          if (window.confirm) {
            window.alert(mensaje);
          } else {
            console.warn(mensaje);
          }
          
          return { success: false, error: mensaje };
        }
      } catch (error) {
        console.error('Error verificando tickets activos:', error);
        // En caso de error, permitir el logout pero mostrar advertencia
        console.warn('No se pudo verificar tickets activos, permitiendo logout');
      }
    }
    
    // console.log(' Iniciando logout para usuario:', user);
    
    // Limpiar actividad en el servidor ANTES de eliminar el token
    if (user && user.role === 'soporte') {
      // console.log(' Limpiando actividad para usuario soporte');
      try {
        await activityService.clearActivity();
        // console.log('✅ Actividad limpiada exitosamente');
      } catch (error) {
        console.error('❌ Error limpiando actividad:', error);
      }
    }
    
    // Ahora limpiar datos locales
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('tokenTimestamp');
    
    // Limpiar estado
    setUser(null);
    
    // Clear API authorization header
    delete api.defaults.headers.common['Authorization'];
    
    navigate('/login');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
    hasActiveTickets,
    checkActiveTickets
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};