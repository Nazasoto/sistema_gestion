import { getConnection, query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection = null;
  try {
    // Obtener una conexión
    connection = await getConnection();
    
    // Leer el archivo de migración
    const migrationPath = path.join(
      __dirname, 
      '..', 
      'migrations', 
      '20240815_actualizar_estructura_tickets.sql'
    );
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir el script en declaraciones individuales
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log('Ejecutando migración...');
    
    // Ejecutar cada declaración por separado
    for (const statement of statements) {
      if (statement) {
        try {
          await connection.query(statement);
          console.log('Ejecutado:', statement.split('\n')[0].substring(0, 50) + '...');
        } catch (error) {
          console.error('Error al ejecutar la sentencia:', error.message);
          console.error('Sentencia problemática:', statement);
          throw error;
        }
      }
    }
    
    console.log('Migración completada exitosamente');
    
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    if (connection) {
      await connection.release();
    }
    process.exit();
  }
}

runMigration();
