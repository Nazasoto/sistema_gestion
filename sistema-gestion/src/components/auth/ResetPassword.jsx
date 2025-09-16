import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import './AuthForms.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación inválido o expirado');
    }
  }, [token]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'La contraseña debe contener al menos una letra minúscula';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'La contraseña debe contener al menos una letra mayúscula';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'La contraseña debe contener al menos un número';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'La contraseña debe contener al menos un carácter especial (@$!%*?&)';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!token) {
      setError('Token de recuperación inválido');
      return;
    }
    
    if (!password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          newPassword: password 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPasswordReset(true);
        setMessage('Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Error al restablecer la contraseña');
      }
    } catch (error) {
      console.error('Error en restablecimiento de contraseña:', error);
      setError('Error al conectar con el servidor. Por favor, inténtalo de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  if (passwordReset) {
    return (
      <div className="auth-container">
        <div className="auth-form-container">
          <div className="beta-banner">
            <span className="beta-text">Versión Beta</span>
          </div>
          
          <h2>CONTRASEÑA ACTUALIZADA</h2>
          
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <p>{message}</p>
            <p><small>Serás redirigido al inicio de sesión en unos segundos...</small></p>
          </div>
          
          <div className="auth-footer">
            <p>
              <Link to="/login">Ir al inicio de sesión ahora</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <div className="beta-banner">
          <span className="beta-text">Versión Beta</span>
        </div>
        
        <h2>NUEVA CONTRASEÑA</h2>
        <p className="auth-subtitle">
          Ingresa tu nueva contraseña. Debe ser segura y fácil de recordar.
        </p>
        
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-info">{message}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">Nueva Contraseña</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              disabled={isLoading || !token}
            />
            <small className="form-text text-muted">
              Debe contener: mayúscula, minúscula, número y carácter especial
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={isLoading || !token}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isLoading || !token}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                Actualizando...
              </>
            ) : (
              <>
                <i className="fas fa-key"></i> Actualizar Contraseña
              </>
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            ¿Recordaste tu contraseña? <Link to="/login">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
