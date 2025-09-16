import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { useAuth } from '../../../context/AuthContext';

const getMenuItems = (role = 'soporte') => {
  let items = [
    {
      id: 0,
      title: 'Inicio',
      path: '/dashboard/soporte',
    },
    {
      id: 1,
      title: 'Tickets',
      path: '/dashboard/soporte/bandeja',
    },
    {
      id: 2,
      title: 'Movimientos',
      path: '/dashboard/soporte/bitacora',
    },
    {
      id: 4,
      title: 'Usuarios',
      path: '/dashboard/soporte/registros-pendientes',
      onlyFor: ['soporte', 'admin']
    },
    {
      id: 5,
      title: 'Configuración',
      path: '/dashboard/soporte/configuracion',
    },
    {
      id: 6,
      title: 'Cerrar Sesión',
      path: '/logout',
      className: 'logout-btn'
    }
  ];
  return items;
};

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const userRole = user?.role || 'soporte';
  const menuItems = getMenuItems(userRole);

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
  };

  return (
    <>
      {/* Backdrop para móvil */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} style={{width: '100%', height:'100%'}}></div>}
      
      <div className={`sidebar-simple ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <h3 style={{fontSize: '20px'}}>Equipo de Soporte</h3>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            item.path === '/logout' ? (
              <button
              style={{fontSize: '20px'}} 
              key={item.id}
                className={`nav-item logout ${item.className || ''}`}
                onClick={handleLogout}
              >
                <span style={{fontSize: '20px'}}>{item.title}</span>
              </button>
            ) : (
              <Link
                key={item.id}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={onClose}
              >
                <span style={{fontSize: '20px'}}>{item.title}</span>
              </Link>
            )
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
