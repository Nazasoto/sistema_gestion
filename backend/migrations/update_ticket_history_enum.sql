-- Actualizar la tabla ticket_history para incluir los nuevos estados de aprobación
ALTER TABLE `ticket_history` 
MODIFY COLUMN `estado_anterior` ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'mal', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NULL,
MODIFY COLUMN `estado_nuevo` ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'mal', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NOT NULL;
