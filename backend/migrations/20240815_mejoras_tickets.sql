-- Script para mejorar la estructura de la base de datos
-- Fecha: 2024-08-15
-- Descripción: Mejoras en la estructura para soportar mejor la integración con usuarios

-- 1. Asegurarse de que los índices necesarios existan
CREATE INDEX IF NOT EXISTS idx_tickets_usuario_creador ON tickets(usuario_creador_id);
CREATE INDEX IF NOT EXISTS idx_tickets_usuario_asignado ON tickets(usuario_asignado_id);

-- 2. Crear una vista para facilitar las consultas de tickets con información de usuarios
CREATE OR REPLACE VIEW vista_tickets_detallados AS
SELECT 
  t.*,
  uc.nombre AS nombre_creador,
  uc.email AS email_creador,
  ua.nombre AS nombre_asignado,
  ua.email AS email_asignado
FROM 
  tickets t
  LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id_usuario
  LEFT JOIN usuarios ua ON t.usuario_asignado_id = ua.id_usuario;

-- 3. Crear un procedimiento almacenado para obtener los tickets de un usuario
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS obtener_tickets_por_usuario(IN p_usuario_id INT)
BEGIN
  SELECT * FROM vista_tickets_detallados 
  WHERE usuario_creador_id = p_usuario_id 
     OR usuario_asignado_id = p_usuario_id
  ORDER BY fecha_creacion DESC;
END //
DELIMITER ;

-- 4. Crear un procedimiento para crear un nuevo ticket
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS crear_nuevo_ticket(
  IN p_titulo VARCHAR(255),
  IN p_descripcion TEXT,
  IN p_estado VARCHAR(20),
  IN p_prioridad VARCHAR(20),
  IN p_categoria VARCHAR(50),
  IN p_usuario_creador_id INT,
  IN p_usuario_asignado_id INT
)
BEGIN
  INSERT INTO tickets (
    titulo, 
    descripcion, 
    estado, 
    prioridad, 
    categoria, 
    usuario_creador_id, 
    usuario_asignado_id
  ) VALUES (
    p_titulo,
    p_descripcion,
    COALESCE(p_estado, 'abierto'),
    COALESCE(p_prioridad, 'media'),
    p_categoria,
    p_usuario_creador_id,
    p_usuario_asignado_id
  );
  
  SELECT LAST_INSERT_ID() AS id_ticket;
END //
DELIMITER ;

-- 5. Actualizar el registro de auditoría para la tabla tickets
ALTER TABLE tickets 
MODIFY COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 6. Agregar un campo para el historial de cambios (opcional)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS historial JSON DEFAULT NULL COMMENT 'Registro de cambios en el ticket';

-- 7. Crear un trigger para el historial de cambios
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_ticket_update
AFTER UPDATE ON tickets
FOR EACH ROW
BEGIN
  DECLARE v_historial JSON;
  
  -- Obtener el historial actual o inicializar un array vacío
  SET v_historial = IFNULL(NEW.historial, JSON_ARRAY());
  
  -- Agregar el cambio al historial
  SET v_historial = JSON_ARRAY_APPEND(
    v_historial, 
    '$', 
    JSON_OBJECT(
      'fecha', NOW(),
      'campo_modificado', 'estado',
      'valor_anterior', OLD.estado,
      'nuevo_valor', NEW.estado,
      'usuario_id', IFNULL(@usuario_actual, NULL)
    )
  );
  
  -- Actualizar el campo de historial
  SET NEW.historial = v_historial;
END //
DELIMITER ;

-- 8. Crear un índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_tickets_busqueda ON tickets(estado, prioridad, categoria, fecha_creacion);

-- 9. Crear una tabla de categorías si no existe
CREATE TABLE IF NOT EXISTS categorias_tickets (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_nombre_categoria (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Insertar categorías por defecto si la tabla está vacía
INSERT IGNORE INTO categorias_tickets (nombre, descripcion) VALUES
  ('soporte', 'Problemas generales de soporte técnico'),
  ('hardware', 'Problemas con equipos físicos'),
  ('software', 'Problemas con aplicaciones y programas'),
  ('red', 'Problemas de conectividad de red'),
  ('cuenta', 'Problemas con cuentas de usuario');

-- 11. Actualizar la tabla tickets para usar la tabla de categorías
ALTER TABLE tickets 
MODIFY COLUMN categoria INT NULL,
ADD CONSTRAINT fk_ticket_categoria 
  FOREIGN KEY (categoria) 
  REFERENCES categorias_tickets(id_categoria)
  ON DELETE SET NULL;

-- 12. Actualizar los valores de categoría existentes (opcional)
-- UPDATE tickets t
-- JOIN categorias_tickets c ON LOWER(t.categoria) = c.nombre
-- SET t.categoria = c.id_categoria
-- WHERE t.categoria IS NOT NULL;

-- 13. Cambiar el tipo de la columna categoría a INT después de la migración
-- ALTER TABLE tickets 
-- MODIFY COLUMN categoria INT NULL COMMENT 'ID de la categoría del ticket';

-- Mensaje de confirmación
SELECT 'Estructura de la base de datos actualizada exitosamente' AS mensaje;
