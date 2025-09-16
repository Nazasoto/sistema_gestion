import { Router } from 'express';
import { verificarToken, authorizeRoles } from '../middlewares/auth.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// Aplicar el middleware de autenticación a todas las rutas
router.use(verificarToken);

// Rutas para reportes - solo supervisores y soporte
router.get('/', authorizeRoles(['supervisor', 'soporte']), reportController.obtenerReporte);
router.get('/ticket/:id/historial', authorizeRoles(['supervisor', 'soporte']), reportController.obtenerHistorialDetallado);
router.get('/empleados', authorizeRoles(['supervisor', 'soporte']), reportController.obtenerEstadisticasEmpleados);

export default router;
