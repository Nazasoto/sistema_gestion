import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, 
  faSearch, 
  faFilter,
  faInfoCircle,
  faSignInAlt,
  faSignOutAlt,
  faExclamationTriangle,
  faTicketAlt,
  faUserCheck,
  faCheckCircle,
  faExchangeAlt,
  faShieldAlt,
  faQuestionCircle,
  faUser,
  faTimes,
  faTrash,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import bitacoraService from '../../../services/bitacora.service';
import './bitacora.css';

const BitacoraPage = () => {
  const { user } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: '',
    severidad: '',
    sucursal: '',
    fechaDesde: '',
    fechaHasta: '',
    busqueda: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    cargarEventos();
  }, [filtros]);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      const response = await bitacoraService.getEventos(filtros);
      setEventos(response.eventos || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      tipo: '',
      severidad: '',
      sucursal: '',
      fechaDesde: '',
      fechaHasta: '',
      busqueda: ''
    });
  };

  const limpiarBitacora = async () => {
    try {
      setClearingLogs(true);
      await bitacoraService.limpiarBitacora();
      setEventos([]);
      setShowConfirmModal(false);
      // Mostrar mensaje de éxito (opcional)
      alert('Bitácora limpiada exitosamente');
    } catch (error) {
      console.error('Error limpiando bitácora:', error);
      let errorMessage = 'Error al limpiar la bitácora';
      
      if (error.message.includes('administradores')) {
        errorMessage = 'Solo los administradores, supervisores y soporte pueden limpiar la bitácora';
      } else {
        errorMessage = 'Error al limpiar la bitácora: ' + error.message;
      }
      
      setShowToast({
        show: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setClearingLogs(false);
      setShowConfirmModal(false);
    }
  };

  const getIconoTipo = (tipo) => {
    const iconos = {
      'login': faUser,
      'error': faExclamationTriangle,
      'ticket_creado': faTicketAlt,
      'ticket_asignado': faTicketAlt,
      'ticket_resuelto': faTicketAlt,
      'ticket_cancelado': faTicketAlt,
      'reasignacion': faTicketAlt,
      'rate_limit': faShieldAlt,
      'seguridad': faShieldAlt
    };
    return iconos[tipo] || faInfoCircle;
  };

  const getColorSeveridad = (severidad) => {
    const colores = {
      'info': '#17a2b8',
      'warning': '#ffc107',
      'error': '#dc3545',
      'critical': '#6f42c1'
    };
    return colores[severidad] || '#6c757d';
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bitacora-container">
      <div className="bitacora-header">
        
        <button 
          style={{textDecoration: 'none'}}
          className="btn btn-outline-info btn-sm"
          onClick={() => setShowHelpModal(true)}
          title="Ayuda sobre la bitácora"
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="me-1" />
          Documentación
        </button>
        
        <div className="header-actions">
          <button 
            style={{textDecoration: 'none'}}
            className="btn btn-outline-primary me-2"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FontAwesomeIcon icon={faFilter} className="me-2" />
            Filtros
          </button>
          
          {(user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'soporte') && (
            <button 
              style={{textDecoration: 'none'}}
              className="btn btn-outline-danger"
              onClick={() => setShowConfirmModal(true)}
              title="Limpiar toda la bitácora"
            >
              <FontAwesomeIcon icon={faTrash} className="me-2" />
              Limpiar 
            </button>
          )}
        </div>
      </div>

      {/* Panel de Filtros */}
      {mostrarFiltros && (
        <div className="filtros-panel">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Tipo de Evento</label>
              <select 
                className="form-select"
                value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="login">Login</option>
                <option value="error">Errores</option>
                <option value="ticket_creado">Ticket Creado</option>
                <option value="ticket_asignado">Ticket Asignado</option>
                <option value="ticket_resuelto">Ticket Resuelto</option>
                <option value="reasignacion">Reasignación</option>
                <option value="seguridad">Seguridad</option>
              </select>
            </div>
            
            <div className="col-md-2">
              <label className="form-label">Severidad</label>
              <select 
                className="form-select"
                value={filtros.severidad}
                onChange={(e) => setFiltros({...filtros, severidad: e.target.value})}
              >
                <option value="">Todas</option>
                <option value="info">Normal</option>
                <option value="warning">Atención</option>
                <option value="error">Errores</option>
                <option value="critical">Problemas criticos</option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Sucursal</label>
              <input 
                type="text"
                className="form-control"
                placeholder="Ej: 001"
                value={filtros.sucursal}
                onChange={(e) => setFiltros({...filtros, sucursal: e.target.value})}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input 
                type="date"
                className="form-control"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input 
                type="date"
                className="form-control"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
              />
            </div>

            <div className="col-md-1 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary"
                onClick={limpiarFiltros}
                title="Limpiar filtros"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <FontAwesomeIcon icon={faSearch} />
                </span>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Buscar en descripción..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Eventos */}
      <div className="eventos-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        ) : eventos.length === 0 ? (
          <div className="no-eventos">
            <FontAwesomeIcon icon={faHistory} size="3x" className="text-muted mb-3" />
            <h5>No hay eventos para mostrar</h5>
            <p className="text-muted">Ajustá los filtros para ver más resultados</p>
          </div>
        ) : (
          <div className="eventos-lista">
            {eventos.map((evento) => (
              <div key={evento.id} className="evento-card">
                <div className="evento-icon">
                  <FontAwesomeIcon 
                    icon={getIconoTipo(evento.tipo_evento)} 
                    style={{ color: getColorSeveridad(evento.severidad) }}
                  />
                </div>
                
                <div className="evento-content">
                  <div className="evento-header">
                    <span className="evento-tipo">{evento.tipo_evento.replace('_', ' ')}</span>
                    <span 
                      className="evento-severidad"
                      style={{ 
                        backgroundColor: getColorSeveridad(evento.severidad),
                        color: 'white'
                      }}
                    >
                      {evento.severidad}
                    </span>
                  </div>
                  
                  <div className="evento-descripcion">
                    {evento.descripcion}
                  </div>
                  
                  <div className="evento-meta">
                    <span className="evento-fecha">
                      {formatearFecha(evento.fecha_evento)}
                    </span>
                    {evento.sucursal && (
                      <span className="evento-sucursal">
                        Sucursal: {evento.sucursal}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Ayuda */}
      {showHelpModal && (
        <div 
          className="moda fade show" 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.43)',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.3s ease-out',
            zIndex: 9999
          }}
        >
          <div className="modal-dialog" style={{ width: '25%', height: '100%', maxWidth: 'none', margin: 0 }}>
            <div 
              className="modal-content" 
              style={{ 
                width: '100%',
                height: '100%',
                borderRadius: '15px',
                border: 'none',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
                animation: 'slideInDown 0.4s ease-out',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div 
                className="modal-header" 
                style={{ 
                  background: 'linear-gradient(135deg,rgb(5, 76, 157) 0%,rgb(5, 76, 157) 100%)',
                  color: 'white',
                  borderRadius: '15px 15px 0 0',
                  padding: '1.5rem 2rem',
                  border: 'none'
                }}
              >
                <h4 className="modal-title fw-bold mb-0">
                  <FontAwesomeIcon icon={faQuestionCircle} className="me-3" style={{ fontSize: '1.5rem' }} />
                  Bitácora 
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowHelpModal(false)}
                  style={{ 
                    fontSize: '1.2rem',
                    opacity: 0.8
                  }}
                ></button>
              </div>
              <div 
                className="modal-body" 
                style={{ 
                  padding: '2rem',
                  flex: 1,
                  overflowY: 'auto',
                }}
              >
                <div className="row g-4">
                  <div className="col-md-6">
                    <div 
                      className="card h-100" 
                      style={{ 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                      }}
                    >
                      <div className="card-body p-4" style={{ margin: '10px' }}>
                        <h5 className="card-title fw-bold mb-4 text-primary" style={{ textAlign: 'center', fontSize: '1rem' }}>
                          Tipos de Eventos
                        </h5>
                        
                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#f0f8f0', border: '1px solid #d4edda' }}>
                          <div className="d-flex align-items-center mb-2">
                            <strong className="text-success">Login:</strong>
                          </div>
                          <small className="text-muted ms-4">Cuando alguien entra al sistema</small>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                          <div className="d-flex align-items-center mb-2">
                            <strong className="text-warning">Errores:</strong>
                          </div>
                          <small className="text-muted ms-4">Cuando algo se rompe en el sistema</small>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
                          <div className="d-flex align-items-center mb-2">
                            <strong className="text-primary">Tickets:</strong>
                          </div>
                          <small className="text-muted ms-4">Creación, asignación y resolución de tickets</small>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#ffebee', border: '1px solid #ffcdd2' }}>
                          <div className="d-flex align-items-center mb-2">
                            <strong className="text-danger">Seguridad:</strong>
                          </div>
                          <small className="text-muted ms-4">Intentos de acceso no autorizado</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div 
                      className="card h-100" 
                      style={{ 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                      }}
                    >
                      <div className="card-body p-4"> 
                        <h5 className="card-title fw-bold mb-4 text-primary" style={{ textAlign: 'center', fontSize: '1rem' }}>
                          Niveles de Severidad
                        </h5>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3' }}>
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-info me-3 px-3 py-2" style={{ fontSize: '0.9rem' }}>Normal</span>
                          </div>
                          <small className="text-muted">Actividad normal del sistema. Todo funciona bien.</small>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff8e1', border: '1px solid #ffc107' }}>
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-warning me-3 px-3 py-2" style={{ fontSize: '0.9rem' }}>Atención</span>
                          </div>
                          <small className="text-muted">Situación que necesita atención pero no es crítica.</small>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#ffebee', border: '1px solid #f44336' }}>
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-danger me-3 px-3 py-2" style={{ fontSize: '0.9rem' }}>Errores</span>
                          </div>
                          <small className="text-muted">Problemas que afectan el funcionamiento del sistema.</small>
                        </div>

                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#f3e5f5', border: '1px solid #9c27b0' }}>
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-dark me-3 px-3 py-2" style={{ fontSize: '0.9rem' }}>Críticos</span>
                          </div>
                          <small className="text-muted">Situaciones graves que requieren atención inmediata.</small>
                        </div>

                        <hr className="my-4" />
                      </div>
                    </div>

                    <div 
                      className="card" 
                      style={{ 
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        background: 'white'
                      }}
                    >
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-3">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" size="lg" />
                          <h5 className="card-title fw-bold mb-0 text-warning" style={{ fontSize: '1.1rem', textAlign: 'center' }}>
                            Limpieza de la bitacora
                          </h5>
                        </div>
                        
                        <div className="mb-3">
                          <p className="mb-2 fw-semibold text-dark" style={{ fontSize: '1.2rem' }}>¿Por qué es necesario limpiar la bitácora mensualmente?</p>
                          <ul className="list-unstyled ms-3" style={{ listStyleType: 'none', fontSize: '1.2rem' }}>
                            <li className="mb-2">
                              <strong style={{textDecoration: 'underline'}}>Rendimiento:</strong> Es mas que nada para evitar que la base de datos se sobrecargue con tantos de registros
                            </li>
                          </ul>
                        </div>

                        <div className="alert alert-danger py-2 px-3 mb-0" style={{ fontSize: '0.9rem' }}>
                          <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
                          <strong style={{fontSize: '1rem', textDecoration: 'underline'}}>importante:</strong> Los datos eliminados no se van a poder recuperados. 
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                className="modal-footer" 
                style={{ 
                  padding: '1.5rem 2rem',
                  borderRadius: '0 0 15px 15px',
                  border: 'none'
                }}
              >
                <button 
                  type="button" 
                  className="btn btn-lg px-4"
                  style={{
                    background: 'linear-gradient(135deg, rgb(5, 76, 157) 0%, rgb(5, 76, 157) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    textDecoration: 'none'
                  }}
                  onClick={() => setShowHelpModal(false)}
                >
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  Leído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Limpiar Bitácora */}
      {showConfirmModal && (
        <div 
          className=" fade show" 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.3s ease-out',
            zIndex: 9999
          }}
        >
          <div className="modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title" style={{fontSize: '1rem'}}>
                  <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
                  ¿Seguro que querés borrar los datos?
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={clearingLogs}
                />
              </div>
              <div className="modal-footer">
                <button 
                  style={{textDecoration: 'none', color: 'black'}}
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={clearingLogs}
                >
                  Cancelar
                </button>
                <button 
                  style={{textDecoration: 'none', color: 'black'}}
                  type="button" 
                  className="btn btn-danger"
                  onClick={limpiarBitacora}
                  disabled={clearingLogs}
                >
                  {clearingLogs ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Limpiando...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTrash} className="me-2" />
                      Sí, Limpiar Todo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BitacoraPage;
