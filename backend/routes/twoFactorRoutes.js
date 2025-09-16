import express from 'express';
import twoFactorController from '../controllers/twoFactorController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateTwoFactorSetup, validateTwoFactorVerification } from '../middleware/validation.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route POST /api/2fa/setup/initiate
 * @desc Inicia el proceso de configuración de 2FA
 * @access Admin only
 */
router.post('/setup/initiate', 
  authorizeRoles('admin'),
  twoFactorController.initiate2FASetup
);

/**
 * @route POST /api/2fa/setup/verify
 * @desc Verifica el código y habilita 2FA
 * @access Admin only
 */
router.post('/setup/verify',
  authorizeRoles('admin'),
  validateTwoFactorSetup,
  twoFactorController.verify2FASetup
);

/**
 * @route POST /api/2fa/verify
 * @desc Verifica un código 2FA durante el login
 * @access Public (pero requiere datos válidos)
 */
router.post('/verify',
  validateTwoFactorVerification,
  twoFactorController.verify2FALogin
);

/**
 * @route GET /api/2fa/status
 * @desc Obtiene el estado de 2FA del usuario actual
 * @access Private
 */
router.get('/status', 
  twoFactorController.get2FAStatus
);

/**
 * @route POST /api/2fa/disable
 * @desc Deshabilita 2FA para el usuario actual
 * @access Admin only
 */
router.post('/disable',
  authorizeRoles('admin'),
  twoFactorController.disable2FA
);

/**
 * @route POST /api/2fa/backup-codes/regenerate
 * @desc Genera nuevos códigos de respaldo
 * @access Admin only
 */
router.post('/backup-codes/regenerate',
  authorizeRoles('admin'),
  twoFactorController.regenerateBackupCodes
);

/**
 * @route GET /api/2fa/stats
 * @desc Obtiene estadísticas de uso de 2FA
 * @access Admin only
 */
router.get('/stats',
  authorizeRoles('admin'),
  twoFactorController.get2FAStats
);

export default router;
