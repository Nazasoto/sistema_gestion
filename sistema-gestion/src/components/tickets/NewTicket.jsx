import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import TicketService from '../../services/ticket.service';
import { FileService } from '../../services/file.service';
import AuthService from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './NewTicket.css';

// --- Validation Schema ---
const ticketSchema = yup.object({
  asunto: yup.string().required('El asunto es requerido'),
  detalleProblema: yup.string().required('El detalle del problema es requerido'),
  categoria: yup.string()
    .oneOf(['problemas_con_el_sigeco', 'problemas_de_impresion', 'control_de_caja', 'problemas_en_otras_aplicaciones', 'problemas_con_calificaciones','otros'], 'Selecciona una categoría válida')
    .required('La categoría es requerida'),
  urgencia: yup.string()
    .oneOf(['baja', 'media', 'alta', 'urgente'], 'Selecciona un nivel de urgencia válido')
    .required('La urgencia es requerida'),
});

const NewTicket = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Get authenticated user on component mount
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
      console.error('No hay usuario autenticado');
      navigate('/login');
      return;
    }
    
    // Verificar que el usuario tenga un ID válido
    const userId = currentUser.id || currentUser._id;
    if (!userId) {
      console.error('El usuario no tiene un ID válido:', currentUser);
      AuthService.logout();
      return;
    }
  }, [navigate]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(ticketSchema)
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date().toISOString();
      
      // Asegurarse de que no haya valores undefined
      const ticketData = {
        titulo: data.asunto || 'Sin título',
        descripcion: data.detalleProblema || 'Sin descripción',
        categoria: data.categoria || 'otros',
        prioridad: data.urgencia || 'media',
        estado: 'nuevo',
        // La sucursal se asignará automáticamente desde el perfil del usuario en el backend
        asignadoA: null, // Asegurar que sea null, no undefined
        fecha_creacion: now,
        fecha_actualizacion: now,
        archivos_adjuntos: [] // Inicializar el array de archivos adjuntos
      };
      
      // Manejar archivos si hay
      if (files.length > 0) {
        try {
          // Usar uploadFiles (plural) y pasar el array de archivos
          const uploadResponse = await FileService.uploadFiles(files);
          
          if (uploadResponse && uploadResponse.length > 0) {
            // Asegurarse de que solo guardamos las URLs válidas
            ticketData.archivos_adjuntos = uploadResponse
              .map(file => file.url || file.path || '')
              .filter(url => url);
          }
        } catch (uploadError) {
          console.error('Error al subir archivos:', uploadError);
          // Continuar sin archivos si hay error
        }
      }
      
      // Validar que no haya valores undefined en los datos finales
      Object.keys(ticketData).forEach(key => {
        if (ticketData[key] === undefined) {
          console.warn(`Campo ${key} es undefined, convirtiendo a null`);
          ticketData[key] = null;
        }
      });
      
      // Enviar el ticket
      const createdTicket = await TicketService.createTicket(ticketData);
      
      // Mostrar SweetAlert de éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Ticket creado exitosamente!',
        text: `Redirigiendo al historial...`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3b82f6',
        timer: 5000,
        timerProgressBar: true
      });
      
      // Limpiar formulario
      reset();
      setFiles([]);
      
      // Redirigir al historial
      navigate('/dashboard/sucursal/historial');
      
    } catch (error) {
      console.error('Error al crear el ticket:', error);
      setError(error.message || 'Error al crear el ticket. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setFiles([]);
    setError(null);
    setSuccess(false);
    setFileError(null);
    navigate('/dashboard');
  };

  return (
    <div className="new-ticket-container">
      <div className="ticket-header">
        <div className="header-content">
          <h1>Crear Nuevo Ticket</h1>
        </div>
      </div>
      
      {success && (
        <div className="success-notification">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <div>
              <h3>¡Ticket creado exitosamente!</h3>
              <p>Redirigiendo al historial...</p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-notification">
          <div className="error-content">
            <div className="error-icon">!</div>
            <div>
              <h3>Error al crear el ticket</h3>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="ticket-form">
        <div className="form-card">
          <div className="card-header">
            <h3>Descripción del Problema</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label htmlFor="asunto">Título del problema *</label>
              <input 
                type="text" 
                id="asunto" 
                {...register('asunto')} 
                placeholder="Ejemplo: No me funciona la impresora, está trabada..." 
                disabled={loading}
                className="form-input"
              />
              {errors.asunto && <div className="field-error">{errors.asunto.message}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="detalleProblema">Contanos qué pasó exactamente *</label>
              <textarea 
                id="detalleProblema" 
                {...register('detalleProblema')} 
                placeholder="Ejemplo: Estaba trabajando normal y de repente la impresora no imprime nada y sale un error '500' en la pantalla..."
                rows={5}
                disabled={loading}
                className="form-textarea"
              />
              {errors.detalleProblema && <div className="field-error">{errors.detalleProblema.message}</div>}
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="card-header">
            <h3>Categorización</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label htmlFor="categoria">Tipo de problema *</label>
              <select 
                id="categoria" 
                {...register('categoria')}
                disabled={loading}
                className="form-select"
              >
                <option value="">-- Seleccionar categoría --</option>
                <option value="problemas_en_otras_aplicaciones">Problemas en otras aplicaciones</option>
                <option value="problemas_de_impresion">Problemas de impresión</option>
                <option value="problemas_con_el_sigeco">Problemas con el SIGECO</option>
                <option value="problemas_con_calificaciones">No puedo calificar</option>
                <option value="control_de_caja">Control de caja</option>
                <option value="otros">Otros problemas</option>
              </select>
              {errors.categoria && <div className="field-error">{errors.categoria.message}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="urgencia">Nivel de urgencia *</label>
              <div className="urgency-section">
                <div className="urgency-options">
                  <div className="urgency-option">
                    <input 
                      type="radio" 
                      id="urgencia-baja"
                      value="baja" 
                      {...register('urgencia')}
                      disabled={loading}
                    />
                    <div className="urgency-card baja">
                      <div className="urgency-icon">🟢</div>
                      <div className="urgency-description">Puedo seguir trabajando normal</div>
                    </div>
                  </div>
                  
                  <div className="urgency-option">
                    <input 
                      type="radio" 
                      id="urgencia-media"
                      value="media" 
                      {...register('urgencia')}
                      disabled={loading}
                    />
                    <div className="urgency-card media">
                      <div className="urgency-icon">🟡</div>
                      <div className="urgency-description">Me complica un poco</div>
                    </div>
                  </div>
                  
                  <div className="urgency-option">
                    <input 
                      type="radio" 
                      id="urgencia-alta"
                      value="alta" 
                      {...register('urgencia')}
                      disabled={loading}
                    />
                    <div className="urgency-card alta">
                      <div className="urgency-icon">🟠</div>
                      <div className="urgency-description">Me complica mucho el trabajo</div>
                    </div>
                  </div>
                  
                  <div className="urgency-option">
                    <input 
                      type="radio" 
                      id="urgencia-urgente"
                      value="urgente" 
                      {...register('urgencia')}
                      disabled={loading}
                    />
                    <div className="urgency-card urgente">
                      <div className="urgency-icon">🔴</div>
                      <div className="urgency-description">No puedo trabajar</div>
                    </div>
                  </div>
                </div>
              </div>
              {errors.urgencia && <div className="field-error">{errors.urgencia.message}</div>}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            style={{textDecoration: 'none', backgroundColor: '#007bff', color: 'white'}}
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                Creando...
              </>
            ) : 'Crear Ticket'}
          </button>
          
          <button
            style={{textDecoration: 'none'}}
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTicket;