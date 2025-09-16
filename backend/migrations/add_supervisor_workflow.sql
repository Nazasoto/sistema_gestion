-- Migración para agregar flujo de aprobación de supervisor
-- Fecha: 2025-08-23

-- 1. Agregar nuevos estados de ticket
ALTER TABLE tickets 
MODIFY COLUMN estado ENUM(
    'nuevo', 
    'pendiente_aprobacion', 
    'aprobado', 
    'rechazado', 
    'en_espera', 
    'en_progreso', 
    'resuelto', 
    'cerrado', 
    'cancelado'
) DEFAULT 'pendiente_aprobacion';

-- 2. Agregar campo supervisor_id a tickets
ALTER TABLE tickets 
ADD COLUMN supervisor_id INT NULL,
ADD CONSTRAINT fk_tickets_supervisor 
    FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 3. Crear tabla para historial de aprobaciones
CREATE TABLE IF NOT EXISTS ticket_approvals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NOT NULL,
    supervisor_id INT NOT NULL,
    accion ENUM('aprobado', 'rechazado') NOT NULL,
    motivo TEXT NULL,
    fecha_decision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notificacion_enviada BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    INDEX idx_ticket_approvals_ticket_id (ticket_id),
    INDEX idx_ticket_approvals_supervisor_id (supervisor_id),
    INDEX idx_ticket_approvals_fecha (fecha_decision)
);

-- 4. Actualizar tabla usuarios para incluir rol supervisor
ALTER TABLE usuarios 
MODIFY COLUMN role ENUM('admin', 'soporte', 'sucursal', 'supervisor') NOT NULL;

-- 5. Agregar campos a tabla noticias para notificaciones dirigidas
ALTER TABLE noticias 
ADD COLUMN sucursal_destino VARCHAR(50) NULL,
ADD COLUMN ticket_id INT NULL,
ADD COLUMN supervisor_id INT NULL,
ADD COLUMN tipo ENUM('general', 'ticket_rechazado', 'ticket_aprobado', 'anuncio') DEFAULT 'general',
ADD INDEX idx_noticias_sucursal (sucursal_destino),
ADD INDEX idx_noticias_ticket (ticket_id);

-- 6. Crear vista para tickets pendientes de aprobación
CREATE OR REPLACE VIEW tickets_pendientes_aprobacion AS
SELECT 
    t.*,
    u_creador.nombre as nombre_creador,
    u_creador.email as email_creador,
    u_creador.sucursal as sucursal_creador
FROM tickets t
LEFT JOIN usuarios u_creador ON t.usuario_creador_id = u_creador.id
WHERE t.estado = 'pendiente_aprobacion'
ORDER BY t.fecha_creacion ASC;

-- 7. Crear vista para historial de supervisor
CREATE OR REPLACE VIEW supervisor_historial AS
SELECT 
    ta.*,
    t.titulo as ticket_titulo,
    t.descripcion as ticket_descripcion,
    t.prioridad as ticket_prioridad,
    u_creador.nombre as creador_nombre,
    u_creador.sucursal as creador_sucursal,
    u_supervisor.nombre as supervisor_nombre
FROM ticket_approvals ta
JOIN tickets t ON ta.ticket_id = t.id
LEFT JOIN usuarios u_creador ON t.usuario_creador_id = u_creador.id
LEFT JOIN usuarios u_supervisor ON ta.supervisor_id = u_supervisor.id
ORDER BY ta.fecha_decision DESC;

-- 8. Insertar usuario supervisor de ejemplo (opcional)
INSERT IGNORE INTO usuarios (nombre, email, password, role, sucursal, activo) 
VALUES (
    'María González', 
    'supervisor@empresa.com', 
    '$2b$10$example.hash.here', 
    'supervisor', 
    'Central', 
    1
);

-- 9. Actualizar tickets existentes para que vayan a supervisor
UPDATE tickets 
SET estado = 'pendiente_aprobacion' 
WHERE estado = 'nuevo' AND usuario_asignado_id IS NULL;

COMMIT;
