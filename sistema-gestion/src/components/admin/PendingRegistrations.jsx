import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import PasswordResetRequests from './PasswordResetRequests';
import CustomModal from '../common/CustomModal';
import './PendingRegistrations.css';

const PendingRegistrations = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' o 'password-reset'
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalType, setModalType] = useState(''); // 'approve', 'reject' o 'create-user'
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    usuario: '',
    password: '',
    telefono: '',
    role: 'soporte'
  });
  const { user } = useAuth();

  // Verificar permisos
  if (!user || (user.role !== 'admin' && user.role !== 'soporte')) {
    return (
      <div className="pending-registrations-container">
        <div className="alert alert-danger">
          No tienes permisos para acceder a esta sección.
        </div>
      </div>
    );
  }

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const token = sessionStorage.getItem('authToken');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }
      
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : (import.meta.env.PROD 
          ? 'https://soporte-backend-production.up.railway.app/api' 
          : 'http://localhost:3001/api');
      const response = await fetch(`${apiUrl}/auth/pending-registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data);
      } else {
        const errorText = await response.text();
        setError(`Error al cargar solicitudes pendientes: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const handleApprove = (userId, userData) => {
    setModalData({ userId, userData });
    setModalType('approve');
    setShowModal(true);
  };

  const confirmApprove = async () => {
    const { userId, userData } = modalData;
    try {
      setProcessing(prev => ({ ...prev, [userId]: 'approving' }));
      setError('');
      setSuccess('');

      const token = sessionStorage.getItem('authToken');
      
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : (import.meta.env.PROD 
          ? 'https://soporte-backend-production.up.railway.app/api' 
          : 'http://localhost:3001/api');
      const response = await fetch(`${apiUrl}/auth/approve-registration/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'sucursal' // Role por defecto
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Usuario ${userData.usuario} aprobado exitosamente`);
        
        // Remover de la lista
        setPendingUsers(prev => prev.filter(u => u.id_usuario !== userId));
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al aprobar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: null }));
      setShowModal(false);
      setModalData(null);
    }
  };

  const handleReject = (userId, userData) => {
    setModalData({ userId, userData });
    setModalType('reject');
    setShowModal(true);
  };

  const confirmReject = async () => {
    const { userId, userData } = modalData;
    try {
      setProcessing(prev => ({ ...prev, [userId]: 'rejecting' }));
      setError('');
      setSuccess('');

      const token = sessionStorage.getItem('authToken');
      
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : (import.meta.env.PROD 
          ? 'https://soporte-backend-production.up.railway.app/api' 
          : 'http://localhost:3001/api');
      const response = await fetch(`${apiUrl}/auth/reject-registration/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess(`Registro de ${userData.usuario} rechazado`);
        
        // Remover de la lista
        setPendingUsers(prev => prev.filter(u => u.id_usuario !== userId));
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al rechazar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: null }));
      setShowModal(false);
      setModalData(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      setCreateLoading(true);
      setError('');
      setSuccess('');

      // Validaciones básicas
      if (!newUserData.nombre || !newUserData.apellido || !newUserData.email || 
          !newUserData.usuario || !newUserData.password) {
        setError('Todos los campos son requeridos');
        return;
      }

      if (newUserData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      // Crear usuario usando el servicio
      const response = await userService.createSupportUser(newUserData);
      
      setSuccess('Usuario de soporte creado exitosamente');
      setShowCreateUserModal(false);
      
      // Resetear formulario
      setNewUserData({
        nombre: '',
        apellido: '',
        email: '',
        usuario: '',
        password: '',
        telefono: '',
        role: 'soporte'
      });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setError('Error al crear el usuario. Por favor, intenta nuevamente.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="pending-registrations-container">
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" />
          <p className="mt-3">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-registrations-container">
      <div className="page-header">
        <h2>
          <i className="fas fa-users-cog"></i>
          Gestionar Usuarios
        </h2>
        <div className="header-actions">
          <button 
            className="btn"
            onClick={() => setShowCreateUserModal(true)}
            style={{textDecoration: 'none', width: '500px'}}
          >
            <i className="fas fa-user-plus"></i>
            Crear Usuario de Soporte
          </button>
          <button 
            className="btn"
            onClick={fetchPendingRegistrations}
            disabled={loading}
            style={{textDecoration: 'none'}}
          >
            <i className="fas fa-sync-alt"></i>
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs para navegar entre secciones */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{textDecoration: 'none', color: 'black'}}
          >
            <i className="fas fa-user-clock"></i>
            Registros Pendientes
          </button>
          <button 
            className={`tab ${activeTab === 'password-reset' ? 'active' : ''}`}
            onClick={() => setActiveTab('password-reset')}
            style={{textDecoration: 'none', color: 'black'}}
          >
            <i className="fas fa-key"></i>
            Solicitudes de Contraseña
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      {/* Renderizar contenido según tab activo */}
      {activeTab === 'password-reset' ? (
        <PasswordResetRequests />
      ) : (
        <>

      {/* Separador visual */}
      <div className="section-divider">
        <h3>
          <i className="fas fa-user-clock"></i>
          Solicitudes de Registro Pendientes
        </h3>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <h3>No hay solicitudes pendientes</h3>
          <p>Todas las solicitudes de registro han sido procesadas.</p>
        </div>
      ) : (
        <div className="registrations-grid">
          {pendingUsers.map(userData => (
            <div key={userData.id_usuario} className="registration-card">
              <div className="card-header">
                <div className="user-info" style={{ color: 'black' }}>
                  <h4 style={{ color: 'black' }}>{userData.nombre} {userData.apellido}</h4>
                  <span className="username" style={{ color: 'black' }}>@{userData.usuario}</span>
                </div>
                <div className="request-date">
                  <small style={{ color: 'black' }}>Solicitado: {userData.fecha_solicitud}</small>
                </div>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <i className="fas fa-envelope"></i>
                  <span style={{ color: 'black' }}>{userData.mail}</span>
                </div>
                
                {userData.telefono && (
                  <div className="info-row">
                    <i className="fas fa-phone"></i>
                    <span>{userData.telefono}</span>
                  </div>
                )}
                
                <div className="info-row">
                  <i className="fas fa-building"></i>
                  <span>Sucursal {userData.sucursal}</span>
                </div>
                
                {(userData.localidad || userData.provincia) && (
                  <div className="info-row">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{userData.localidad}{userData.provincia ? `, ${userData.provincia}` : ''}</span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleApprove(userData.id_usuario, userData)}
                  disabled={processing[userData.id_usuario]}
                >
                  {processing[userData.id_usuario] === 'approving' ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      Aprobando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Aprobar
                    </>
                  )}
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(userData.id_usuario, userData)}
                  disabled={processing[userData.id_usuario]}
                >
                  {processing[userData.id_usuario] === 'rejecting' ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-times"></i>
                      Rechazar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

          <div className="stats-footer">
            <div className="stat-item">
              <span className="stat-number">{pendingUsers.length}</span>
              <span className="stat-label">Solicitudes Pendientes</span>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación */}
      {showModal && modalData && (
        <CustomModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setModalData(null);
          }}
          title={modalType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
          size="medium"
        >
          <div className="modal-content">
            {modalType === 'approve' ? (
              <>
                <p>¿Estás seguro de que querés aprobar el registro de:</p>
                <div className="user-info">
                  <strong>{modalData.userData.nombre} {modalData.userData.apellido} con usuario {modalData.userData.usuario}</strong>
                  <br />
                  <span className="text-muted">{modalData.userData.email}</span>
                </div>
                <p className="mt-3">El usuario va a poder acceder al sistema una vez aprobado.</p>
                <div className="modal-actions mt-4">
                  <button
                    className="btn btn-success me-2"
                    onClick={confirmApprove}
                    disabled={processing[modalData.userId]}
                  >
                    {processing[modalData.userId] === 'approving' ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                        Aprobando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Confirmar Aprobación
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setModalData(null);
                    }}
                    disabled={processing[modalData.userId]}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>¿Estás seguro de que querés rechazar el registro de:</p>
                <div className="user-info">
                  <strong>{modalData.userData.nombre} {modalData.userData.apellido}</strong>
                  <br />
                  <span className="text-muted">{modalData.userData.email}</span>
                </div>
                <p className="mt-3 text-warning">
                  <i className="fas fa-exclamation-triangle"></i>
                  Esta acción eliminará permanentemente la solicitud de registro.
                </p>
                <div className="modal-actions mt-4">
                  <button
                    className="btn btn-danger me-2"
                    onClick={confirmReject}
                    disabled={processing[modalData.userId]}
                  >
                    {processing[modalData.userId] === 'rejecting' ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                        Rechazando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times"></i>
                        Confirmar Rechazo
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setModalData(null);
                    }}
                    disabled={processing[modalData.userId]}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </CustomModal>
      )}

      {/* Modal para crear usuario de soporte */}
      {showCreateUserModal && (
        <CustomModal
          isOpen={showCreateUserModal}
          onClose={() => {
            setShowCreateUserModal(false);
            // Resetear formulario al cerrar
            setNewUserData({
              nombre: '',
              apellido: '',
              usuario: '',
              password: '',
              telefono: '',
              role: 'soporte'
            });
            setError('');
          }}
          title="Crear Nuevo Usuario de Soporte"
          size="large"
        >
          <div className="modal-content">
            <form onSubmit={handleCreateUser} className="create-user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={newUserData.nombre}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginLeft: '20px' }}>
                  <label htmlFor="apellido">Apellido *</label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={newUserData.apellido}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                
                <div className="form-group">
                  <label htmlFor="usuario">Usuario *</label>
                  <input
                    type="text"
                    id="usuario"
                    name="usuario"
                    value={newUserData.usuario}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="nombre.apellido"
                    required
                  />
                </div>
                
                
                <div className="form-group" style={{ marginLeft: '20px' }}>
                  <label htmlFor="role">Rol *</label>
                  <select
                    id="role"
                    name="role"
                    value={newUserData.role}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="soporte">Soporte</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Contraseña *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newUserData.password}
                    onChange={handleInputChange}
                    className="form-control"
                    minLength="6"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="alert alert-danger mt-3">
                  <i className="fas fa-exclamation-triangle"></i>
                  {error}
                </div>
              )}

              <div className="modal-actions mt-4">
                <button
                  type="submit"
                  className="btn btn-success me-2"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus"></i>
                      Crear Usuario
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    // Resetear formulario
                    setNewUserData({
                      nombre: '',
                      apellido: '',
                      email: '',
                      usuario: '',
                      password: '',
                      telefono: '',
                      role: 'soporte'
                    });
                    setError('');
                  }}
                  disabled={createLoading}
                >
                  <i className="fas fa-times"></i>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default PendingRegistrations;
