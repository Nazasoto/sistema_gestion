import express from 'express';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { getEventos, registrarEvento, getEstadisticas, limpiarBitacora } from '../controllers/bitacoraController.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de soporte o superior
router.use(authenticate);
router.use(authorizeRoles('admin', 'supervisor', 'soporte'));

// GET /api/bitacora - Obtener eventos con filtros
router.get('/', getEventos);

// POST /api/bitacora - Registrar nuevo evento
router.post('/', registrarEvento);

// GET /api/bitacora/estadisticas - Obtener estadísticas
router.get('/estadisticas', getEstadisticas);

// DELETE /api/bitacora/limpiar - Limpiar todos los eventos (solo admin)
router.delete('/limpiar', limpiarBitacora);

export default router;
