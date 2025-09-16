import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { getBaseUrl } from '../../utils/apiConfig';
import './AuthForms.css';

const ForgotPassword = () => {
  const [usuario, setUsuario] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // Validación básica
    if (!usuario) {
      setError('Por favor ingresa tu nombre de usuario');
      return;
    }

    // Validar que no esté vacío y tenga al menos 3 caracteres
    if (usuario.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getBaseUrl();
      const response = await fetch(`${apiUrl}/api/password-reset/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          usuario,
          motivo: 'Contraseña olvidada - Solicitud desde formulario web'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Solicitud enviada al equipo de soporte. Te contactaremos pronto con tu nueva contraseña.');
        setEmailSent(true);
      } else {
        // Manejar diferentes tipos de errores
        if (response.status === 400) {
          setError(data.message || 'Error en los datos proporcionados');
        } else {
          setError(data.message || 'Error al crear la solicitud');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-form-container">
          
          <h2>SOLICITUD ENVIADA</h2>
          
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <p>{message}</p>
          </div>
          
          <div className="auth-footer">
            <p>
              <Link to="/login">Volver al inicio de sesión</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        
        
        <h2>RECUPERAR CONTRASEÑA</h2>
        <p className="auth-subtitle">
          Ingresá tu nombre de usuario y el equipo de soporte te ayudará a recuperar tu contraseña.
        </p>
        
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-info">{message}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="usuario">Nombre de Usuario</label>
            <input
              type="text"
              id="usuario"
              className="form-control"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="tu_usuario"
              required
              disabled={isLoading}
            />
          </div>
          
          <button 
            style={{textDecoration: 'none'}}
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                Enviando...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i> Enviar Solicitud
              </>
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            ¿Te acordaste de tu contraseña? <Link to="/login">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
