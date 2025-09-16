import React from 'react';
import './CustomModal.css';

const CustomModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium'
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={handleOverlayClick}>
      <div className={`custom-modal ${size}`}>
        <div className="custom-modal-header">
          <h3 className="custom-modal-title">{title}</h3>
          <button 
            style={{
              fontSize: '40px',
              textDecoration: 'none'
            }}
            className="custom-modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="custom-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
