import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Componente para proteger rutas según autenticación y rol del usuario.
 * @param {ReactNode} children - Componentes hijos a renderizar si pasa la protección.
 * @param {Array<string>} allowedRoles - Lista de roles permitidos (ej: ['admin', 'soporte'])
 * @param {string} [redirectTo='/dashboard'] - Ruta a la que redirigir si no cumple rol.
 */
const RoleProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/dashboard' }) => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Show loading while auth context is loading
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <Navigate to={redirectTo} state={{ accessDenied: true }} replace />
    );
  }

  return children;
};

export default RoleProtectedRoute;
