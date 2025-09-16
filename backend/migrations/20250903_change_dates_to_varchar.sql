-- Migración para cambiar columnas de fecha de DATETIME a VARCHAR
-- Fecha: 2025-09-03
-- Propósito: Eliminar problemas de timezone guardando fechas como string

USE railway;

-- Cambiar las columnas de fecha a VARCHAR(25) para almacenar formato 'YYYY-MM-DD HH:mm:ss'
ALTER TABLE tickets 
MODIFY COLUMN fecha_creacion VARCHAR(25) NULL COMMENT 'Fecha y hora de creación como string',
MODIFY COLUMN fecha_actualizacion VARCHAR(25) NULL COMMENT 'Fecha y hora de última actualización como string',
MODIFY COLUMN fecha_tomado VARCHAR(25) NULL COMMENT 'Fecha y hora cuando el ticket fue tomado como string',
MODIFY COLUMN fecha_resuelto VARCHAR(25) NULL COMMENT 'Fecha y hora cuando el ticket fue resuelto como string',
MODIFY COLUMN fecha_cierre VARCHAR(25) NULL COMMENT 'Fecha y hora cuando el ticket fue cerrado como string';

-- Cambiar también las columnas de timestamp existentes
ALTER TABLE tickets 
MODIFY COLUMN fecha_aprobacion VARCHAR(25) NULL COMMENT 'Fecha y hora de aprobación como string',
MODIFY COLUMN fecha_rechazo VARCHAR(25) NULL COMMENT 'Fecha y hora de rechazo como string';

-- Verificar los cambios
DESCRIBE tickets;

-- Mostrar las columnas de fecha modificadas
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'railway' 
  AND TABLE_NAME = 'tickets' 
  AND COLUMN_NAME LIKE '%fecha%'
ORDER BY ORDINAL_POSITION;
