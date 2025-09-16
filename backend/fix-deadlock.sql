-- Liberar transacciones bloqueadas
SHOW PROCESSLIST;

-- Matar procesos bloqueados (ejecutar solo si es necesario)
-- KILL [process_id];

-- Verificar transacciones activas
SELECT * FROM INFORMATION_SCHEMA.INNODB_TRX;

-- Verificar locks
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCKS;

-- Verificar esperas de locks
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCK_WAITS;
