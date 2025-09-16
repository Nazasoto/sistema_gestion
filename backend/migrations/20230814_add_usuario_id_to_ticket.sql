-- Migración para agregar la columna usuario_id a la tabla ticket
-- y crear una clave foránea que la relacione con la tabla usuarios

-- Primero, agregamos la columna (puede ser NULL inicialmente para permitir migración gradual)
ALTER TABLE ticket ADD COLUMN usuario_id INT NULL COMMENT 'ID del usuario que creó el ticket';

-- Luego, creamos un índice para mejorar el rendimiento de las consultas
CREATE INDEX idx_ticket_usuario_id ON ticket(usuario_id);

-- Finalmente, agregamos la clave foránea (opcional, pero recomendado para integridad referencial)
-- NOTA: Asegúrate de que la tabla 'usuarios' exista y tenga una columna 'id'
-- ALTER TABLE ticket ADD CONSTRAINT fk_ticket_usuario 
-- FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Comentario: Descomenta la línea de la clave foránea una vez que verifiques que las tablas y columnas existen
