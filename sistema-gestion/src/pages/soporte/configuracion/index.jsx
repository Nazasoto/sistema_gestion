import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import configService from '../../../services/config.service';

const ConfiguracionPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Cargar perfil del usuario
        const profile = await configService.getProfile();
        
        // Cargar preferencias
        const notificationPrefs = await configService.getNotificationPreferences();
        const theme = await configService.getTheme();

        setFormData({
          nombre: profile.nombre || '',
          apellido: profile.apellido || '',
          email: profile.email || '',
          telefono: profile.telefono || '',
        });
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const profileUpdates = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono
      };

      await configService.updateProfile(profileUpdates);
      showMessage('success', 'Perfil actualizado correctamente');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // const handleNotificationsSubmit = async (e) => {
  //   e.preventDefault();
  //   try {
  //     setSaving(true);
      
  //     await configService.saveNotificationPreferences(formData.notificaciones); //TODO: Se comenta de forma momentanea porque no se implementa en el backend
      
  //     showMessage('success', 'Preferencias guardadas correctamente');
  //   } catch (error) {
  //     showMessage('error', error.message);
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setSaving(true);
      
      await configService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      showMessage('success', 'Contraseña cambiada correctamente');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="section-title mb-4">Configuración</h2>

      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      <div className="row">
        <div className="col-md-3">
          <div className="list-group" style={{textAlign: 'right'}}>
            <button 
              style={{fontSize: '1.5rem', textDecoration: 'none'}}
              className={`list-group-item list-group-item-action ${activeTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('perfil')}
            >
              PERFIL
            </button>
            <button 
              style={{fontSize: '1.5rem', textDecoration: 'none'}}
              className={`list-group-item list-group-item-action ${activeTab === 'seguridad' ? 'active' : ''}`}
              onClick={() => setActiveTab('seguridad')}
            >
              SEGURIDAD
            </button>
          </div>
        </div>

        <div className="col-md-9">
          <div className="card">
            <div className="card-body">
              {activeTab === 'perfil' && (
                <form onSubmit={handleProfileSubmit}>
                  <h5>Información del Perfil</h5>
                  <hr />
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Nombre</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Apellido</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Teléfono</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="+54 9 11 1234-5678"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Rol</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={user?.role || 'N/A'}
                      disabled
                    />
                    <div className="form-text">El rol no puede ser modificado desde acá</div>
                  </div>
                  
                  <button type="submit" className="btn" disabled={saving}>
                    {saving ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </form>
              )}

              {activeTab === 'seguridad' && (
                <form onSubmit={handlePasswordSubmit}>
                  <h5><i className="fas fa-lock me-2"></i>Cambiar Contraseña</h5>
                  <hr />
                  
                  <div className="mb-3">
                    <label className="form-label">Contraseña Actual</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Nueva Contraseña</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      minLength="6"
                      required
                    />
                    <div className="form-text">La contraseña debe tener al menos 6 caracteres.</div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      minLength="6"
                      required
                    />
                  </div>
                  
                  <button type="submit" className="btn" disabled={saving}>
                    {saving ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key me-2"></i>
                        Cambiar Contraseña
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionPage;
