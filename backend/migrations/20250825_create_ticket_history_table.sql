-- Crear tabla de historial de tickets para tracking de cambios de estado
CREATE TABLE IF NOT EXISTS `ticket_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `estado_anterior` ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'mal', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NULL,
  `estado_nuevo` ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'mal', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NOT NULL,
  `usuario_id` INT NOT NULL,
  `comentario` TEXT NULL,
  `fecha_cambio` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE,
  INDEX `idx_ticket_history_ticket_id` (`ticket_id`),
  INDEX `idx_ticket_history_estado` (`estado_nuevo`),
  INDEX `idx_ticket_history_fecha` (`fecha_cambio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear índice compuesto para consultas de reporte
CREATE INDEX `idx_ticket_history_ticket_estado` ON `ticket_history`(`ticket_id`, `estado_nuevo`);
