import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './css/main.css'

// Registrar Service Worker para mejorar caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado:', registration);
      })
      .catch((error) => {
        console.log('SW falló:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);