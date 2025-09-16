-- Crear tabla de bitácora para eventos del sistema
CREATE TABLE IF NOT EXISTS bitacora_eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_evento DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo_evento ENUM('login', 'logout', 'error', 'ticket_creado', 'ticket_asignado', 'ticket_resuelto', 'ticket_cancelado', 'reasignacion', 'rate_limit', 'seguridad') NOT NULL,
  usuario_id INT NULL,
  sucursal VARCHAR(50) NULL,
  descripcion TEXT NOT NULL,
  detalles JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  severidad ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
  INDEX idx_fecha_evento (fecha_evento),
  INDEX idx_tipo_evento (tipo_evento),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_sucursal (sucursal),
  INDEX idx_severidad (severidad),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
