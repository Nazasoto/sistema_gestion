import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection = null;
  try {
    // Leer el archivo de migración
    const migrationPath = path.join(
      __dirname, 
      '..', 
      'migrations', 
      '20240822_update_tickets_structure.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Conectando a la base de datos...');
    
    // Verificar conexión
    await query('SELECT 1');
    console.log('Conexión exitosa');
    
    console.log('Ejecutando migración...');
    
    // Dividir el script en declaraciones individuales
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Ejecutar cada declaración por separado
    for (const stmt of statements) {
      try {
        console.log(`Ejecutando: ${stmt.substring(0, 100)}...`);
        await query(stmt);
      } catch (error) {
        console.error(`Error ejecutando: ${stmt.substring(0, 100)}...`);
        throw error;
      }
    }
    
    console.log('Migración completada exitosamente');
    
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit();
  }
}

runMigration();
