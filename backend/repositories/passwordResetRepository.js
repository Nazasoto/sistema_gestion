import MySQLService from '../services/mysql.service.js';
import crypto from 'crypto';

class PasswordResetRepository {
  constructor() {
    this.db = new MySQLService('password_resets', {
      idField: 'id'
    });
  }

  async createResetToken(userId, email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Eliminar tokens anteriores del usuario
    await this.deleteUserTokens(userId);

    const resetData = {
      user_id: userId,
      email: email,
      token: token,
      expires_at: expiresAt,
      used: 0,
      created_at: new Date()
    };

    await this.db.create(resetData);
    return token;
  }

  async validateToken(token) {
    const results = await this.db.find({ 
      token: token,
      used: 0
    }, { limit: 1 });

    if (!results.length) {
      return null;
    }

    const resetRecord = results[0];
    
    // Verificar si el token ha expirado
    if (new Date() > new Date(resetRecord.expires_at)) {
      return null;
    }

    return resetRecord;
  }

  async markTokenAsUsed(token) {
    await this.db.update(
      { token: token },
      { 
        used: 1,
        used_at: new Date()
      }
    );
  }

  async deleteUserTokens(userId) {
    await this.db.delete({ user_id: userId });
  }

  async cleanExpiredTokens() {
    const now = new Date();
    await this.db.delete({
      expires_at: { '<': now }
    });
  }

  // Método para crear la tabla si no existe
  async createTableIfNotExists() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        INDEX idx_user_id (user_id)
      )
    `;

    try {
      await this.db.query(createTableQuery);
      console.log('Tabla password_resets creada o verificada exitosamente');
    } catch (error) {
      console.error('Error creando tabla password_resets:', error);
      throw error;
    }
  }
}

export default new PasswordResetRepository();
