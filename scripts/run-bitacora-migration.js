import { query } from '../backend/config/database.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración de bitácora...');
    
    // Leer el archivo SQL
    const sqlPath = join(__dirname, 'backend', 'database', 'migrations', 'create_bitacora_table.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Dividir por declaraciones SQL (separadas por ;)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Ejecutar cada declaración
    for (const statement of statements) {
      console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
      await query(statement);
    }
    
    console.log('✅ Migración de bitácora completada exitosamente');
    
    // Verificar que la tabla fue creada
    const tables = await query("SHOW TABLES LIKE 'bitacora_eventos'");
    if (tables.length > 0) {
      console.log('✅ Tabla bitacora_eventos creada correctamente');
      
      // Mostrar estructura de la tabla
      const structure = await query("DESCRIBE bitacora_eventos");
      console.log('📋 Estructura de la tabla:');
      structure.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ Error: La tabla no fue creada');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
