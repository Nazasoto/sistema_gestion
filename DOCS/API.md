# Documentación de la API

## Autenticación

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

### Respuesta Exitosa
```json
{
  "token": "jwt.token.aqui",
  "user": {
    "id": "123",
    "name": "Nombre del Usuario",
    "email": "usuario@ejemplo.com",
    "role": "admin"
  }
}
```

## Usuarios

### Obtener todos los usuarios
```http
GET /api/users
Authorization: Bearer <token>
```

### Crear un nuevo usuario
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Usuario",
  "email": "nuevo@ejemplo.com",
  "password": "contraseña123",
  "role": "user"
}
```

## Tickets

### Obtener todos los tickets
```http
GET /api/tickets
Authorization: Bearer <token>
```

### Crear un nuevo ticket
```http
POST /api/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Problema con la impresora",
  "description": "La impresora no responde",
  "priority": "high",
  "category": "hardware"
}
```

### Actualizar un ticket
```http
PUT /api/tickets/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "assignedTo": "user123"
}
```

### Eliminar un ticket
```http
DELETE /api/tickets/:id
Authorization: Bearer <token>
```

## Categorías

### Obtener todas las categorías
```http
GET /api/categories
Authorization: Bearer <token>
```

## Estadísticas

### Obtener estadísticas generales
```http
GET /api/stats/overview
Authorization: Bearer <token>
```

### Obtener estadísticas por categoría
```http
GET /api/stats/by-category
Authorization: Bearer <token>
```

## Códigos de Estado HTTP

- 200 OK: La solicitud se ha completado con éxito
- 201 Created: Recurso creado exitosamente
- 400 Bad Request: Error en los datos de la solicitud
- 401 Unauthorized: No autorizado
- 403 Forbidden: No tiene permisos para realizar esta acción
- 404 Not Found: Recurso no encontrado
- 500 Internal Server Error: Error en el servidor

## Errores

La API devuelve errores en el siguiente formato:

```json
{
  "success": false,
  "message": "Mensaje de error descriptivo",
  "error": "Código de error opcional"
}
```

## Paginación

Los endpoints que devuelven listas soportan paginación mediante los parámetros de consulta:

- `page`: Número de página (por defecto: 1)
- `limit`: Cantidad de elementos por página (por defecto: 10)
- `sort`: Campo por el cual ordenar
- `order`: Orden (asc o desc)

Ejemplo:
```
GET /api/tickets?page=1&limit=20&sort=createdAt&order=desc
```

## Filtros

Los endpoints de listado soportan filtros mediante parámetros de consulta:

```
GET /api/tickets?status=open&priority=high&category=hardware
```

## Búsqueda

Búsqueda en campos específicos:

```
GET /api/tickets?q=impresora
```

## Tasa de Límite (Rate Limiting)

La API tiene un límite de 100 solicitudes por minuto por IP. Los encabezados de respuesta incluyen:

- `X-RateLimit-Limit`: Límite de solicitudes permitidas
- `X-RateLimit-Remaining`: Solicitudes restantes
- `X-RateLimit-Reset`: Tiempo hasta el reinicio del contador (segundos)
