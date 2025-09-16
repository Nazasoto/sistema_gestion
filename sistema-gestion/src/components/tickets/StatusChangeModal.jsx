import React, { useState, useCallback, memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCheckCircle,
  faEdit,
  faExclamationTriangle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

const StatusChangeModal = memo(({ 
  show, 
  ticket, 
  onClose, 
  onSubmit, 
  getEstadosDisponibles, 
  obtenerIconoEstado 
}) => {
  const [comentario, setComentario] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [errorComentario, setErrorComentario] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      // No cerrar si hay texto en el comentario
      if (comentario.trim()) {
        return;
      }
      setComentario('');
      setNuevoEstado('');
      setErrorComentario('');
      setPosition({ x: 0, y: 0 });
      onClose();
    }
  }, [isSubmitting, onClose, comentario]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.modal-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limitar el movimiento dentro de la ventana
      const maxX = window.innerWidth - 600; // Ancho aproximado del modal
      const maxY = window.innerHeight - 400; // Alto aproximado del modal
      
      setPosition({
        x: Math.max(-300, Math.min(maxX, newX)),
        y: Math.max(-200, Math.min(maxY, newY))
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Agregar event listeners para el drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!nuevoEstado) {
      setErrorComentario('Por favor seleccione un estado');
      return;
    }
    if (!comentario.trim()) {
      setErrorComentario('Por favor ingrese un comentario');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(nuevoEstado, comentario.trim());
      handleClose();
    } catch (error) {
      setErrorComentario('Error al cambiar el estado del ticket');
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevoEstado, comentario, onSubmit, handleClose]);

  if (!show || !ticket) return null;

  const estadosDisponibles = getEstadosDisponibles(ticket.estado);

  return (
    <div 
      className="fade show d-block" 
      style={{ 
        backgroundColor: 'transparent',
        boxShadow: 'none',
        zIndex: 1060,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // No cerrar si hay texto en el comentario
          if (comentario.trim()) {
            return;
          }
          handleClose();
        }
      }}
    >
      <div 
        className="modal-dialog modal-lg"
        style={{
          width: '38%',
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
          position: 'relative',
          margin: '50px auto',
          transition: isDragging ? 'none' : 'transform 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <div className="modal-content">
          {/* Header */}
          <div 
            className="modal-header"
            style={{
              cursor: 'grab',
              userSelect: 'none'
            }}
          >
            <h4 className="modal-title fw-bold d-flex align-items-center">
              <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
              Cambiar Estado - Ticket #{ticket.id}
            </h4>
            <button 
              style={{
                fontSize: '40px',
                textDecoration: 'none'
              }}
              type="button" 
              className="btn-close" 
              onClick={handleClose}
              disabled={isSubmitting}
            />
          </div>
          
          {/* Body */}
          <div className="modal-body p-4">
            <form onSubmit={handleSubmit}>
              {/* Información del ticket */}
              <div className="mb-3">
                <div className="alert alert-info" style={{fontSize: '20px'}}>
                  <strong>Titulo:</strong> {ticket.titulo}<br/>
                  <strong>Estado actual:</strong> <span className="badge bg-secondary">{ticket.estado}</span><br/>
                </div>
              </div>

              {/* Selector de estado */}
              <div className="mb-3">
                <label htmlFor="nuevoEstado" className="form-label">
                  <strong style={{fontSize: '20px'}}>Cambiar estado a:</strong>
                </label>
                <select
                  style={{fontSize: '16px', border: '1px solid #ccc', borderRadius: '5px', padding: '5px', width: '100%', height: '40px', color: '#333', boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)'}}
                  id="nuevoEstado"
                  className="form-select"
                  value={nuevoEstado}
                  onChange={(e) => {
                    setNuevoEstado(e.target.value);
                    if (errorComentario) setErrorComentario('');
                  }}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Seleccionar nuevo estado...</option>
                  {estadosDisponibles.map((estado) => {
                    return (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Comentario */}
              <div className="mb-3" style={{ marginTop: '1rem' }}>
                <label htmlFor="comentario" className="form-label">
                  Comentario:
                </label>
                <textarea
                  id="comentario"
                  className="form-control"
                  rows="3"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Describe el motivo del cambio de estado..."
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <div className="form-text" style={{fontSize:'12px'}}>
                  {comentario.length}/500 caracteres
                </div>
              </div>

              {/* Error */}
              {errorComentario && (
                <div className="alert alert-danger">
                  {errorComentario}
                </div>
              )}

              {/* Botones */}
              <div className="d-flex justify-content-end gap-2">
                <button
                  style={{
                    fontSize:'18px', 
                    backgroundColor: 'white', 
                    textDecoration: 'none'
                  }}
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    fontSize:'18px', 
                    backgroundColor: 'white', 
                    textDecoration: 'none'
                  }}
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !comentario.trim() || !nuevoEstado}
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faEdit} className="me-2" />
                      Cambiar Estado
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

StatusChangeModal.displayName = 'StatusChangeModal';

export default StatusChangeModal;
