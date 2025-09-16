# Guía de Contribución

¡Gracias por tu interés en contribuir a nuestro proyecto! Este documento te va a ayudar a contribuir de manera efectiva.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo Contribuir?](#cómo-contribuir)
  - [Reportar Errores](#reportar-errores)
  - [Solicitar Funcionalidades](#solicitar-funcionalidades)
  - [Enviar Pull Requests](#enviar-pull-requests)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Revisión](#proceso-de-revisión)
- [Pruebas](#pruebas)
- [Preguntas Frecuentes](#preguntas-frecuentes)

## Código de Conducta

Este proyecto y todos los participantes se rigen por nuestro [Código de Conducta](CODE_OF_CONDUCT.md). Se espera que todos los colaboradores sigan este código. Por favor, repórtalo a [sotonazareno@gmail.com] si eres testigo de un comportamiento inaceptable.

## ¿Cómo Contribuir?

### Reportar Errores

1. **Revisa si ya existe un issue** relacionado con el error.
2. **Crea un nuevo issue** si no existe uno.
3. Usa el formato de reporte de errores proporcionado en la plantilla.
4. Incluye capturas de pantalla o pasos para reproducir el error.

### Solicitar Funcionalidades

1. **Revisa si ya existe una solicitud** similar. 
2. **Crea un nuevo issue** usando la plantilla de solicitud de funcionalidad.
3. Describe la funcionalidad y su valor para el proyecto.
4. Incluye ejemplos de uso si es posible.

### Enviar Pull Requests

1. **Haz un fork** del repositorio.
2. **Crea una rama** descriptiva:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Haz commit** de tus cambios:
   ```bash
   git commit -m "feat: Agregué una nueva funcionalidad llamada 'MessiJefe' que permite a los usuarios reportar incidencias, realizar seguimiento de su estado y comunicarse con el equipo de soporte de manera eficiente."
   ```
4. **Haz push** a tu rama:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. **Abre un Pull Request** contra la rama `main`.

## Estándares de Código

### Convención de Commits

USAR [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva característica
- `fix:` Corrección de error
- `docs:` Cambios en la documentación
- `style:` Cambios de formato (punto y coma, indentación, etc.)
- `refactor:` Cambios en el código que no corrigen errores ni agregan funcionalidades
- `perf:` Mejoras de rendimiento
- `test:` Adición o modificación de pruebas
- `chore:` Cambios en el proceso de construcción o herramientas auxiliares

### Estilo de Código

- Obligatorio que el código cumpla con las reglas de ESLint y Prettier configuradas en el proyecto.
- Escribe código limpio y legible.
- Comenta el código cuando sea necesario.
- Escribe pruebas unitarias para nuevas funcionalidades.

## Proceso de Revisión

1. **Revisión de Código**: Todos los PRs requieren al menos una aprobación.
2. **Pruebas**: Asegúrate de que todas las pruebas pasen.
3. **CI/CD**: El pipeline de integración continua debe pasar.
4. **Documentación**: Actualiza la documentación según sea necesario.

## Pruebas

### Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm test -- --watch

# Generar cobertura de código
npm run test:coverage
```

### Escribir Pruebas

- Usa Jest como framework de pruebas.
- Escribe pruebas unitarias para funciones puras.
- Escribe pruebas de integración para componentes y servicios.
- Mantén una cobertura de código superior al 80%.

## Preguntas Frecuentes

### ¿Cómo puedo empezar a contribuir?

1. Revisá la lista de issues etiquetados como "good first issue".
2. Pedí ser asignado al issue que te interese.
3. Seguí las guías de contribución.

### ¿Cómo reporto un problema de seguridad?

Por favor, no creés un issue público. Enviá un correo a sotonazareno@gmail.com con los detalles.

### ¿Puedo trabajar en múltiples issues a la vez?

Sí, pero es recomendaria enfocarse en un issue a la vez para mantener los PRs manejables.

### ¿Con qué frecuencia se hacen releases?

La idea es hacer releases mensuales con todas las mejoras y correcciones del mes. Las correcciones críticas pueden lanzarse en cualquier momento.

---

¡Gracias por tu interés en contribuir! Tu ayuda es muy valiosa para hacer este proyecto mejor cada día.
