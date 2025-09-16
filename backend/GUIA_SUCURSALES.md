# 📋 Sistema de Sucursales - Guía Completa

## ✅ Estado Actual del Sistema

**77 sucursales agregadas exitosamente** cubriendo 8 provincias:
- Entre Ríos: 33 sucursales
- Corrientes: 18 sucursales  
- Misiones: 9 sucursales
- Santa Fe: 7 sucursales
- Chaco: 5 sucursales
- Chubut: 5 sucursales
- Buenos Aires: 1 sucursal
- Formosa: 1 sucursal

## Estructura de la Tabla Sucursales

La tabla `sucursales` contiene:
- `nro_sucursal`: Número único (1-77)
- `nombre`: Nombre descriptivo (ej: "Sucursal Concordia")
- `localidad`: Ciudad/localidad (ej: "Concordia", "Paraná")
- `provincia`: Provincia (ej: "Entre Ríos", "Corrientes")
- `direccion`: Dirección física (opcional)
- `telefono`: Teléfono de contacto (opcional)
- `email`: Email de contacto (opcional)
- `activa`: Estado de la sucursal (TRUE/FALSE)

## 🚀 Script de Carga Completa

Para recargar todas las sucursales, usar el archivo `agregar-sucursales-completas.js`:

```bash
node agregar-sucursales-completas.js
```

Este script:
- Limpia sucursales existentes
- Agrega las 76 sucursales completas
- Muestra estadísticas por provincia
- Verifica la integridad de los datos

## Verificar Sucursales Agregadas

```sql
SELECT nro_sucursal, nombre, localidad, provincia 
FROM sucursales 
WHERE activa = TRUE 
ORDER BY nro_sucursal;
```

## Notas Importantes

1. **Número de Sucursal**: Debe ser único y seguir el formato que uses (ej: "001", "015")
2. **Estado Activa**: Por defecto es TRUE, solo cambiar a FALSE si la sucursal se cierra
3. **Localidad/Provincia**: Estos datos se asignan automáticamente a los usuarios al registrarse
4. **Formato Consistente**: Mantener consistencia en nombres de provincias (ej: siempre "Buenos Aires", no "Bs As")

## Flujo Automático

Una vez agregadas las sucursales:
1. Aparecerán automáticamente en el formulario de registro
2. Al seleccionar una sucursal, se mostrará su localidad y provincia
3. Al registrarse, el usuario tendrá automáticamente asignados estos datos geográficos
4. Los administradores verán la información completa en las solicitudes pendientes
