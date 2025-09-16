import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import configService from '../../../services/config.service';
import api from '../../../services/api.service';
import CustomAlert from '../../../components/common/CustomAlert';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
// Icon components using Font Awesome classes (Esto lo hizo la IA, así que si algo está mal no me culpen a mi XD)
const FaUserCog = () => <i className="fas fa-user-cog"></i>;
const FaBell = () => <i className="fas fa-bell"></i>;
const FaSave = () => <i className="fas fa-save"></i>;
const FaUser = () => <i className="fas fa-user"></i>;
const FaPhone = () => <i className="fas fa-phone"></i>;
const FaEnvelope = () => <i className="fas fa-envelope"></i>;
const FaCalendarAlt = () => <i className="fas fa-calendar-alt"></i>;
const FaBuilding = () => <i className="fas fa-building"></i>;
const FaShieldAlt = () => <i className="fas fa-shield-alt"></i>;
const FaCheckCircle = () => <i className="fas fa-check-circle"></i>;
import './configuracion.css';
import { useNavigate } from 'react-router-dom';
import ConfigModal from '../../../components/ConfigModal';

const SucursalConfiguracion = () => {
  const navigate = useNavigate();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id_usuario: '',
    usuario: '',
    role: '',
    nombre: '',
    apellido: '',
    mail: '',
    telefono: '',
    nacimiento: '',
    sucursal: '',
    vigencia: true,
    // Password change fields
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  
    const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'success' // 'success', 'error', 'warning', 'info'
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleCloseAlert = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  // Debug: Log formData whenever it changes
  useEffect(() => {
  }, [formData]);

  // Función para obtener email desde la base de datos según la sucursal
  const obtenerEmailPorSucursal = (numeroSucursal) => {
    if (!numeroSucursal || !sucursalesDisponibles.length) return '';
    
    const sucursalEncontrada = sucursalesDisponibles.find(s => s.nro_sucursal === numeroSucursal);
    return sucursalEncontrada ? sucursalEncontrada.mail : '';
  };

  // Función para cargar sucursales desde la BD
  const fetchSucursales = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : (import.meta.env.PROD 
          ? 'https://soporte-backend-production.up.railway.app/api' 
          : 'http://localhost:3001/api');
      const response = await fetch(`${apiUrl}/auth/sucursales`);
      if (response.ok) {
        const data = await response.json();
        // Ordenar sucursales por número de sucursal (numéricamente)
        const sucursalesOrdenadas = data.sort((a, b) => {
          return parseInt(a.nro_sucursal) - parseInt(b.nro_sucursal);
        });
        setSucursalesDisponibles(sucursalesOrdenadas);
      } else {
        console.error('Error en respuesta de sucursales:', response.status, response.statusText);
        setSucursalesDisponibles([]);
      }
    } catch (error) {
      console.error('Error cargando sucursales:', error);
      setSucursalesDisponibles([]);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Cargar sucursales primero
        await fetchSucursales();
        
        const response = await api.get('/auth/me');
        
        if (!response.data) {
          console.error('La respuesta del servidor está vacía');
          return;
        }
        
        // Obtener los datos del usuario de la respuesta
        const userData = response.data.user || response.data;
        
        if (!userData) {
          console.error('No se encontraron datos de usuario en la respuesta');
          return;
        }
        
        
        // Crear un objeto con los datos del usuario
        const userFormData = {
          id_usuario: userData.id || '',
          usuario: userData.usuario || '',
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          mail: userData.email || userData.mail || '',
          telefono: userData.telefono || '',
          nacimiento: userData.nacimiento ? 
            (typeof userData.nacimiento === 'string' ? 
              userData.nacimiento.split('T')[0] : 
              new Date(userData.nacimiento).toISOString().split('T')[0]) : 
            '',
          sucursal: userData.sucursal || '',
          vigencia: userData.vigencia !== undefined ? Boolean(userData.vigencia) : true,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          role: userData.role || ''
        };
        
        // Actualizar el estado del formulario con los nuevos datos
        setFormData({
          id_usuario: userFormData.id_usuario,
          usuario: userFormData.usuario,
          nombre: userFormData.nombre,
          apellido: userFormData.apellido,
          mail: userFormData.mail,
          telefono: userFormData.telefono,
          nacimiento: userFormData.nacimiento,
          sucursal: userFormData.sucursal,
          vigencia: userFormData.vigencia,
          role: userFormData.role,
          // Mantener los campos de contraseña vacíos por seguridad
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos del usuario:', error);
        // Si no está autorizado, redirigir al login
        if (error.response?.status === 401) {
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('token');
          window.location.href = '/login';
        }
        setLoading(false);
      }
    };
  
    fetchUserData();
  }, []);

  const handleVolver = () => {
    navigate('/dashboard');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    let inputValue = value;
    if (type === 'checkbox') {
      inputValue = checked;
    } else if (type === 'number') {
      inputValue = Number(value);
    } else if (type === 'date') {
      inputValue = value;
    }
    
    // Si cambia la sucursal, actualizar automáticamente el email
    if (name === 'sucursal') {
      const emailGenerado = obtenerEmailPorSucursal(value);
      setFormData(prev => ({
        ...prev,
        [name]: inputValue,
        mail: emailGenerado
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: inputValue
      }));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validar que las contraseñas coincidan
    if (formData.newPassword !== formData.confirmPassword) {
      showAlert('Las contraseñas no coinciden', 'error');
      return;
    }
    
    // Validar longitud mínima de contraseña
    if (formData.newPassword.length < 8) {
      showAlert('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }
    
    try {
      setIsSaving(true);
      await api.put(`/usuarios/${formData.id_usuario}/password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      // Limpiar los campos de contraseña
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      showAlert('Contraseña actualizada correctamente', 'success');
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      showAlert(error.response?.data?.message || 'Error al cambiar la contraseña', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    // Validar sucursal - debe ser una opción válida del dropdown
    if (formData.sucursal && !sucursalesDisponibles.find(s => s.nro_sucursal === formData.sucursal)) {
      errors.push('Debe seleccionar una sucursal válida');
    }
    
    // Validar teléfono - solo números, espacios, guiones y paréntesis
    if (formData.telefono && !/^[\d\s\-\(\)\+]+$/.test(formData.telefono.trim())) {
      errors.push('El teléfono solo puede contener números, espacios, guiones y paréntesis');
    }
    
    // Validar email
    if (formData.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mail.trim())) {
      errors.push('El email debe tener un formato válido');
    }
    
    // Validar nombre y apellido - solo letras y espacios
    if (formData.nombre && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.nombre.trim())) {
      errors.push('El nombre solo puede contener letras y espacios');
    }
    
    if (formData.apellido && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.apellido.trim())) {
      errors.push('El apellido solo puede contener letras y espacios');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulario antes de enviar
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      showAlert(validationErrors.join('. '), 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      // Definir los campos que se pueden actualizar en la base de datos
      const allowedFields = [
        'usuario', 'nombre', 'apellido', 'mail', 'telefono', 
        'nacimiento', 'sucursal', 'vigencia', 'password'
      ];
      
      // Filtrar solo los campos permitidos y limpiar espacios
      const updateData = {};
      allowedFields.forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          // Limpiar espacios en blanco para campos de texto
          if (typeof formData[key] === 'string') {
            updateData[key] = formData[key].trim();
          } else {
            updateData[key] = formData[key];
          }
        }
      });
      
      // Asegurarse de que los campos tengan el formato correcto
      if ('vigencia' in updateData) {
        updateData.vigencia = Boolean(updateData.vigencia);
      }
      
      // Si la contraseña está vacía, no la enviamos
      if (updateData.password === '') {
        delete updateData.password;
      }
    
      
      // Enviar los cambios al servidor
      const response = await api.put(`/usuarios/${formData.id_usuario}`, updateData);
      
      // Mostrar mensaje de éxito
      showAlert('Cambios guardados correctamente', 'success');
      
      // Obtener los datos actualizados del servidor
      const userResponse = await api.get('/auth/me');
      const updatedUser = userResponse.data.user || userResponse.data;
      
      // Actualizar el estado del formulario con los nuevos datos
      setFormData(prev => ({
        ...prev,
        id_usuario: updatedUser.id || '',
        usuario: updatedUser.usuario || '',
        nombre: updatedUser.nombre || '',
        apellido: updatedUser.apellido || '',
        mail: updatedUser.email || updatedUser.mail || '',
        telefono: updatedUser.telefono || '',
        nacimiento: updatedUser.nacimiento ? 
          (typeof updatedUser.nacimiento === 'string' ? 
            updatedUser.nacimiento.split('T')[0] : 
            new Date(updatedUser.nacimiento).toISOString().split('T')[0]) : 
          '',
        sucursal: updatedUser.sucursal || '',
        vigencia: updatedUser.vigencia !== undefined ? Boolean(updatedUser.vigencia) : true,
        role: updatedUser.role || ''
      }));
      
    } catch (error) {
      console.error('Error al guardar los cambios:', error);
      if (error.response?.status === 401) {
        // Si no está autorizado, redirigir al login
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        showAlert('Error al guardar los cambios: ' + (error.response?.data?.message || error.message), 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="configuracion-container justify-content-center align-items-center">
      <div className="configuracion-header">
        <h1><FaUserCog className="me-2" /> Configuración de la Cuenta</h1>
        <div className="back-button-container">
          <button 
            style={{textDecoration: 'none'}}
            onClick={() => navigate('/dashboard')}
            className="back-button"
          > 
            <i className="fas fa-arrow-left me-2" style={{fontSize: '30px', color: '#475569'}}></i>
            <small style={{fontSize: '30px', color: '#475569'}}>VOLVER</small>
          </button>
        </div>
      </div>
      <br />
      <div className="row g-4 justify-content-center">
        <div className="col-md-6">
          <div 
            className="card h-100 shadow-sm border-0 configuracion-card"
            onClick={() => setShowInfoModal(true)}
            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
          >
            <div className="card-body text-center p-5">
              <div className="mb-4">
                <FaUser style={{ fontSize: '4rem', color: '#007bff' }} />
              </div>
              <h3 className="card-title mb-3">Información Personal</h3>
              <p className="card-text text-muted">
                Actualiza tus datos personales, información de contacto y configuración de sucursal
              </p>
              <div className="mt-4">
                <span className="badge bg-primary px-3 py-2">
                  <i className="fas fa-edit me-2"></i>
                  Editar Información
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div 
            className="card h-100 shadow-sm border-0 configuracion-card"
            onClick={() => setShowSecurityModal(true)}
            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
          >
            <div className="card-body text-center p-5">
              <div className="mb-4">
                <FaShieldAlt style={{ fontSize: '4rem', color: '#28a745' }} />
              </div>
              <h3 className="card-title mb-3">Seguridad</h3>
              <p className="card-text text-muted">
                Cambia tu contraseña 
              </p>
              <div className="mt-4">
                <span className="badge bg-success px-3 py-2">
                  <i className="fas fa-shield-alt me-2"></i>
                  Configurar Seguridad
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Información Personal */}
      <ConfigModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Información Personal"
        icon={<FaUser />}
        iconColor="#4f46e5"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
                  <div className="form-section">
                    <h5 className="mb-4">Datos Básicos</h5>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Nombre</label>
                        <input
                          type="text"
                           className="form-control"
                           name="nombre"
                           value={formData.nombre || ''}
                           onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Apellido</label>
                        <input
                          type="text"
                          className="form-control"
                          name="apellido"
                          value={formData.apellido || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Usuario</label>
                        <input
                          type="text"
                          className="form-control"
                          name="usuario"
                          value={formData.usuario || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          name="mail"
                          value={formData.mail || ''}
                          readOnly
                          disabled
                          style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                        />
                        <div className="form-text text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          El email se asigna automáticamente según la sucursal seleccionada
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Teléfono</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="telefono"
                          value={formData.telefono || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Sucursal</label>
                        <select
                          id="sucursal"
                          name="sucursal"
                          value={formData.sucursal}
                          onChange={handleInputChange}
                          className="form-control"
                          required
                        >
                          <option value="">Seleccione una sucursal</option>
                          {sucursalesDisponibles.map((sucursal) => (
                            <option key={sucursal.nro_sucursal} value={sucursal.nro_sucursal}>
                              Sucursal {sucursal.nro_sucursal} - {sucursal.localidad}, {sucursal.provincia}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="form-check form-switch mt-4">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="vigencia"
                            name="vigencia"
                            checked={formData.vigencia}
                            onChange={(e) => setFormData({ ...formData, vigencia: e.target.checked })}
                          />
                          <label className="form-check-label" htmlFor="vigencia">
                            Usuario activo
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end mt-4">
                      <button
                        style={{textDecoration: 'none'}}
                        type="button" 
                        className="btn btn-secondary me-2"
                        onClick={() => setShowInfoModal(false)}
                      >
                        Cancelar
                      </button>
                      <button 
                        style={{textDecoration: 'none', color: 'white'}}
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" />
                            Guardar Cambios
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
      </ConfigModal>

      {/* Modal de Seguridad */}
      <ConfigModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        title="Seguridad"
        icon={<FaShieldAlt />}
        iconColor="#10b981"
        size="lg"
      >
                <div className="row">
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Cambiar Contraseña</h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label">Contraseña actual</label>
                          <input
                            type="password"
                            className="form-control"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            placeholder="Ingresa tu contraseña actual"
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Nueva contraseña</label>
                          <input
                            type="password"
                            className="form-control"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            minLength="8"
                            placeholder="Ingresa tu nueva contraseña"
                          />
                          <div className="form-text">Mínimo 8 caracteres</div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Confirmar nueva contraseña</label>
                          <input
                            type="password"
                            className="form-control"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            minLength="8"
                            placeholder="Confirma tu nueva contraseña"
                          />
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                          <button 
                            style={{textDecoration: 'none'}} 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={() => setShowSecurityModal(false)}
                          >
                            Cancelar
                          </button>
                          <button
                            style={{textDecoration: 'none'}} 
                            type="button" 
                            className="btn btn-success"
                            onClick={handlePasswordChange}
                            disabled={!formData.currentPassword || !formData.newPassword || !formData.confirmPassword || isSaving}
                          >
                            {isSaving ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                                Cambiando...
                              </>
                            ) : (
                              <>
                                <FaShieldAlt className="me-2" />
                                Cambiar Contraseña
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4" style={{margin: '20px'}}>
                    <div className="alert alert-info"> 
                      <h6><i className="fas fa-info-circle me-2"></i>Consejos de seguridad</h6>
                      <ul className="mb-0 small">
                        <li>Usa al menos 8 caracteres</li>
                        <li>Combina letras, números y símbolos</li>
                        <li>No uses información personal</li>
                        <li>Cambia tu contraseña regularmente</li>
                      </ul>
                    </div>
                  </div>
                </div>
      </ConfigModal>

      {/* Alert Component */}
      {alert.show && (
        <Alert 
          type={alert.type} 
          message={alert.message} 
          onClose={handleCloseAlert}
        />
      )}
    </div>
  );
};

export default SucursalConfiguracion;
