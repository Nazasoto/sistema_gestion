import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

class TwoFactorService {
  /**
   * Genera un secreto 2FA para un usuario
   * @param {string} userEmail - Email del usuario
   * @param {string} userName - Nombre del usuario
   * @returns {Object} - Secreto y QR code
   */
  async generateSecret(userEmail, userName) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${userName} (${userEmail})`,
        issuer: 'Sistema de Tickets - Palmares',
        length: 32
      });

      // Generar QR code para Google Authenticator
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        otpauth_url: secret.otpauth_url
      };
    } catch (error) {
      console.error('Error generando secreto 2FA:', error);
      throw new Error('Error al generar el secreto 2FA');
    }
  }

  /**
   * Verifica un token TOTP
   * @param {string} token - Token de 6 dígitos
   * @param {string} secret - Secreto base32 del usuario
   * @param {number} window - Ventana de tiempo (por defecto 1 = 30 segundos antes/después)
   * @returns {boolean} - True si el token es válido
   */
  verifyToken(token, secret, window = 1) {
    try {
      if (!token || !secret) {
        return false;
      }

      // Limpiar el token (remover espacios, guiones, etc.)
      const cleanToken = token.replace(/\s|-/g, '');

      // Verificar que el token tenga 6 dígitos
      if (!/^\d{6}$/.test(cleanToken)) {
        return false;
      }

      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: window
      });
    } catch (error) {
      console.error('Error verificando token 2FA:', error);
      return false;
    }
  }

  /**
   * Genera códigos de respaldo para el usuario
   * @param {number} count - Número de códigos a generar (por defecto 8)
   * @returns {Array} - Array de códigos de respaldo
   */
  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generar código de 8 caracteres alfanuméricos
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verifica un código de respaldo
   * @param {string} inputCode - Código ingresado por el usuario
   * @param {Array} backupCodes - Códigos de respaldo del usuario
   * @returns {Object} - { valid: boolean, remainingCodes: Array }
   */
  verifyBackupCode(inputCode, backupCodes) {
    try {
      if (!inputCode || !Array.isArray(backupCodes)) {
        return { valid: false, remainingCodes: backupCodes };
      }

      const cleanCode = inputCode.replace(/\s|-/g, '').toUpperCase();
      const codeIndex = backupCodes.indexOf(cleanCode);

      if (codeIndex !== -1) {
        // Código válido, removerlo de la lista
        const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex);
        return { valid: true, remainingCodes };
      }

      return { valid: false, remainingCodes: backupCodes };
    } catch (error) {
      console.error('Error verificando código de respaldo:', error);
      return { valid: false, remainingCodes: backupCodes };
    }
  }

  /**
   * Genera un token temporal para configuración 2FA
   * @returns {string} - Token temporal
   */
  generateSetupToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Valida formato de token 2FA
   * @param {string} token - Token a validar
   * @returns {boolean} - True si el formato es válido
   */
  isValidTokenFormat(token) {
    if (!token) return false;
    const cleanToken = token.replace(/\s|-/g, '');
    return /^\d{6}$/.test(cleanToken);
  }
}

export default new TwoFactorService();
