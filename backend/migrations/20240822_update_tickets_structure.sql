-- Actualizar la estructura de la tabla tickets
ALTER TABLE `tickets` 
MODIFY COLUMN `estado` ENUM(
    'nuevo',
    'en_espera',
    'en_progreso',
    'resuelto',
    'cerrado',
    'cancelado'
) NOT NULL DEFAULT 'nuevo';

-- Agregar columna sucursal si no existe
ALTER TABLE `tickets`
ADD COLUMN IF NOT EXISTS `sucursal` VARCHAR(50) NULL AFTER `categoria`;

-- Actualizar campos de fechas para que sean automáticos
ALTER TABLE `tickets`
MODIFY COLUMN `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS `idx_tickets_estado` ON `tickets`(`estado`);
CREATE INDEX IF NOT EXISTS `idx_tickets_prioridad` ON `tickets`(`prioridad`);
CREATE INDEX IF NOT EXISTS `idx_tickets_sucursal` ON `tickets`(`sucursal`);

-- Actualizar los estados existentes si es necesario
UPDATE `tickets` SET `estado` = 'nuevo' WHERE `estado` = 'abierto';

-- Verificar la estructura actualizada
DESCRIBE `tickets`;
