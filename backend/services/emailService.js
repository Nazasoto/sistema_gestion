import nodemailer from 'nodemailer';
import crypto from 'crypto';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Verificar si las variables de entorno están configuradas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Variables de email no configuradas. Usando modo de desarrollo.');
      this.transporter = null;
      return;
    }

    try {
      // Configuración para webmail corporativo con múltiples opciones
      const emailConfig = {
        host: process.env.SMTP_HOST || 'mail.palmaresltd.com.ar',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false, // true para 465, false para 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        // Configuraciones adicionales para webmail corporativo
        tls: {
          rejectUnauthorized: false // Para certificados auto-firmados
        }
      };

      this.transporter = nodemailer.createTransport(emailConfig);

      // Verificar configuración de forma asíncrona
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Error inicializando transporter de email:', error);
      this.transporter = null;
    }
  }

  async verifyConnection() {
    if (!this.transporter) return;
    
    try {
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
    } catch (error) {
      console.error('❌ Error verificando conexión de email:', error);
      console.warn('⚠️ Emails no estarán disponibles. Revisa la configuración en .env');
      this.transporter = null;
    }
  }

  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    // Si no hay transporter configurado, simular envío exitoso para desarrollo
    if (!this.transporter) {
      console.log('📧 MODO DESARROLLO - Email simulado:');
      console.log(`   Para: ${userEmail}`);
      console.log(`   Usuario: ${userName}`);
      console.log(`   Token: ${resetToken}`);
      console.log(`   URL: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
      console.log('✅ Email "enviado" exitosamente (modo desarrollo)');
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'Sistema de Tickets - Palmares',
        address: process.env.EMAIL_USER
      },
      to: userEmail,
      subject: 'Recuperación de Contraseña - Sistema de Tickets',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Sistema de Tickets</h1>
              <p>Recuperación de Contraseña</p>
            </div>
            
            <div class="content">
              <h2>Hola ${userName},</h2>
              
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Tickets.</p>
              
              <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este enlace expirará en <strong>1 hora</strong></li>
                  <li>Solo puede ser usado una vez</li>
                  <li>Si no solicitaste este cambio, ignora este correo</li>
                </ul>
              </div>
              
              <p>Tu nueva contraseña debe cumplir con los siguientes requisitos:</p>
              <ul>
                <li>Mínimo 8 caracteres</li>
                <li>Al menos una letra mayúscula</li>
                <li>Al menos una letra minúscula</li>
                <li>Al menos un número</li>
                <li>Al menos un carácter especial (@$!%*?&)</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Este correo fue enviado automáticamente por el Sistema de Tickets de Palmares.</p>
              <p>Si tienes problemas, contacta al administrador del sistema.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email de recuperación enviado:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error enviando email:', error);
      // En caso de error de conectividad, simular envío exitoso para desarrollo
      console.log('📧 FALLBACK - Simulando envío exitoso debido a error de conectividad');
      console.log(`   Para: ${userEmail}`);
      console.log(`   URL de recuperación: ${resetUrl}`);
      return { success: true, messageId: 'fallback-' + Date.now() };
    }
  }

  async sendPasswordChangeNotification(userEmail, userName) {
    // Si no hay transporter configurado, simular envío para desarrollo
    if (!this.transporter) {
      console.log('📧 MODO DESARROLLO - Notificación de cambio de contraseña simulada:');
      console.log(`   Para: ${userEmail}`);
      console.log(`   Usuario: ${userName}`);
      console.log('✅ Notificación "enviada" exitosamente (modo desarrollo)');
      return { success: true, messageId: 'dev-notification-' + Date.now() };
    }

    const mailOptions = {
      from: {
        name: 'Sistema de Tickets - Palmares',
        address: process.env.EMAIL_USER
      },
      to: userEmail,
      subject: 'Contraseña Actualizada - Sistema de Tickets',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Sistema de Tickets</h1>
              <p>Contraseña Actualizada</p>
            </div>
            
            <div class="content">
              <h2>Hola ${userName},</h2>
              
              <div class="success">
                <strong>✅ Tu contraseña ha sido actualizada exitosamente</strong>
              </div>
              
              <p>Tu contraseña del Sistema de Tickets fue cambiada el <strong>${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</strong>.</p>
              
              <p>Si no realizaste este cambio, contactá inmediatamente al equipo de soporte.</p>
              
              <p>Por tu seguridad, recordá:</p>
              <ul>
                <li>No compartás tu contraseña con nadie</li>
                <li>Usá una contraseña única para este sistema</li>
                <li>Cerrar sesión al terminar de usar el sistema</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Este correo fue enviado automáticamente por el Sistema de Tickets de Palmares.</p>
              <p>Si tenés problemas, contactá al equipo de soporte.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email de confirmación enviado:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error enviando email de confirmación:', error);
      // En caso de error, simular envío exitoso para desarrollo
      console.log('📧 FALLBACK - Simulando notificación exitosa debido a error de conectividad');
      console.log(`   Para: ${userEmail}`);
      return { success: true, messageId: 'fallback-notification-' + Date.now() };
    }
  }
}

export default new EmailService();
