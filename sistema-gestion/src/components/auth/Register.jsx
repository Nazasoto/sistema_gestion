import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AuthForms.css';

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    usuario: '',
    password: '',
    confirmPassword: '',
    sucursal: '',
    telefono: ''
  });
  const [selectedSucursalInfo, setSelectedSucursalInfo] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const navigate = useNavigate();

  // Cargar sucursales disponibles
  useEffect(() => {
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
          console.log('Sucursales cargadas:', data);
          // Ordenar sucursales por número de sucursal (numéricamente)
          const sucursalesOrdenadas = data.sort((a, b) => {
            return parseInt(a.nro_sucursal) - parseInt(b.nro_sucursal);
          });
          setSucursales(sucursalesOrdenadas);
        } else {
          console.error('Error en respuesta de sucursales:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error cargando sucursales:', error);
      }
    };
    fetchSucursales();
  }, []);

  // Verificar disponibilidad de usuario
  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : (import.meta.env.PROD 
          ? 'https://soporte-backend-production.up.railway.app/api' 
          : 'http://localhost:3001/api');
      const response = await fetch(`${apiUrl}/auth/check-username/${username}`);
      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.available);
      }
    } catch (error) {
      console.error('Error verificando usuario:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generar usuario basado en nombre y apellido
    if (name === 'nombre' || name === 'apellido') {
      if (!formData.usuario && formData.nombre && formData.apellido) {
        const autoUsername = (formData.nombre.charAt(0) + formData.apellido)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        setFormData(prev => ({
          ...prev,
          usuario: autoUsername
        }));
        checkUsername(autoUsername);
      }
    }

    // Manejar selección de sucursal
    if (name === 'sucursal') {
      const sucursalSeleccionada = sucursales.find(s => s.nro_sucursal === value);
      setSelectedSucursalInfo(sucursalSeleccionada || null);
    }

    // Verificar disponibilidad de usuario
    if (name === 'usuario') {
      checkUsername(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones
    if (!formData.nombre || !formData.apellido || !formData.password || !formData.sucursal) {
      setError('Todos los campos obligatorios deben ser completados');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (usernameAvailable === false) {
      setError('El nombre de usuario no está disponible');
      return;
    }

    try {
      setIsLoading(true);
      
      const apiUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : (import.meta.env.PROD 
          ? 'https://soporte-backend-production.up.railway.app/api' 
          : 'http://localhost:3001/api');
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          usuario: formData.usuario,
          password: formData.password,
          sucursal: formData.sucursal,
          telefono: formData.telefono
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        // Limpiar formulario
        setFormData({
          nombre: '',
          apellido: '',
          usuario: '',
          password: '',
          confirmPassword: '',
          sucursal: '',
          telefono: ''
        });
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Error en el registro');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        
        <h2>SOLICITAR ACCESO</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        {success && (
          <div className="alert alert-success">
            {success}
            <br />
            <small>Serás redirigido al login en unos segundos...</small>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombre">Nombre *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                className="form-control"
                value={formData.nombre}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="apellido">Apellido *</label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                className="form-control"
                value={formData.apellido}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email-info">Email</label>
            <div className="form-control-static">
              {selectedSucursalInfo ? (
                <span className="text-success">
                  📧 Se asignará automáticamente: <strong>{selectedSucursalInfo.mail || 'Email no disponible'}</strong>
                </span>
              ) : (
                <span className="text-muted">Selecciona una sucursal para ver el email asignado</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="usuario">
              Usuario {usernameAvailable === true && <span className="text-success">✓ Disponible</span>}
              {usernameAvailable === false && <span className="text-danger">✗ No disponible</span>}
            </label>
            <input
              type="text"
              id="usuario"
              name="usuario"
              className="form-control"
              value={formData.usuario}
              onChange={handleInputChange}
              placeholder="Se genera automáticamente pero puede ser modificado"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Contraseña *</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="6"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-control"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="sucursal">Sucursal *</label>
            <select
              id="sucursal"
              name="sucursal"
              className="form-control"
              value={formData.sucursal}
              onChange={handleInputChange}
              required
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map(sucursal => (
                <option key={sucursal.nro_sucursal} value={sucursal.nro_sucursal}>
                  {sucursal.nro_sucursal} - {sucursal.nombre} ({sucursal.localidad}, {sucursal.provincia})
                </option>
              ))}
            </select>
            {selectedSucursalInfo && (
              <div className="sucursal-info mt-2">
                <small className="text-muted">
                  📍 {selectedSucursalInfo.localidad}, {selectedSucursalInfo.provincia}
                </small>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              className="form-control"
              value={formData.telefono}
              onChange={handleInputChange}
              placeholder="Tiene que ser de la sucursal"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isLoading || usernameAvailable === false}
          >
            {isLoading ? 'Enviando solicitud...' : 'Solicitar Registro'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta? <Link to="/login">Iniciar Sesión</Link>
          </p>
          <small className="text-muted">
            * Tu solicitud será revisada por el equipo de soporte antes de activar tu cuenta.
          </small>
        </div>
      </div>
    </div>
  );
};

export default Register;
