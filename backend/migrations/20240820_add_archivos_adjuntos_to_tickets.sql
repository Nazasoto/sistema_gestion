-- Add archivos_adjuntos column to tickets table
ALTER TABLE `tickets` 
ADD COLUMN `archivos_adjuntos` TEXT NULL DEFAULT NULL 
COMMENT 'Array JSON con información de archivos adjuntos' 
AFTER `sucursal`;
