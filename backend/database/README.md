# Database

Este directorio contiene archivos relacionados con la base de datos del sistema de tickets.

## Estructura

```
database/
├── migrations/                     # Migraciones de base de datos
│   └── create-ticket-approvals-table.sql # Crear tabla de aprobaciones
└── README.md                      # Este archivo
```

## Migraciones

### create-ticket-approvals-table.sql
Crea la tabla `ticket_approvals` y agrega la columna `supervisor_id` a la tabla `tickets`.

**Uso:**
```bash
# Ejecutar desde MySQL/phpMyAdmin
source backend/database/migrations/create-ticket-approvals-table.sql;

# O usar el script automatizado
node backend/scripts/apply-database-changes.js
```

## Estructura de Tablas

### ticket_approvals
- `id`: Primary key
- `ticket_id`: ID del ticket aprobado/rechazado
- `supervisor_id`: ID del supervisor que tomó la decisión
- `accion`: 'aprobado' o 'rechazado'
- `motivo`: Motivo de la decisión
- `fecha_decision`: Timestamp de la decisión
- `notificacion_enviada`: Si se envió notificación

### tickets (columnas agregadas)
- `supervisor_id`: ID del supervisor asignado
