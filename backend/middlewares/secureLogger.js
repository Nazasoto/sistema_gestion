import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecureLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.securityLogFile = path.join(this.logDir, 'security.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio de logs:', error);
    }
  }

  sanitizeData(data) {
    if (typeof data === 'string') {
      return data.replace(/password|token|secret|key/gi, '[REDACTED]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        if (/password|token|secret|key|auth/i.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  async rotateLogIfNeeded() {
    try {
      const stats = await fs.stat(this.securityLogFile);
      if (stats.size > this.maxLogSize) {
        // Rotar logs
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldFile = `${this.securityLogFile}.${i}`;
          const newFile = `${this.securityLogFile}.${i + 1}`;
          
          try {
            await fs.rename(oldFile, newFile);
          } catch (error) {
            // Archivo no existe, continuar
          }
        }
        
        await fs.rename(this.securityLogFile, `${this.securityLogFile}.1`);
      }
    } catch (error) {
      // Archivo no existe aún, continuar
    }
  }

  async logSecurity(event, data = {}) {
    try {
      await this.rotateLogIfNeeded();
      
      const timestamp = new Date().toISOString();
      const sanitizedData = this.sanitizeData(data);
      
      const logEntry = {
        timestamp,
        event,
        data: sanitizedData,
        severity: this.getSeverity(event)
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(this.securityLogFile, logLine);
      
      // También log a consola para eventos críticos
      if (logEntry.severity === 'CRITICAL' || logEntry.severity === 'HIGH') {
        console.warn(`🚨 SECURITY EVENT: ${event}`, sanitizedData);
      }
      
    } catch (error) {
      console.error('Error escribiendo log de seguridad:', error);
    }
  }

  getSeverity(event) {
    const criticalEvents = [
      'ATTACK_PATTERN_DETECTED',
      'BRUTE_FORCE_ATTACK',
      'UNAUTHORIZED_ACCESS_ATTEMPT'
    ];
    
    const highEvents = [
      'RATE_LIMIT_EXCEEDED',
      'SUSPICIOUS_USER_AGENT',
      'INVALID_ORIGIN',
      'AUTH_RATE_LIMIT_EXCEEDED'
    ];
    
    const mediumEvents = [
      'API_SLOWDOWN_TRIGGERED',
      'MISSING_USER_AGENT',
      'NO_ORIGIN_NO_AUTH'
    ];

    if (criticalEvents.includes(event)) return 'CRITICAL';
    if (highEvents.includes(event)) return 'HIGH';
    if (mediumEvents.includes(event)) return 'MEDIUM';
    return 'LOW';
  }

  async getSecurityLogs(limit = 100) {
    try {
      const content = await fs.readFile(this.securityLogFile, 'utf8');
      const lines = content.trim().split('\n').slice(-limit);
      
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return { error: 'Invalid log entry', line };
        }
      });
    } catch (error) {
      return [];
    }
  }

  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const files = await fs.readdir(this.logDir);
      
      for (const file of files) {
        if (file.startsWith('security.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`Log antiguo eliminado: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error limpiando logs antiguos:', error);
    }
  }
}

export const secureLogger = new SecureLogger();

// Limpiar logs antiguos al inicializar (ejecutar una vez al día)
if (Math.random() < 0.1) { // 10% de probabilidad en cada inicio
  secureLogger.cleanOldLogs();
}

export default secureLogger;
