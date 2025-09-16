import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validación básica
    if (!username || !password) {
      setError('Por favor ingresa tu usuario y contraseña');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Intentando iniciar sesión...');
      const result = await login(username, password);
      
      if (result.success) {
        console.log('Inicio de sesión exitoso, redirigiendo...');
        navigate('/dashboard');
      } else {
        const errorMsg = result.error || 'No se pudo iniciar sesión. Por favor, verifica tus credenciales.';
        setError(errorMsg);
      }
    } catch (error) {
      const errorMessage = error.message || 
                         error.response?.data?.message || 
                         'Error al conectar con el servidor. Por favor, inténtalo de nuevo más tarde.';
      console.error('Error en el inicio de sesión:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container" style={{borderRadius: '20px', border: '1px solid #ccc', boxShadow: '0 12px 100px rgba(0, 0, 0, 0.1)'}}>
        
        <h2>INICIAR SESIÓN</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
              placeholder="Ingresa tu nombre de usuario"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            style={{borderRadius: '10px', background: '#007bff', border: 'none', color: 'white', textDecoration: 'none', fontSize: '20px'}}
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="auth-footer" style={{ textAlign: 'center' }} >
          <p>
            <Link to="/forgot-password">Olvidé mi contraseña</Link>
          </p>
          <p>
            ¿No tenés cuenta? <Link to="/register">Solicitar registro</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
