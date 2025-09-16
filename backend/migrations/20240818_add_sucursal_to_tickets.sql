-- Agregar columna sucursal a la tabla tickets
ALTER TABLE tickets
ADD COLUMN sucursal VARCHAR(10) DEFAULT NULL
COMMENT 'Número de sucursal asociada al ticket';

-- Actualizar tickets existentes con un valor por defecto si es necesario
-- UPDATE tickets SET sucursal = 'N/A' WHERE sucursal IS NULL;

-- Agregar índice para búsquedas por sucursal
ALTER TABLE tickets
ADD INDEX idx_sucursal (sucursal);
