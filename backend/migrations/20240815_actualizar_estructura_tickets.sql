-- Script para actualizar la estructura de la tabla de tickets
-- Fecha: 2024-08-15
-- Descripción: Elimina la tabla de tickets existente y crea una nueva con una estructura mejorada

-- 1. Crear una tabla temporal para respaldar los datos existentes (si es necesario)
-- NOTA: Descomenta esta sección si necesitas hacer un respaldo de los datos existentes
/*
CREATE TABLE IF NOT EXISTS `tickets_backup_20240815` AS 
SELECT * FROM `tickets`;
*/

-- 2. Eliminar la tabla de tickets existente si existe
DROP TABLE IF EXISTS `tickets`;

-- 3. Crear la nueva tabla de tickets con la estructura mejorada
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL COMMENT 'Título o asunto del ticket',
  `descripcion` TEXT COMMENT 'Descripción detallada del problema',
  `estado` ENUM('abierto', 'en_progreso', 'en_revision', 'cerrado', 'cancelado') NOT NULL DEFAULT 'abierto' COMMENT 'Estado actual del ticket',
  `prioridad` ENUM('baja', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media' COMMENT 'Nivel de prioridad del ticket',
  `categoria` VARCHAR(50) COMMENT 'Categoría del ticket (ej: soporte, hardware, software, red)',
  `usuario_creador_id` INT NOT NULL COMMENT 'ID del usuario que creó el ticket',
  `usuario_asignado_id` INT COMMENT 'ID del usuario asignado al ticket',
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del ticket',
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización del ticket',
  `fecha_cierre` TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de cierre del ticket',
  `archivos_adjuntos` JSON DEFAULT NULL COMMENT 'Array de URLs de archivos adjuntos',
  `comentarios` JSON DEFAULT NULL COMMENT 'Array de comentarios en formato JSON',
  
  -- Índices para mejorar el rendimiento
  INDEX `idx_estado` (`estado`),
  INDEX `idx_prioridad` (`prioridad`),
  INDEX `idx_usuario_creador` (`usuario_creador_id`),
  INDEX `idx_usuario_asignado` (`usuario_asignado_id`),
  INDEX `idx_fecha_creacion` (`fecha_creacion`),
  
  -- Claves foráneas para mantener la integridad referencial
  CONSTRAINT `fk_usuario_creador` 
    FOREIGN KEY (`usuario_creador_id`) 
    REFERENCES `usuarios`(`id_usuario`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_usuario_asignado` 
    FOREIGN KEY (`usuario_asignado_id`) 
    REFERENCES `usuarios`(`id_usuario`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de tickets de soporte';

-- 4. Insertar datos iniciales de ejemplo (opcional)
-- INSERT INTO `tickets` (titulo, descripcion, estado, prioridad, usuario_creador_id) VALUES
-- ('Problema con la impresora', 'La impresora no imprime en color', 'abierto', 'alta', 1),
-- ('Solicitud de software', 'Necesito instalar Photoshop', 'en_progreso', 'media', 2);

-- 5. Mensaje de confirmación
SELECT 'Tabla de tickets actualizada exitosamente' AS mensaje;
