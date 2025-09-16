-- Actualizar el ENUM de estados en la tabla tickets
ALTER TABLE `tickets` 
MODIFY COLUMN `estado` ENUM(
    'nuevo',
    'en_espera',
    'en_progreso',
    'resuelto',
    'cerrado',
    'cancelado',
    'err'
) NOT NULL DEFAULT 'nuevo';

-- Actualizar los estados existentes si es necesario
-- Por ejemplo, cambiar 'abierto' a 'nuevo'
UPDATE `tickets` SET `estado` = 'nuevo' WHERE `estado` = 'abierto';

-- Agregar campos adicionales si son necesarios
ALTER TABLE `tickets`
ADD COLUMN `motivo_espera` TEXT NULL AFTER `estado`,
ADD COLUMN `fecha_espera` DATETIME NULL AFTER `motivo_espera`,
ADD COLUMN `fecha_resolucion` DATETIME NULL AFTER `fecha_actualizacion`,
ADD COLUMN `solucion` TEXT NULL AFTER `descripcion`;
