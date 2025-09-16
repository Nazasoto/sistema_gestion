-- Crear la tabla de tickets con la estructura correcta
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT,
  `estado` ENUM('abierto', 'en_progreso', 'cerrado') NOT NULL DEFAULT 'abierto',
  `prioridad` ENUM('baja', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
  `usuario_id` INT NOT NULL,
  `asignado_a` INT DEFAULT NULL,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE,
  FOREIGN KEY (`asignado_a`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL,
  INDEX `idx_usuario_id` (`usuario_id`),
  INDEX `idx_estado` (`estado`),
  INDEX `idx_prioridad` (`prioridad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si necesitas migrar datos de la tabla antigua a la nueva, puedes usar:
-- INSERT INTO tickets (titulo, descripcion, estado, prioridad, usuario_id, asignado_a, fecha_creacion)
-- SELECT titulo, COALESCE(descripcion, ''), estado, prioridad, usuario_id, asignadoA, fecha_creacion
-- FROM ticket
-- WHERE usuario_id IS NOT NULL;
