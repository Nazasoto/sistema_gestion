import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTicketHistoryMigration() {
  try {
    console.log(' Iniciando migración de tabla ticket_history...');
    
    // Verificar conexión a la base de datos
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }
    console.log(' Conexión a la base de datos establecida');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', '20250825_create_ticket_history_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    console.log(' Archivo de migración leído');

    // Dividir las consultas por punto y coma
    const queries = migrationSQL
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    console.log(` Ejecutando ${queries.length} consultas...`);

    // Ejecutar cada consulta
    for (let i = 0; i < queries.length; i++) {
      const sql = queries[i];
      console.log(`   ${i + 1}/${queries.length}: Ejecutando consulta...`);
      await query(sql);
    }

    console.log(' Migración completada exitosamente');
    
    // Verificar que la tabla se creó correctamente
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'ticket_history'
    `);
    
    if (tables.length > 0) {
      console.log(' Tabla ticket_history creada correctamente');
      
      // Mostrar estructura de la tabla
      const columns = await query('DESCRIBE ticket_history');
      console.log('\n Estructura de la tabla ticket_history:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      throw new Error('La tabla ticket_history no se encontró después de la migración');
    }

    console.log('\n Migración completada con éxito');
    
  } catch (error) {
    console.error(' Error durante la migración:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar la migración
runTicketHistoryMigration();
