-- Script para crear tabla ticket_approvals y agregar columna supervisor_id
-- Ejecutar este script en la base de datos

-- 1. Crear tabla ticket_approvals si no existe
CREATE TABLE IF NOT EXISTS ticket_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  supervisor_id INT NOT NULL,
  accion ENUM('aprobado', 'rechazado') NOT NULL,
  motivo TEXT,
  fecha_decision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notificacion_enviada BOOLEAN DEFAULT FALSE,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_supervisor_id (supervisor_id),
  INDEX idx_fecha_decision (fecha_decision)
);

-- 2. Agregar columna supervisor_id a tabla tickets si no existe
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS supervisor_id INT NULL,
ADD INDEX IF NOT EXISTS idx_supervisor_id (supervisor_id);

-- 3. Verificar estructura de las tablas
DESCRIBE tickets;
DESCRIBE ticket_approvals;

-- 4. Verificar datos existentes
SELECT COUNT(*) as total_tickets FROM tickets;
SELECT COUNT(*) as total_approvals FROM ticket_approvals;
