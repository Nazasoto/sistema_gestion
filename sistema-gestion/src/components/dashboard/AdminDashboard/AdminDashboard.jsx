import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PasswordResetRequests from '../../admin/PasswordResetRequests';
import './AdminDashboard.css';

const AdminDashboard = ({ stats = {}, recentTickets = [] }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <div className="stats-container">
              <div className="stat-card">
                <h3>Total de Tickets</h3>
                <p className="stat-number">{stats.totalTickets || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Abiertos</h3>
                <p className="stat-number">{stats.openTickets || 0}</p>
              </div>
              <div className="stat-card">
                <h3>En Progreso</h3>
                <p className="stat-number">{stats.inProgressTickets || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Cerrados</h3>
                <p className="stat-number">{stats.closedTickets || 0}</p>
              </div>
            </div>
            
            <div className="recent-tickets">
              <h3>Tickets Recientes</h3>
              <div className="tickets-list">
                {recentTickets.length > 0 ? (
                  recentTickets.map(ticket => (
                    <div key={ticket.id} className="ticket-card">
                      <h4>{ticket.titulo}</h4>
                      <p>Estado: {ticket.estado}</p>
                      <p>Prioridad: {ticket.prioridad}</p>
                      <Link to={`/tickets/${ticket.id}`} className="btn btn-primary">Ver Detalles</Link>
                    </div>
                  ))
                ) : (
                  <p>No hay tickets recientes.</p>
                )}
              </div>
            </div>
          </>
        );
      case 'password-reset':
        return <PasswordResetRequests />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Panel de Administración</h2>
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <i className="fas fa-chart-bar"></i> Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'password-reset' ? 'active' : ''}`}
            onClick={() => setActiveTab('password-reset')}
          >
            <i className="fas fa-key"></i> Reset de Contraseñas
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
