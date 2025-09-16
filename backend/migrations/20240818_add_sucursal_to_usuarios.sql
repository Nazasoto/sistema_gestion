-- Agregar columna sucursal a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS sucursal VARCHAR(10) 
COMMENT 'Sucursal asignada al usuario';

-- Crear índice para búsquedas por sucursal
CREATE INDEX IF NOT EXISTS idx_usuarios_sucursal ON usuarios(sucursal);

-- Actualizar la función de actualización de timestamp si existe
-- (Esto es opcional, dependiendo de tu configuración de base de datos)
-- ALTER TABLE usuarios 
-- MODIFY COLUMN fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
