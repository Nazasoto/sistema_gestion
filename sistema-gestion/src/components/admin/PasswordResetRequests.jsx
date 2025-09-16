import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { getBaseUrl } from '../../utils/apiConfig';
import './PasswordResetRequests.css';

const PasswordResetRequests = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState(''); // 'reset' o 'reject'

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const apiUrl = getBaseUrl();
      const response = await fetch(`${apiUrl}/api/password-reset/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSolicitudes(data.solicitudes);
      } else {
        setError('Error cargando solicitudes');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (solicitud, tipo) => {
    setSelectedRequest(solicitud);
    setActionType(tipo);
    setNewPassword('');
    setAdminNotes('');
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setNewPassword('');
    setAdminNotes('');
    setActionType('');
  };

  const generarPasswordAleatoria = () => {
    const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const simbolos = '!@#$%^&*';
    
    // Asegurar al menos un carácter de cada tipo
    let password = '';
    password += mayusculas.charAt(Math.floor(Math.random() * mayusculas.length));
    password += minusculas.charAt(Math.floor(Math.random() * minusculas.length));
    password += numeros.charAt(Math.floor(Math.random() * numeros.length));
    password += simbolos.charAt(Math.floor(Math.random() * simbolos.length));
    
    // Completar hasta 12 caracteres
    const todosCaracteres = mayusculas + minusculas + numeros + simbolos;
    for (let i = 4; i < 12; i++) {
      password += todosCaracteres.charAt(Math.floor(Math.random() * todosCaracteres.length));
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const getPasswordStrength = (password) => {
    if (!password) return { text: 'Sin contraseña', class: 'weak', percentage: 0 };
    
    let score = 0;
    
    // Longitud
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    
    // Tipos de caracteres
    if (/[a-z]/.test(password)) score += 12.5;
    if (/[A-Z]/.test(password)) score += 12.5;
    if (/[0-9]/.test(password)) score += 12.5;
    if (/[^A-Za-z0-9]/.test(password)) score += 12.5;
    
    if (score < 40) return { text: 'Débil', class: 'weak', percentage: score };
    if (score < 70) return { text: 'Media', class: 'medium', percentage: score };
    return { text: 'Fuerte', class: 'strong', percentage: score };
  };

  const procesarSolicitud = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const apiUrl = getBaseUrl();
      
      if (actionType === 'reset') {
        if (!newPassword || newPassword.length < 8) {
          setError('La nueva contraseña debe tener al menos 8 caracteres');
          return;
        }
        
        const response = await fetch(`${apiUrl}/api/password-reset/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            requestId: selectedRequest.id,
            newPassword,
            adminNotes
          })
        });

        const data = await response.json();
        if (data.success) {
          alert(`✅ Contraseña actualizada para ${selectedRequest.nombre_completo}\n\nNueva contraseña: ${newPassword}\n\n⚠️ Comunica esta contraseña al usuario de forma segura.`);
          cargarSolicitudes();
          cerrarModal();
        } else {
          setError(data.message);
        }
      } else if (actionType === 'reject') {
        if (!adminNotes) {
          setError('El motivo de rechazo es requerido');
          return;
        }

        const response = await fetch(`${apiUrl}/api/password-reset/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            requestId: selectedRequest.id,
            adminNotes
          })
        });

        const data = await response.json();
        if (data.success) {
          alert(`❌ Solicitud rechazada para ${selectedRequest.nombre_completo}`);
          cargarSolicitudes();
          cerrarModal();
        } else {
          setError(data.message);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error procesando solicitud');
    }
  };

  const formatearFecha = (fecha) => {
    // La fecha viene de la DB como "2025-09-03 07:40:00" sin timezone
    // JavaScript la interpreta como UTC, pero es hora local Argentina
    
    // Crear fecha asumiendo que es hora local Argentina
    const fechaStr = fecha.replace(' ', 'T'); // Convertir a formato ISO
    const fechaObj = new Date(fechaStr);
    
    // Restar 3 horas para compensar la diferencia UTC-3 de Argentina
    const fechaCorregida = new Date(fechaObj.getTime() - (3 * 60 * 60 * 1000));
    
    return fechaCorregida.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
        <p className="mt-3">Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="password-reset-requests" style={{justifyContent: 'center'}}>
        <div className="header">
          <h2>🔑 Solicitudes de Cambio de Contraseña</h2>
          <button onClick={cargarSolicitudes} className="btn btn-secondary">
            <i className="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {solicitudes.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <h3>No hay solicitudes pendientes</h3>
          <p>Todas las solicitudes de cambio de contraseña han sido procesadas.</p>
        </div>
      ) : (
        <div className="requests-table">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Sucursal</th>
                <th>Motivo</th>
                <th>Fecha Solicitud</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(solicitud => (
                <tr key={solicitud.id}>
                  <td>
                    <div className="user-info">
                      <strong>{solicitud.nombre_completo}</strong>
                      <small>@{solicitud.usuario}</small>
                    </div>
                  </td>
                  <td>{solicitud.email}</td>
                  <td>{solicitud.sucursal}</td>
                  <td>{solicitud.motivo}</td>
                  <td>{formatearFecha(solicitud.requested_at)}</td>
                  <td>
                    <div className="actions">
                      <button 
                        onClick={() => abrirModal(solicitud, 'reset')}
                        className="btn btn-success btn-sm"
                        title="Resetear contraseña"
                        style={{textDecoration: 'none'}}
                      >
                        <i className="fas fa-key"></i> Resetear
                      </button>
                      <button 
                        onClick={() => abrirModal(solicitud, 'reject')}
                        className="btn btn-danger btn-sm"
                        title="Rechazar solicitud"
                        style={{textDecoration: 'none'}}
                      >
                        <i className="fas fa-times"></i> Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para procesar solicitud */}
      {showModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="">
            <div className="modal-header">
              <h3>
                {actionType === 'reset' ? '🔑 Resetear Contraseña' : '❌ Rechazar Solicitud'}
              </h3>
              <button onClick={cerrarModal} className="close-btn" style={{color: 'black', textDecoration: 'none', fontSize: '20px' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="user-details">
                <h4>Usuario: {selectedRequest.nombre_completo}</h4>
                <p><strong>Email:</strong> {selectedRequest.email}</p>
                <p><strong>Sucursal:</strong> {selectedRequest.sucursal}</p>
                <p><strong>Motivo:</strong> {selectedRequest.motivo}</p>
                <p><strong>Solicitado:</strong> {formatearFecha(selectedRequest.requested_at)}</p>
              </div>

              {actionType === 'reset' ? (
                <div className="reset-form">
                  <div className="form-group">
                    <label htmlFor="newPassword">
                      <i className="fas fa-key"></i> Nueva Contraseña
                    </label>
                    <div className="password-input-group">
                      <div>
                        <input
                        type="text"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ingresa nueva contraseña (mínimo 8 caracteres)"
                        className={`form-control ${newPassword.length > 0 && newPassword.length < 8 ? 'is-invalid' : newPassword.length >= 8 ? 'is-valid' : ''}`}
                        minLength="8"
                        required
                      />
                      </div>
                      <div style={{display: 'flex' , justifyContent: 'flex-end'}}>
                         <button 
                        type="button"
                        onClick={() => setNewPassword(generarPasswordAleatoria())}
                        className="btn btn-outline-primary"
                        title="Generar contraseña aleatoria segura"
                        style={{textDecoration: 'none'}}
                      >
                        <i className="fas fa-dice"></i> Generar
                      </button>
                      </div>
                     
                    </div>
                    {newPassword.length > 0 && newPassword.length < 8 && (
                      <div className="invalid-feedback">
                        <i className="fas fa-exclamation-triangle"></i>
                        La contraseña debe tener al menos 8 caracteres
                      </div>
                    )}
                    {newPassword.length >= 8 && (
                      <div className="valid-feedback">
                        <i className="fas fa-check-circle"></i>
                        Contraseña válida
                      </div>
                    )}
                  </div>
                  
                  <div className="password-strength">
                    <div className="strength-label">
                      <span>Seguridad de la contraseña:</span>
                      <span className={`strength-indicator ${getPasswordStrength(newPassword).class}`}>
                        {getPasswordStrength(newPassword).text}
                      </span>
                    </div>
                    <div className="strength-bar">
                      <div 
                        className={`strength-fill ${getPasswordStrength(newPassword).class}`}
                        style={{width: `${getPasswordStrength(newPassword).percentage}%`}}
                      ></div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="reject-form">
                  <div className="form-group">
                    <label htmlFor="rejectReason">Motivo del Rechazo</label>
                    <textarea
                      id="rejectReason"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Explica por qué se rechaza la solicitud..."
                      className="form-control"
                      rows="4"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" >
              <button onClick={cerrarModal} className="btn" style={{textDecoration: 'none', color: 'black'}}>
                Cancelar
              </button>
              <button 
                style={{textDecoration: 'none', color: 'black'}}
                onClick={procesarSolicitud} 
                className={`btn ${actionType === 'reset' ? 'btn-success' : 'btn-danger'}`}
              >
                {actionType === 'reset' ? (
                  <><i className="fas fa-key"></i> Resetear Contraseña</>
                ) : (
                  <><i className="fas fa-times"></i> Rechazar Solicitud</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PasswordResetRequests;
