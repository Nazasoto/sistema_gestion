import { query } from '../config/database.js';

class PasswordResetRequestRepository {
  
  async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        nombre_completo VARCHAR(255) NOT NULL,
        sucursal VARCHAR(100),
        motivo TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pendiente', 'completado', 'rechazado') DEFAULT 'pendiente',
        handled_by INT NULL,
        handled_at TIMESTAMP NULL,
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (handled_by) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        
        INDEX idx_status (status),
        INDEX idx_requested_at (requested_at),
        INDEX idx_user_email (email)
      )
    `;
    
    try {
      const result = await query(createTableSQL);
      console.log('✅ Tabla password_reset_requests verificada/creada');
    } catch (error) {
      console.error('❌ Error creando tabla password_reset_requests:', error);
      throw error;
    }
  }

  async crearSolicitud(userData) {
    const { user_id, email, nombre_completo, sucursal, motivo } = userData;
    
    const sql = `
      INSERT INTO password_reset_requests 
      (user_id, email, nombre_completo, sucursal, motivo, status)
      VALUES (?, ?, ?, ?, ?, 'pendiente')
    `;
    
    try {
      const result = await query(sql, [user_id, email, nombre_completo, sucursal, motivo]);
      return { success: true, requestId: result.insertId };
    } catch (error) {
      console.error('Error creando solicitud de reset:', error);
      throw error;
    }
  }

  async obtenerSolicitudesPendientes() {
    const sql = `
      SELECT 
        prr.*,
        u.usuario,
        admin.usuario as handled_by_username
      FROM password_reset_requests prr
      LEFT JOIN usuarios u ON prr.user_id = u.id_usuario
      LEFT JOIN usuarios admin ON prr.handled_by = admin.id_usuario
      WHERE prr.status = 'pendiente'
      ORDER BY prr.requested_at DESC
    `;
    
    try {
      const results = await query(sql);
      return results;
    } catch (error) {
      console.error('Error obteniendo solicitudes pendientes:', error);
      throw error;
    }
  }

  async obtenerTodasLasSolicitudes() {
    const sql = `
      SELECT 
        prr.*,
        u.usuario,
        admin.usuario as handled_by_username
      FROM password_reset_requests prr
      LEFT JOIN usuarios u ON prr.user_id = u.id_usuario
      LEFT JOIN usuarios admin ON prr.handled_by = admin.id_usuario
      ORDER BY prr.requested_at DESC
      LIMIT 100
    `;
    
    try {
      const results = await query(sql);
      return results;
    } catch (error) {
      console.error('Error obteniendo todas las solicitudes:', error);
      throw error;
    }
  }

  async marcarComoCompletado(requestId, handledBy, adminNotes = null) {
    const sql = `
      UPDATE password_reset_requests 
      SET status = 'completado', 
          handled_by = ?, 
          handled_at = NOW(),
          admin_notes = ?
      WHERE id = ? AND status = 'pendiente'
    `;
    
    try {
      const result = await query(sql, [handledBy, adminNotes, requestId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marcando solicitud como completada:', error);
      throw error;
    }
  }

  async marcarComoRechazado(requestId, handledBy, adminNotes) {
    const sql = `
      UPDATE password_reset_requests 
      SET status = 'rechazado', 
          handled_by = ?, 
          handled_at = NOW(),
          admin_notes = ?
      WHERE id = ? AND status = 'pendiente'
    `;
    
    try {
      const result = await query(sql, [handledBy, adminNotes, requestId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marcando solicitud como rechazada:', error);
      throw error;
    }
  }
}

export default new PasswordResetRequestRepository();
