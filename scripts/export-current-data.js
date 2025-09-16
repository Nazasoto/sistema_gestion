import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

async function exportCurrentData() {
  console.log('🔄 Iniciando exportación de datos actuales...');
  
  try {
    // Importar después de cargar las variables de entorno
    const { query } = await import('../backend/config/database.js');
    
    // Crear directorio exports
    const exportDir = join(__dirname, '../exports');
    await fs.mkdir(exportDir, { recursive: true });
    console.log('📁 Directorio exports creado');
    
    // Exportar usuarios completos
    console.log('👥 Exportando usuarios...');
    const usuarios = await query('SELECT * FROM usuarios ORDER BY id_usuario');
    
    await fs.writeFile(
      join(exportDir, 'usuarios_completos.json'),
      JSON.stringify({ usuarios }, null, 2)
    );
    console.log(`✅ ${usuarios.length} usuarios exportados`);
    
    // Exportar tickets completos
    console.log('🎫 Exportando tickets...');
    const tickets = await query('SELECT * FROM tickets ORDER BY id');
    
    await fs.writeFile(
      join(exportDir, 'tickets_completos.json'),
      JSON.stringify({ tickets }, null, 2)
    );
    console.log(`✅ ${tickets.length} tickets exportados`);
    
    // Mostrar información de usuarios
    console.log('\n👥 Usuarios encontrados:');
    usuarios.forEach(user => {
      console.log(`  - ID: ${user.id_usuario}, Usuario: ${user.usuario}, Nombre: ${user.nombre}, Email: ${user.mail}, Role: ${user.role}`);
    });
    
    // Mostrar información de tickets
    console.log('\n🎫 Tickets encontrados:');
    tickets.forEach(ticket => {
      console.log(`  - ID: ${ticket.id}, Título: ${ticket.titulo}, Estado: ${ticket.estado}, Prioridad: ${ticket.prioridad}`);
    });
    
    // Verificar otras tablas
    console.log('\n📋 Verificando otras tablas...');
    const tables = await query('SHOW TABLES');
    console.log('Tablas disponibles:', tables.map(t => Object.values(t)[0]));
    
    console.log('\n✅ Exportación completada exitosamente!');
    console.log(`📁 Archivos guardados en: ${exportDir}`);
    
  } catch (error) {
    console.error('❌ Error durante la exportación:', error.message);
    console.error('Stack:', error.stack);
  }
}

exportCurrentData();
