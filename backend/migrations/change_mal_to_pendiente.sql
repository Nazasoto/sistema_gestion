-- Migración para cambiar el estado 'mal' por 'pendiente'
-- Fecha: 2025-01-10

-- Paso 1: Actualizar todos los tickets existentes con estado 'mal' a 'pendiente'
UPDATE tickets SET estado = 'pendiente' WHERE estado = 'mal';

-- Paso 2: Actualizar el historial de tickets
UPDATE ticket_history SET estado_anterior = 'pendiente' WHERE estado_anterior = 'mal';
UPDATE ticket_history SET estado_nuevo = 'pendiente' WHERE estado_nuevo = 'mal';

-- Paso 3: Modificar el ENUM de la tabla tickets
ALTER TABLE tickets 
MODIFY COLUMN estado ENUM('nuevo', 'en_progreso', 'resuelto', 'pendiente', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') 
NOT NULL DEFAULT 'nuevo';

-- Paso 4: Modificar el ENUM de la tabla ticket_history
ALTER TABLE ticket_history 
MODIFY COLUMN estado_anterior ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'pendiente', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NULL;

ALTER TABLE ticket_history 
MODIFY COLUMN estado_nuevo ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'pendiente', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NOT NULL;

-- Verificación
SELECT 'Migración completada. Verificando cambios...' as mensaje;
SELECT COUNT(*) as tickets_pendientes FROM tickets WHERE estado = 'pendiente';
SELECT COUNT(*) as historial_pendiente FROM ticket_history WHERE estado_nuevo = 'pendiente' OR estado_anterior = 'pendiente';
