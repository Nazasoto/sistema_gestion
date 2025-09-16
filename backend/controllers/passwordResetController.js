import passwordResetRequestRepository from '../repositories/passwordResetRequestRepository.js';
import userService from '../services/user.service.js';
import mysqlService from '../services/mysql.service.js';
import bcrypt from 'bcrypt';

class PasswordResetController {

  async crearSolicitudReset(req, res) {
    try {
      const { usuario, motivo } = req.body;

      if (!usuario) {
        return res.status(400).json({ 
          success: false, 
          message: 'Usuario es requerido' 
        });
      }

      // Buscar usuario por nombre de usuario
      const usuarioData = await userService.findByUsername(usuario);
      
      if (!usuarioData) {
        return res.status(400).json({
          success: false,
          message: 'No existe un usuario registrado con ese nombre de usuario.'
        });
      }

      // Crear solicitud de reset
      const solicitudData = {
        user_id: usuarioData.id_usuario,
        email: usuarioData.mail,
        nombre_completo: `${usuarioData.nombre} ${usuarioData.apellido}`,
        sucursal: usuarioData.sucursal || 'No especificada',
        motivo: motivo || 'Contraseña olvidada'
      };

      const result = await passwordResetRequestRepository.crearSolicitud(solicitudData);

      console.log(`📝 Nueva solicitud de reset creada - ID: ${result.requestId} para ${usuario}`);

      res.status(200).json({
        success: true,
        message: 'Solicitud de cambio de contraseña creada. El equipo de soporte la procesará pronto.',
        requestId: result.requestId
      });

    } catch (error) {
      console.error('Error en crearSolicitudReset:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  async obtenerSolicitudesPendientes(req, res) {
    try {
      const solicitudes = await passwordResetRequestRepository.obtenerSolicitudesPendientes();
      
      res.status(200).json({
        success: true,
        solicitudes
      });

    } catch (error) {
      console.error('Error obteniendo solicitudes pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo solicitudes'
      });
    }
  }

  async obtenerTodasLasSolicitudes(req, res) {
    try {
      const solicitudes = await passwordResetRequestRepository.obtenerTodasLasSolicitudes();
      
      res.status(200).json({
        success: true,
        solicitudes
      });

    } catch (error) {
      console.error('Error obteniendo todas las solicitudes:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo solicitudes'
      });
    }
  }

  async resetearContrasena(req, res) {
    console.log('🔧 CONTROLLER - resetearContrasena iniciado');
    console.log('🔧 CONTROLLER - req.body:', req.body);
    try {
      const { requestId, newPassword, adminNotes } = req.body;
      const adminUserId = req.user.id;
      console.log(`🔧 CONTROLLER - Procesando reset para requestId: ${requestId}, newPassword: ${newPassword}`);

      if (!requestId || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'ID de solicitud y nueva contraseña son requeridos'
        });
      }

      // Obtener solicitud
      const solicitudes = await passwordResetRequestRepository.obtenerTodasLasSolicitudes();
      const solicitud = solicitudes.find(s => s.id === parseInt(requestId) && s.status === 'pendiente');

      if (!solicitud) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada o ya procesada'
        });
      }

      // Buscar usuario por id
      const usuario = await userService.getById(solicitud.user_id);
      console.log(`🔧 Usuario obtenido:`, usuario);

      // Actualizar contraseña directamente con SQL puro
      console.log(`🔧 Actualizando contraseña para usuario ID: ${solicitud.user_id}`);
      console.log(`🔧 Nueva contraseña: ${newPassword}`);
      
      // Usar conexión directa de database.js
      const { query } = await import('../config/database.js');
      
      // Ejecutar UPDATE directo sin ninguna lógica intermedia
      await query(
        'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
        [newPassword, solicitud.user_id]
      );
      
      console.log(`🔧 ✅ Contraseña actualizada directamente en DB`);

      // Marcar solicitud como completada
      await passwordResetRequestRepository.marcarComoCompletado(
        requestId, 
        adminUserId, 
        adminNotes
      );

      console.log(`🔑 Contraseña reseteada para usuario ID: ${solicitud.user_id} por admin ID: ${adminUserId}`);

      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando contraseña'
      });
    }
  }

  async rechazarSolicitud(req, res) {
    try {
      const { requestId, adminNotes } = req.body;
      const adminUserId = req.user.id_usuario;

      if (!requestId || !adminNotes) {
        return res.status(400).json({
          success: false,
          message: 'ID de solicitud y motivo de rechazo son requeridos'
        });
      }

      const success = await passwordResetRequestRepository.marcarComoRechazado(
        requestId, 
        adminUserId, 
        adminNotes
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada o ya procesada'
        });
      }

      console.log(`❌ Solicitud ${requestId} rechazada por admin ID: ${adminUserId}`);

      res.status(200).json({
        success: true,
        message: 'Solicitud rechazada'
      });

    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error rechazando solicitud'
      });
    }
  }
}

export default new PasswordResetController();
