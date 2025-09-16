-- Migración para agregar campos de 2FA a la tabla usuarios
-- Fecha: 2025-01-10
-- Descripción: Agregar soporte para autenticación de dos factores

-- Agregar columnas para 2FA
ALTER TABLE usuarios 
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE COMMENT 'Indica si el usuario tiene 2FA habilitado',
ADD COLUMN two_factor_secret VARCHAR(255) NULL COMMENT 'Secreto base32 para TOTP',
ADD COLUMN two_factor_backup_codes JSON NULL COMMENT 'Códigos de respaldo en formato JSON',
ADD COLUMN two_factor_setup_token VARCHAR(255) NULL COMMENT 'Token temporal para configuración 2FA',
ADD COLUMN two_factor_setup_expires DATETIME NULL COMMENT 'Fecha de expiración del token de configuración',
ADD COLUMN two_factor_enabled_at DATETIME NULL COMMENT 'Fecha cuando se habilitó 2FA',
ADD COLUMN last_2fa_verification DATETIME NULL COMMENT 'Última verificación exitosa de 2FA';

-- Crear índices para optimizar consultas
CREATE INDEX idx_usuarios_2fa_enabled ON usuarios(two_factor_enabled);
CREATE INDEX idx_usuarios_2fa_setup_token ON usuarios(two_factor_setup_token);

-- Actualizar comentario de la tabla
ALTER TABLE usuarios COMMENT = 'Tabla de usuarios del sistema con soporte para 2FA';

-- Verificar la estructura actualizada
DESCRIBE usuarios;
