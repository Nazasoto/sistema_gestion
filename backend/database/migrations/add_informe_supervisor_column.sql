-- Agregar columna informe_supervisor a la tabla tickets
-- Esta columna almacenará los informes que el equipo de soporte envía a los supervisores

ALTER TABLE tickets 
ADD COLUMN informe_supervisor TEXT NULL 
COMMENT 'Informe enviado por soporte al supervisor en formato JSON';

-- Crear índice para mejorar las consultas de supervisores
CREATE INDEX idx_tickets_informe_supervisor ON tickets(informe_supervisor(100));
