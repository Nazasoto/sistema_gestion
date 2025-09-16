-- Migración para agregar columnas de reasignación a la tabla tickets
-- Fecha: 2025-01-08
-- Descripción: Agrega usuario_reasignado y fecha_reasignacion para funcionalidad de reasignación

ALTER TABLE tickets 
ADD COLUMN usuario_reasignado INT NULL COMMENT 'ID del usuario al que se reasignó el ticket',
ADD COLUMN fecha_reasignacion TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de reasignación del ticket';

-- Agregar índice para mejorar performance en consultas de reasignación
CREATE INDEX idx_tickets_usuario_reasignado ON tickets(usuario_reasignado);
CREATE INDEX idx_tickets_fecha_reasignacion ON tickets(fecha_reasignacion);

-- Agregar foreign key constraint para usuario_reasignado (usando id_usuario como en el resto del sistema)
ALTER TABLE tickets 
ADD CONSTRAINT fk_tickets_usuario_reasignado 
FOREIGN KEY (usuario_reasignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
