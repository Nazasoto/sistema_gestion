import express from 'express';
import passwordResetController from '../controllers/passwordResetController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Crear solicitud de reset (público)
router.post('/request', passwordResetController.crearSolicitudReset);

// Rutas para administradores
router.get('/pending', authenticate, authorizeRoles(['admin', 'soporte']), passwordResetController.obtenerSolicitudesPendientes);
router.get('/all', authenticate, authorizeRoles(['admin', 'soporte']), passwordResetController.obtenerTodasLasSolicitudes);
router.post('/reset', authenticate, authorizeRoles(['admin', 'soporte']), (req, res, next) => {
  console.log('🔧 ROUTE - Petición recibida en /api/password-reset/reset');
  console.log('🔧 ROUTE - Body:', req.body);
  next();
}, passwordResetController.resetearContrasena);
router.post('/reject', authenticate, authorizeRoles(['admin', 'soporte']), passwordResetController.rechazarSolicitud);

export default router;
