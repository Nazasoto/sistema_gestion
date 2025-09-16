import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const SessionExpired = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionExpired = searchParams.get('sessionExpired') === 'true';

  useEffect(() => {
    if (sessionExpired) {
      // Limpiar cualquier estado de autenticación
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
  }, [sessionExpired]);

  if (!sessionExpired) {
    navigate('/login');
    return null;
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Sesión Expirada</h2>
        <div className="alert alert-warning">
          Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
        </div>
        <button 
          className="btn btn-primary btn-block"
          onClick={() => navigate('/login')}
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    </div>
  );
};

export default SessionExpired;
