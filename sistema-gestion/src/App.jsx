import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthService from './services/auth.service';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import './css/main.css';

// Componentes críticos (carga inmediata)
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import SessionExpired from './components/auth/SessionExpired';
import Dashboard from './components/dashboard/Dashboard';
import NotFound from './components/common/NotFound';
import LoadingSpinner from './components/common/LoadingSpinner';

// Componentes con lazy loading (carga bajo demanda)
const TicketsList = lazy(() => import('./components/tickets/TicketsList'));
const TicketDetail = lazy(() => import('./components/tickets/TicketDetail'));
const NewTicket = lazy(() => import('./components/tickets/NewTicket'));
const Profile = lazy(() => import('./components/user/Profile'));

// Componentes de Soporte (lazy loading)
const SoporteDashboard = lazy(() => import('./components/dashboard/SoporteDashboard/SoporteDashboard'));
const BandejaPage = lazy(() => import('./pages/soporte/bandeja'));
const ConfiguracionPage = lazy(() => import('./pages/soporte/configuracion'));
const BitacoraPage = lazy(() => import('./pages/soporte/bitacora'));
const PendingRegistrations = lazy(() => import('./components/admin/PendingRegistrations'));
const HistorialSucursal = lazy(() => import('./pages/sucursal/historial'));
const SucursalConfiguracion = lazy(() => import('./pages/sucursal/configuracion'));

// Componentes de Supervisor (lazy loading - contiene ECharts)
const SupervisorDashboard = lazy(() => import('./components/dashboard/SupervisorDashboard/SupervisorDashboard'));

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="app">
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Register />
        } />
        <Route path="/forgot-password" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <ForgotPassword />
        } />
        <Route path="/reset-password" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <ResetPassword />
        } />
        
        {/* Ruta de inicio redirige a login o dashboard según autenticación */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
        } />

            {/* Dashboard principal, solo para usuarios autenticados (cualquier rol) */}
            <Route path="/dashboard" element={
              <RoleProtectedRoute allowedRoles={['admin', 'soporte', 'sucursal', 'supervisor']}>
                <Dashboard />
              </RoleProtectedRoute>
            } />

            {/* Dashboard de supervisor, solo para supervisores */}
            <Route path="/dashboard/supervisor" element={
              <RoleProtectedRoute allowedRoles={['supervisor', 'admin']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <SupervisorDashboard />
                </Suspense>
              </RoleProtectedRoute>
            } />

            {/* Dashboard de soporte y subrutas, solo para soporte */}
            <Route path="/dashboard/soporte" element={
              <RoleProtectedRoute allowedRoles={['soporte']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <SoporteDashboard />
                </Suspense>
              </RoleProtectedRoute>
            }>
              <Route path="bandeja" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <BandejaPage />
                </Suspense>
              } />
              <Route path="configuracion" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ConfiguracionPage />
                </Suspense>
              } />
              <Route path="bitacora" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <BitacoraPage />
                </Suspense>
              } />
              <Route path="registros-pendientes" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PendingRegistrations />
                </Suspense>
              } />
            </Route>

            {/* Dashboard de sucursal y subrutas, solo para sucursal */}
            <Route path="/dashboard/sucursal" element={
              <RoleProtectedRoute allowedRoles={['sucursal']}>
                {/* Acá va el layout/dashboard de sucursal */}
                <Outlet />
              </RoleProtectedRoute>
            }>
              <Route path="historial" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <HistorialSucursal />
                </Suspense>
              } />
              <Route path="configuracion" element={
                <div className="container-fluid py-4">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SucursalConfiguracion />
                  </Suspense>
                </div>
              } />
              {/* Puedes agregar más subrutas aquí si lo necesitas */}
            </Route>

            {/* Tickets, solo para soporte y admin */}
            <Route path="/tickets" element={
              <RoleProtectedRoute allowedRoles={['soporte', 'admin']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <TicketsList />
                </Suspense>
              </RoleProtectedRoute>
            } />

            <Route path="/tickets/nuevo" element={
              <RoleProtectedRoute allowedRoles={['soporte', 'admin', 'sucursal']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <NewTicket />
                </Suspense>
              </RoleProtectedRoute>
            } />

            <Route path="/tickets/:id" element={
              <RoleProtectedRoute allowedRoles={['soporte', 'admin', 'sucursal']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <TicketDetail />
                </Suspense>
              </RoleProtectedRoute>
            } />

            {/* Perfil: cualquier usuario autenticado */}
            <Route path="/profile" element={
              <RoleProtectedRoute allowedRoles={['admin', 'soporte', 'sucursal']}>
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
                </Suspense>
              </RoleProtectedRoute>
            } />

            {/* Ruta para sesión expirada */}
            <Route path="/session-expired" element={<SessionExpired />} />
            
            {/* Ruta 404 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    );
  };

export default App;