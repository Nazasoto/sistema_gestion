// Middleware para rastrear actividad de usuarios
class UserActivityTracker {
  constructor() {
    this.activeUsers = new Map(); // userId -> { lastActivity, userInfo }
    this.TIMEOUT_MINUTES = 5; // Considerar offline después de 5 minutos
    
    // Limpiar usuarios inactivos cada minuto
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000);
  }

  // Actualizar actividad de un usuario
  updateActivity(userId, userInfo) {
    console.log(`🔄 Actualizando actividad para usuario ${userId}:`, userInfo.nombre);
    this.activeUsers.set(userId, {
      lastActivity: new Date(),
      userInfo: {
        id_usuario: userInfo.id_usuario || userId,
        nombre: userInfo.nombre,
        apellido: userInfo.apellido,
        role: userInfo.role,
        email: userInfo.email
      }
    });
  }

  // Remover actividad específica (para logout)
  removeActivity(userId) {
    const activity = this.activeUsers.get(userId);
    if (activity) {
      console.log(`🚪 Removiendo actividad: ${activity.userInfo.nombre} (${activity.userInfo.role})`);
      this.activeUsers.delete(userId);
      return true;
    }
    return false;
  }

  // Obtener usuarios activos por rol
  getActiveUsersByRole(role) {
    const now = new Date();
    const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
    
    const activeUsers = [];
    
    console.log(`🔍 Buscando usuarios activos con rol '${role}'. Total en memoria: ${this.activeUsers.size}`);
    
    for (const [userId, data] of this.activeUsers.entries()) {
      const timeDiff = now - data.lastActivity;
      const isOnline = timeDiff < timeoutMs;
      
      console.log(`   Usuario ${data.userInfo.nombre} (${data.userInfo.role}): ${isOnline ? 'ONLINE' : 'OFFLINE'} - ${Math.floor(timeDiff / 60000)}m`);
      
      if (data.userInfo.role === role) {
        activeUsers.push({
          ...data.userInfo,
          isOnline,
          lastSeen: data.lastActivity,
          minutesAgo: Math.floor(timeDiff / 60000)
        });
      }
    }
    
    console.log(`✅ Encontrados ${activeUsers.length} usuarios con rol '${role}'`);
    return activeUsers;
  }

  // Obtener todos los usuarios activos
  getAllActiveUsers() {
    const now = new Date();
    const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
    
    const activeUsers = [];
    
    for (const [userId, data] of this.activeUsers.entries()) {
      const timeDiff = now - data.lastActivity;
      if (timeDiff > timeoutMs * 2) { // Eliminar después de 10 minutos de inactividad
        this.activeUsers.delete(userId);
      } else {
        activeUsers.push({
          ...data.userInfo,
          isOnline: timeDiff < timeoutMs,
          lastSeen: data.lastActivity,
          minutesAgo: Math.floor(timeDiff / 60000)
        });
      }
    }
    
    return activeUsers;
  }

  // Marcar usuario como desconectado
  markUserOffline(userId) {
    this.activeUsers.delete(userId);
  }

  // Limpiar usuarios inactivos
  cleanupInactiveUsers() {
    const now = new Date();
    const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
    
    for (const [userId, data] of this.activeUsers.entries()) {
      const timeDiff = now - data.lastActivity;
      if (timeDiff > timeoutMs * 2) { // Eliminar después de 10 minutos de inactividad
        this.activeUsers.delete(userId);
      }
    }
  }

  // Obtener estadísticas
  getStats() {
    const now = new Date();
    const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
    
    let onlineCount = 0;
    let totalCount = this.activeUsers.size;
    
    for (const [userId, data] of this.activeUsers.entries()) {
      const timeDiff = now - data.lastActivity;
      if (timeDiff < timeoutMs) {
        onlineCount++;
      }
    }
    
    return {
      online: onlineCount,
      total: totalCount,
      timeout_minutes: this.TIMEOUT_MINUTES
    };
  }
}

// Instancia global del tracker
const activityTracker = new UserActivityTracker();

// Middleware para actualizar actividad automáticamente
const trackUserActivity = (req, res, next) => {
  if (req.user && req.user.id) {
    activityTracker.updateActivity(req.user.id, req.user);
  }
  next();
};

export {
  activityTracker,
  trackUserActivity
};
