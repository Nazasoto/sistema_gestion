import database from '../config/database.js';

class TwoFactorRepository {
  /**
   * Obtiene la configuración 2FA de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Object|null} - Configuración 2FA del usuario
   */
  async getUserTwoFactorConfig(userId) {
    try {
      const [rows] = await database.execute(
        `SELECT 
          id_usuario,
          two_factor_enabled,
          two_factor_secret,
          two_factor_backup_codes,
          two_factor_enabled_at,
          last_2fa_verification
        FROM usuarios 
        WHERE id_usuario = ?`,
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      const user = rows[0];
      return {
        userId: user.id_usuario,
        enabled: user.two_factor_enabled,
        secret: user.two_factor_secret,
        backupCodes: user.two_factor_backup_codes ? JSON.parse(user.two_factor_backup_codes) : [],
        enabledAt: user.two_factor_enabled_at,
        lastVerification: user.last_2fa_verification
      };
    } catch (error) {
      console.error('Error obteniendo configuración 2FA:', error);
      throw new Error('Error al obtener la configuración 2FA');
    }
  }

  /**
   * Guarda el token de configuración temporal para 2FA
   * @param {number} userId - ID del usuario
   * @param {string} setupToken - Token temporal
   * @param {string} secret - Secreto base32
   * @returns {boolean} - True si se guardó correctamente
   */
  async saveSetupToken(userId, setupToken, secret) {
    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      await database.execute(
        `UPDATE usuarios 
        SET two_factor_setup_token = ?, 
            two_factor_secret = ?, 
            two_factor_setup_expires = ?
        WHERE id_usuario = ?`,
        [setupToken, secret, expiresAt, userId]
      );

      return true;
    } catch (error) {
      console.error('Error guardando token de configuración 2FA:', error);
      throw new Error('Error al guardar el token de configuración');
    }
  }

  /**
   * Verifica y consume el token de configuración
   * @param {string} setupToken - Token de configuración
   * @returns {Object|null} - Datos del usuario si el token es válido
   */
  async verifySetupToken(setupToken) {
    try {
      const [rows] = await database.execute(
        `SELECT id_usuario, two_factor_secret, two_factor_setup_expires
        FROM usuarios 
        WHERE two_factor_setup_token = ? 
        AND two_factor_setup_expires > NOW()`,
        [setupToken]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        userId: rows[0].id_usuario,
        secret: rows[0].two_factor_secret,
        expires: rows[0].two_factor_setup_expires
      };
    } catch (error) {
      console.error('Error verificando token de configuración:', error);
      throw new Error('Error al verificar el token de configuración');
    }
  }

  /**
   * Habilita 2FA para un usuario
   * @param {number} userId - ID del usuario
   * @param {string} secret - Secreto base32
   * @param {Array} backupCodes - Códigos de respaldo
   * @returns {boolean} - True si se habilitó correctamente
   */
  async enable2FA(userId, secret, backupCodes) {
    try {
      const now = new Date();
      
      await database.execute(
        `UPDATE usuarios 
        SET two_factor_enabled = TRUE,
            two_factor_secret = ?,
            two_factor_backup_codes = ?,
            two_factor_enabled_at = ?,
            two_factor_setup_token = NULL,
            two_factor_setup_expires = NULL
        WHERE id_usuario = ?`,
        [secret, JSON.stringify(backupCodes), now, userId]
      );

      return true;
    } catch (error) {
      console.error('Error habilitando 2FA:', error);
      throw new Error('Error al habilitar 2FA');
    }
  }

  /**
   * Deshabilita 2FA para un usuario
   * @param {number} userId - ID del usuario
   * @returns {boolean} - True si se deshabilitó correctamente
   */
  async disable2FA(userId) {
    try {
      await database.execute(
        `UPDATE usuarios 
        SET two_factor_enabled = FALSE,
            two_factor_secret = NULL,
            two_factor_backup_codes = NULL,
            two_factor_setup_token = NULL,
            two_factor_setup_expires = NULL,
            last_2fa_verification = NULL
        WHERE id_usuario = ?`,
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error deshabilitando 2FA:', error);
      throw new Error('Error al deshabilitar 2FA');
    }
  }

  /**
   * Actualiza los códigos de respaldo del usuario
   * @param {number} userId - ID del usuario
   * @param {Array} backupCodes - Nuevos códigos de respaldo
   * @returns {boolean} - True si se actualizaron correctamente
   */
  async updateBackupCodes(userId, backupCodes) {
    try {
      await database.execute(
        `UPDATE usuarios 
        SET two_factor_backup_codes = ?
        WHERE id_usuario = ?`,
        [JSON.stringify(backupCodes), userId]
      );

      return true;
    } catch (error) {
      console.error('Error actualizando códigos de respaldo:', error);
      throw new Error('Error al actualizar códigos de respaldo');
    }
  }

  /**
   * Registra una verificación exitosa de 2FA
   * @param {number} userId - ID del usuario
   * @returns {boolean} - True si se registró correctamente
   */
  async recordSuccessfulVerification(userId) {
    try {
      const now = new Date();
      
      await database.execute(
        `UPDATE usuarios 
        SET last_2fa_verification = ?
        WHERE id_usuario = ?`,
        [now, userId]
      );

      return true;
    } catch (error) {
      console.error('Error registrando verificación 2FA:', error);
      throw new Error('Error al registrar verificación');
    }
  }

  /**
   * Limpia tokens de configuración expirados
   * @returns {number} - Número de registros limpiados
   */
  async cleanupExpiredTokens() {
    try {
      const [result] = await database.execute(
        `UPDATE usuarios 
        SET two_factor_setup_token = NULL,
            two_factor_setup_expires = NULL
        WHERE two_factor_setup_expires < NOW()
        AND two_factor_setup_token IS NOT NULL`
      );

      return result.affectedRows;
    } catch (error) {
      console.error('Error limpiando tokens expirados:', error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de uso de 2FA
   * @returns {Object} - Estadísticas de 2FA
   */
  async get2FAStats() {
    try {
      const [rows] = await database.execute(
        `SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN two_factor_enabled = TRUE THEN 1 ELSE 0 END) as users_with_2fa,
          SUM(CASE WHEN role = 'admin' AND two_factor_enabled = TRUE THEN 1 ELSE 0 END) as admins_with_2fa,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins
        FROM usuarios 
        WHERE estado = 'activo'`
      );

      const stats = rows[0];
      return {
        totalUsers: stats.total_users,
        usersWith2FA: stats.users_with_2fa,
        adminsWith2FA: stats.admins_with_2fa,
        totalAdmins: stats.total_admins,
        adoptionRate: stats.total_users > 0 ? (stats.users_with_2fa / stats.total_users * 100).toFixed(1) : 0,
        adminAdoptionRate: stats.total_admins > 0 ? (stats.admins_with_2fa / stats.total_admins * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas 2FA:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }
}

export default new TwoFactorRepository();
