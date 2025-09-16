-- Migración para agregar columnas de fecha faltantes en la tabla tickets
-- Fecha: 2025-09-03
-- Propósito: Corregir el problema de horarios al tomar y resolver tickets

USE railway;

-- Agregar columnas de fecha que faltan
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS fecha_tomado DATETIME NULL COMMENT 'Fecha y hora cuando el ticket fue tomado por un técnico',
ADD COLUMN IF NOT EXISTS fecha_resuelto DATETIME NULL COMMENT 'Fecha y hora cuando el ticket fue marcado como resuelto';

-- Verificar que las columnas se agregaron correctamente
DESCRIBE tickets;

-- Mostrar las columnas de fecha existentes
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'railway' 
  AND TABLE_NAME = 'tickets' 
  AND COLUMN_NAME LIKE '%fecha%'
ORDER BY ORDINAL_POSITION;
