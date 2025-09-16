import React from 'react';

const LoadingSpinner = ({ message = "Cargando..." }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
      zIndex: 1000 
    }}>
      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
