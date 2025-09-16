import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query } from '../backend/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

async function exportDatabase() {
  try {
    console.log('🔄 Iniciando exportación de la base de datos Railway...');
    console.log('📍 Directorio actual:', __dirname);
    
    // Crear directorio de exports si no existe
    const exportDir = join(__dirname, '../exports');
    console.log('📁 Creando directorio:', exportDir);
    
    try {
      await fs.mkdir(exportDir, { recursive: true });
      console.log('✅ Directorio creado exitosamente');
    } catch (error) {
      console.log('⚠️ Error creando directorio:', error.message);
    }
    
    // Exportar usuarios
    console.log('👥 Exportando usuarios...');
    const usuarios = await query('SELECT * FROM usuarios ORDER BY id_usuario');
    await fs.writeFile(
      join(exportDir, 'usuarios_export.json'),
      JSON.stringify({ usuarios }, null, 2),
      'utf8'
    );
    console.log(`✅ ${usuarios.length} usuarios exportados`);
    
    // Exportar tickets
    console.log('🎫 Exportando tickets...');
    const tickets = await query('SELECT * FROM tickets ORDER BY id');
    await fs.writeFile(
      join(exportDir, 'tickets_export.json'),
      JSON.stringify({ tickets }, null, 2),
      'utf8'
    );
    console.log(`✅ ${tickets.length} tickets exportados`);
    
    // Exportar historial de tickets
    console.log('📋 Exportando historial de tickets...');
    try {
      const ticketHistory = await query('SELECT * FROM ticket_history ORDER BY id');
      await fs.writeFile(
        join(exportDir, 'ticket_history_export.json'),
        JSON.stringify({ ticket_history: ticketHistory }, null, 2),
        'utf8'
      );
      console.log(`✅ ${ticketHistory.length} registros de historial exportados`);
    } catch (error) {
      console.log('⚠️ Tabla ticket_history no existe o está vacía');
    }
    
    // Exportar bitácora de eventos
    console.log('📊 Exportando bitácora de eventos...');
    try {
      const bitacoraEventos = await query('SELECT * FROM bitacora_eventos ORDER BY id');
      await fs.writeFile(
        join(exportDir, 'bitacora_eventos_export.json'),
        JSON.stringify({ bitacora_eventos: bitacoraEventos }, null, 2),
        'utf8'
      );
      console.log(`✅ ${bitacoraEventos.length} eventos de bitácora exportados`);
    } catch (error) {
      console.log('⚠️ Tabla bitacora_eventos no existe o está vacía');
    }
    
    // Exportar solicitudes de reset de contraseña
    console.log('🔑 Exportando solicitudes de reset de contraseña...');
    try {
      const passwordResets = await query('SELECT * FROM password_reset_requests ORDER BY id');
      await fs.writeFile(
        join(exportDir, 'password_reset_requests_export.json'),
        JSON.stringify({ password_reset_requests: passwordResets }, null, 2),
        'utf8'
      );
      console.log(`✅ ${passwordResets.length} solicitudes de reset exportadas`);
    } catch (error) {
      console.log('⚠️ Tabla password_reset_requests no existe o está vacía');
    }
    
    // Mostrar resumen de tablas
    console.log('\n📋 Listando todas las tablas disponibles...');
    const tables = await query('SHOW TABLES');
    console.log('Tablas encontradas:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });
    
    // Crear archivo de resumen
    const summary = {
      export_date: new Date().toISOString(),
      database_info: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
      },
      exported_data: {
        usuarios: usuarios.length,
        tickets: tickets.length,
        tables_found: tables.length
      },
      files_created: [
        'usuarios_export.json',
        'tickets_export.json',
        'ticket_history_export.json',
        'bitacora_eventos_export.json',
        'password_reset_requests_export.json'
      ]
    };
    
    await fs.writeFile(
      join(exportDir, 'export_summary.json'),
      JSON.stringify(summary, null, 2),
      'utf8'
    );
    
    console.log('\n✅ Exportación completada exitosamente!');
    console.log(`📁 Archivos guardados en: ${exportDir}`);
    console.log('\n📊 Resumen:');
    console.log(`   👥 Usuarios: ${usuarios.length}`);
    console.log(`   🎫 Tickets: ${tickets.length}`);
    console.log(`   📋 Tablas totales: ${tables.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la exportación:', error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  exportDatabase()
    .then(() => {
      console.log('🎉 Proceso de exportación finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { exportDatabase };
