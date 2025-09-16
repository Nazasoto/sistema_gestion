# Scripts de Backend

Este directorio contiene scripts de utilidad para el backend del sistema de tickets.

## Estructura

```
scripts/
├── debug/                          # Scripts de debugging y diagnóstico
│   ├── debug-sql-error.mjs        # Diagnóstico de errores SQL
│   ├── debug-supervisor-endpoints.js # Debug de endpoints de supervisor
│   └── debug-supervisor.mjs       # Debug general del supervisor
├── apply-database-changes.js      # Aplicar cambios a la base de datos
├── apply-migration.js             # Aplicar migraciones
├── check-db.js                    # Verificar conexión a BD
├── check-tables.js                # Verificar estructura de tablas
├── temp_functions.js              # Funciones temporales
└── test-db-connection.mjs         # Probar conexión a BD
```

## Uso

### Scripts de Base de Datos
```bash
# Aplicar cambios críticos a la BD
node backend/scripts/apply-database-changes.js

# Verificar conexión
node backend/scripts/test-db-connection.mjs

# Verificar tablas
node backend/scripts/check-tables.js
```

### Scripts de Debug
```bash
# Debug de supervisor
node backend/scripts/debug/debug-supervisor.mjs

# Debug de errores SQL
node backend/scripts/debug/debug-sql-error.mjs
```

## Configuración

Los scripts utilizan las variables de entorno definidas en `backend/.env`
