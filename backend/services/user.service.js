import bcrypt from 'bcryptjs';
import MySQLService from './mysql.service.js';

// Servicio genérico apuntando a la tabla 'usuarios'
const usersModel = new MySQLService('usuarios', {
  idField: 'id_usuario'
});

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

function mapDbUserToApi(userRow) {
  if (!userRow) return null;
  return {
    id: userRow.id_usuario,
    usuario: userRow.usuario,
    email: userRow.mail,
    nombre: userRow.nombre,
    apellido: userRow.apellido,
    role: userRow.role,
    telefono: userRow.telefono,
    vigencia: userRow.vigencia,
    nacimiento: userRow.nacimiento,
    sucursal: userRow.sucursal || null
  };
}

class UserService {
  async getAll() {
    const rows = await usersModel.getAll();
    return rows.map(mapDbUserToApi);
  }

  async getById(id) {
    const row = await usersModel.getById(id);
    return mapDbUserToApi(row);
  }

  async getByEmail(email) {
    const results = await usersModel.find({ mail: email }, { limit: 1 });
    return results.length ? mapDbUserToApi(results[0]) : null;
  }

  async validateCredentials(email, password) {
    // Obtener el usuario con la contraseña para validación
    const results = await usersModel.find({ mail: email }, { limit: 1 });
    if (!results.length) {
      return null;
    }
    
    const dbUser = results[0];
    const storedPassword = dbUser.password;
    let valid = false;
    
    // Validar contraseña
    if (isBcryptHash(storedPassword)) {
      valid = await bcrypt.compare(password, storedPassword);
    } else {
      valid = storedPassword === password;
    }
    
    if (!valid) return null;
    
    // Devolver el usuario mapeado sin la contraseña
    return mapDbUserToApi(dbUser);
  }

  async create(userData) {
    // Validar unicidad de email
    const existing = await this.getByEmail(userData.email || userData.mail);
    if (existing) {
      throw new Error('El correo electrónico ya está en uso');
    }

    const toInsert = {
      usuario: userData.usuario,
      role: userData.role,
      nombre: userData.nombre,
      apellido: userData.apellido,
      mail: userData.email || userData.mail,
      password: userData.password,
      telefono: userData.telefono || null,
      nacimiento: userData.nacimiento || null,
      vigencia: userData.vigencia ?? 1,
      sucursal: userData.sucursal || null
    };

    // Only hash passwords for admin/supervisor roles, keep plain text for sucursal users
    if (!isBcryptHash(toInsert.password)) {
      if (toInsert.role === 'admin' || toInsert.role === 'supervisor' || toInsert.role === 'soporte') {
        toInsert.password = await bcrypt.hash(toInsert.password, 10);
      }
      // For 'sucursal' role users, keep password as plain text
    }

    const created = await usersModel.create(toInsert);
    return mapDbUserToApi(created);
  }

  async update(id, updates) {
    const changes = { ...updates };

    if (changes.email && !changes.mail) {
      changes.mail = changes.email;
      delete changes.email;
    }
    
    // Asegurarse de que el campo sucursal esté incluido si se proporciona
    if ('sucursal' in changes) {
      changes.sucursal = changes.sucursal || null;
    }

    // Debug logging for password updates
    if (changes.password) {
      console.log(`🔧 UPDATE METHOD - Password antes de procesar: ${changes.password}`);
      console.log(`🔧 UPDATE METHOD - Es bcrypt hash?: ${isBcryptHash(changes.password)}`);
      
      // No hash passwords when updated by admin/support - keep as plain text
      if (!isBcryptHash(changes.password)) {
        console.log(`🔧 UPDATE METHOD - Manteniendo contraseña como texto plano`);
        // Keep password as plain text when updated via update method (admin/support changes)
      }
    }

    console.log(`🔧 UPDATE METHOD - Datos finales a guardar:`, changes);
    await usersModel.update(id, changes);
    return this.getById(id);
  }

  async delete(id) {
    return await usersModel.delete(id);
  }

  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password hash
    const user = await usersModel.getById(userId, {
      includePassword: true // This needs to be supported by your MySQLService
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('La contraseña actual es incorrecta');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await usersModel.update(userId, { password: hashedPassword });
    
    return { success: true };
  }

  async findByEmail(email) {
    try {
      const users = await usersModel.getAll();
      return users.find(user => user.mail === email && user.estado === 'activo');
    } catch (error) {
      console.error('Error buscando usuario por email:', error);
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      const results = await usersModel.find({ usuario: username }, { limit: 1 });
      return results.length ? results[0] : null;
    } catch (error) {
      console.error('Error buscando usuario por username:', error);
      throw error;
    }
  }

  async updatePassword(userId, newPassword) {
    try {
      // Store password as plain text when updated by admin/support
      await usersModel.update(userId, { password: newPassword });
      return { success: true };
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      throw error;
    }
  }
}

export default new UserService();
