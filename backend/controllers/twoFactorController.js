import twoFactorService from '../services/twoFactorService.js';
import twoFactorRepository from '../repositories/twoFactorRepository.js';
import userRepository from '../repositories/userRepository.js';

class TwoFactorController {
  /**
   * Inicia el proceso de configuración de 2FA
   * Solo para administradores
   */
  async initiate2FASetup(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verificar que sea administrador
      if (userRole !== 'admin') {
        return res.status(403).json({
          error: 'Solo los administradores pueden configurar 2FA'
        });
      }

      // Obtener datos del usuario
      const user = await userRepository.obtenerUsuarioPorId(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      // Verificar si ya tiene 2FA habilitado
      const currentConfig = await twoFactorRepository.getUserTwoFactorConfig(userId);
      if (currentConfig && currentConfig.enabled) {
        return res.status(400).json({
          error: '2FA ya está habilitado para este usuario'
        });
      }

      // Generar secreto y QR code
      const secretData = await twoFactorService.generateSecret(user.mail, user.nombre);
      
      // Generar token de configuración temporal
      const setupToken = twoFactorService.generateSetupToken();
      
      // Guardar en base de datos
      await twoFactorRepository.saveSetupToken(userId, setupToken, secretData.secret);

      res.json({
        setupToken,
        qrCode: secretData.qrCode,
        manualEntryKey: secretData.manualEntryKey,
        message: 'Escanea el código QR con Google Authenticator y luego verifica con un código'
      });

    } catch (error) {
      console.error('Error iniciando configuración 2FA:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica el código y habilita 2FA
   */
  async verify2FASetup(req, res) {
    try {
      const { setupToken, verificationCode } = req.body;

      if (!setupToken || !verificationCode) {
        return res.status(400).json({
          error: 'Token de configuración y código de verificación son requeridos'
        });
      }

      // Verificar formato del código
      if (!twoFactorService.isValidTokenFormat(verificationCode)) {
        return res.status(400).json({
          error: 'Formato de código inválido. Debe ser de 6 dígitos'
        });
      }

      // Verificar token de configuración
      const setupData = await twoFactorRepository.verifySetupToken(setupToken);
      if (!setupData) {
        return res.status(400).json({
          error: 'Token de configuración inválido o expirado'
        });
      }

      // Verificar código TOTP
      const isValidCode = twoFactorService.verifyToken(verificationCode, setupData.secret);
      if (!isValidCode) {
        return res.status(400).json({
          error: 'Código de verificación inválido'
        });
      }

      // Generar códigos de respaldo
      const backupCodes = twoFactorService.generateBackupCodes();

      // Habilitar 2FA
      await twoFactorRepository.enable2FA(setupData.userId, setupData.secret, backupCodes);

      res.json({
        message: '2FA habilitado exitosamente',
        backupCodes,
        warning: 'Guarda estos códigos de respaldo en un lugar seguro. No se mostrarán nuevamente.'
      });

    } catch (error) {
      console.error('Error verificando configuración 2FA:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica un código 2FA durante el login
   */
  async verify2FALogin(req, res) {
    try {
      const { userId, code, useBackupCode = false } = req.body;

      if (!userId || !code) {
        return res.status(400).json({
          error: 'ID de usuario y código son requeridos'
        });
      }

      // Obtener configuración 2FA del usuario
      const config = await twoFactorRepository.getUserTwoFactorConfig(userId);
      if (!config || !config.enabled) {
        return res.status(400).json({
          error: 'Usuario no tiene 2FA habilitado'
        });
      }

      let isValid = false;

      if (useBackupCode) {
        // Verificar código de respaldo
        const result = twoFactorService.verifyBackupCode(code, config.backupCodes);
        isValid = result.valid;
        
        if (isValid) {
          // Actualizar códigos de respaldo (remover el usado)
          await twoFactorRepository.updateBackupCodes(userId, result.remainingCodes);
        }
      } else {
        // Verificar código TOTP
        if (!twoFactorService.isValidTokenFormat(code)) {
          return res.status(400).json({
            error: 'Formato de código inválido'
          });
        }
        
        isValid = twoFactorService.verifyToken(code, config.secret);
      }

      if (!isValid) {
        return res.status(400).json({
          error: useBackupCode ? 'Código de respaldo inválido' : 'Código de verificación inválido'
        });
      }

      // Registrar verificación exitosa
      await twoFactorRepository.recordSuccessfulVerification(userId);

      res.json({
        message: '2FA verificado exitosamente',
        verified: true
      });

    } catch (error) {
      console.error('Error verificando 2FA en login:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene el estado de 2FA del usuario actual
   */
  async get2FAStatus(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const config = await twoFactorRepository.getUserTwoFactorConfig(userId);
      
      res.json({
        enabled: config ? config.enabled : false,
        enabledAt: config ? config.enabledAt : null,
        lastVerification: config ? config.lastVerification : null,
        canEnable2FA: userRole === 'admin',
        backupCodesCount: config && config.backupCodes ? config.backupCodes.length : 0
      });

    } catch (error) {
      console.error('Error obteniendo estado 2FA:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Deshabilita 2FA para el usuario actual
   */
  async disable2FA(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { currentPassword, verificationCode } = req.body;

      // Solo administradores pueden deshabilitar 2FA
      if (userRole !== 'admin') {
        return res.status(403).json({
          error: 'Solo los administradores pueden deshabilitar 2FA'
        });
      }

      if (!currentPassword || !verificationCode) {
        return res.status(400).json({
          error: 'Contraseña actual y código de verificación son requeridos'
        });
      }

      // Verificar contraseña actual
      const user = await userRepository.obtenerUsuarioPorId(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      // Aquí deberías verificar la contraseña actual
      // const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      // if (!isValidPassword) {
      //   return res.status(400).json({
      //     error: 'Contraseña actual incorrecta'
      //   });
      // }

      // Verificar código 2FA
      const config = await twoFactorRepository.getUserTwoFactorConfig(userId);
      if (!config || !config.enabled) {
        return res.status(400).json({
          error: '2FA no está habilitado'
        });
      }

      const isValidCode = twoFactorService.verifyToken(verificationCode, config.secret);
      if (!isValidCode) {
        return res.status(400).json({
          error: 'Código de verificación inválido'
        });
      }

      // Deshabilitar 2FA
      await twoFactorRepository.disable2FA(userId);

      res.json({
        message: '2FA deshabilitado exitosamente'
      });

    } catch (error) {
      console.error('Error deshabilitando 2FA:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Genera nuevos códigos de respaldo
   */
  async regenerateBackupCodes(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { verificationCode } = req.body;

      if (userRole !== 'admin') {
        return res.status(403).json({
          error: 'Solo los administradores pueden regenerar códigos de respaldo'
        });
      }

      if (!verificationCode) {
        return res.status(400).json({
          error: 'Código de verificación requerido'
        });
      }

      // Verificar que el usuario tenga 2FA habilitado
      const config = await twoFactorRepository.getUserTwoFactorConfig(userId);
      if (!config || !config.enabled) {
        return res.status(400).json({
          error: '2FA no está habilitado'
        });
      }

      // Verificar código 2FA
      const isValidCode = twoFactorService.verifyToken(verificationCode, config.secret);
      if (!isValidCode) {
        return res.status(400).json({
          error: 'Código de verificación inválido'
        });
      }

      // Generar nuevos códigos de respaldo
      const newBackupCodes = twoFactorService.generateBackupCodes();
      
      // Actualizar en base de datos
      await twoFactorRepository.updateBackupCodes(userId, newBackupCodes);

      res.json({
        message: 'Códigos de respaldo regenerados exitosamente',
        backupCodes: newBackupCodes,
        warning: 'Los códigos anteriores ya no son válidos. Guarda estos nuevos códigos en un lugar seguro.'
      });

    } catch (error) {
      console.error('Error regenerando códigos de respaldo:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadísticas de uso de 2FA (solo para admins)
   */
  async get2FAStats(req, res) {
    try {
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        return res.status(403).json({
          error: 'Solo los administradores pueden ver estadísticas de 2FA'
        });
      }

      const stats = await twoFactorRepository.get2FAStats();
      
      res.json(stats);

    } catch (error) {
      console.error('Error obteniendo estadísticas 2FA:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
}

export default new TwoFactorController();
