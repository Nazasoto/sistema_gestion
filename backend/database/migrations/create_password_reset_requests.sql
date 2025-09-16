-- Tabla para solicitudes de cambio de contraseña
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  sucursal VARCHAR(100),
  motivo TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pendiente', 'completado', 'rechazado') DEFAULT 'pendiente',
  handled_by INT NULL,
  handled_at TIMESTAMP NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (handled_by) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  
  INDEX idx_status (status),
  INDEX idx_requested_at (requested_at),
  INDEX idx_user_email (email)
);
