import React from 'react';
import './ConfigModal.css';

const ConfigModal = ({ 
  isOpen, 
  onClose, 
  title, 
  icon, 
  iconColor = '#007bff',
  children,
  size = 'lg' 
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="config-modal-overlay" onClick={handleBackdropClick}>
        <div className={`config-modal config-modal-${size}`} onClick={(e) => e.stopPropagation()}>
          <div className="config-modal-header">
            <div className="config-modal-title">
              {icon && (
                <div className="config-modal-icon" style={{ color: iconColor }}>
                  {icon}
                </div>
              )}
              <h3>{title}</h3>
            </div>
            <button 
              className="config-modal-close" 
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="config-modal-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfigModal;
