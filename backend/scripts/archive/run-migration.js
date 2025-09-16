import { query, testConnection } from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log(' Iniciando migración de base de datos...');
    
    // Probar conexión
    console.log(' Probando conexión a la base de datos...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('No se pudo conectar a la base de datos');
    }
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_reassignment_columns.sql');
    console.log(' Leyendo archivo de migración:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(' Contenido de la migración:');
    console.log(migrationSQL);
    
    // Dividir el SQL en declaraciones individuales
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(` Ejecutando ${statements.length} declaraciones SQL...`);
    
    // Ejecutar cada declaración
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n Ejecutando declaración ${i + 1}/${statements.length}:`);
      console.log(statement);
      
      try {
        const result = await query(statement);
        console.log(' Declaración ejecutada exitosamente');
        if (result && typeof result === 'object') {
          console.log(' Resultado:', result);
        }
      } catch (error) {
        // Si el error es que la columna ya existe, continuar
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists')) {
          console.log('  La columna ya existe, continuando...');
          continue;
        }
        throw error;
      }
    }
    
    // Verificar que las columnas se agregaron correctamente
    console.log('\n Verificando estructura de la tabla tickets...');
    const tableStructure = await query('DESCRIBE tickets');
    
    console.log(' Estructura actual de la tabla tickets:');
    tableStructure.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar que las nuevas columnas existen
    const hasUsuarioReasignado = tableStructure.some(col => col.Field === 'usuario_reasignado');
    const hasFechaReasignacion = tableStructure.some(col => col.Field === 'fecha_reasignacion');
    
    if (hasUsuarioReasignado && hasFechaReasignacion) {
      console.log('\n Migración completada exitosamente!');
      console.log(' Columna usuario_reasignado agregada');
      console.log(' Columna fecha_reasignacion agregada');
    } else {
      console.log('\n Error: Las columnas no se agregaron correctamente');
      console.log(' usuario_reasignado:', hasUsuarioReasignado ? 'OK' : 'FALTA');
      console.log(' fecha_reasignacion:', hasFechaReasignacion ? 'OK' : 'FALTA');
    }
    
  } catch (error) {
    console.error('\n Error durante la migración:');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar la migración
runMigration().then(() => {
  console.log('\n Proceso de migración finalizado');
  process.exit(0);
}).catch(error => {
  console.error('\n Error fatal:', error);
  process.exit(1);
});
