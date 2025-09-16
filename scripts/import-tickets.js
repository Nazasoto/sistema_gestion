import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function importTickets() {
  console.log('🎫 Importando tabla tickets...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('✅ Conexión establecida');
    
    // Función para convertir fechas ISO a MySQL
    function convertDate(isoDate) {
      if (!isoDate) return null;
      return new Date(isoDate).toISOString().slice(0, 19).replace('T', ' ');
    }

    // Función para manejar valores undefined
    function handleValue(value) {
      return value === undefined ? null : value;
    }

    // Leer estructura de tickets para verificar campos
    const ticketsData = JSON.parse(await fs.readFile('./exports/tickets.json', 'utf8'));
    console.log(`📊 Encontrados ${ticketsData.data.length} registros de tickets`);

    // Mostrar estructura de la tabla actual
    const [structure] = await connection.execute('DESCRIBE tickets');
    console.log('📋 Estructura actual de tabla tickets:');
    structure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} (${field.Null === 'NO' ? 'NOT NULL' : 'NULL'})`);
    });

    // Importar datos de tickets
    let importedCount = 0;
    for (const ticket of ticketsData.data) {
      try {
        // Manejar archivos_adjuntos como JSON
        let archivosAdjuntos = ticket.archivos_adjuntos;
        if (typeof archivosAdjuntos !== 'string') {
          archivosAdjuntos = JSON.stringify(archivosAdjuntos || []);
        }

        await connection.execute(`
          INSERT INTO tickets (
            id, titulo, descripcion, estado, prioridad, categoria,
            usuario_creador_id, usuario_asignado_id, fecha_creacion,
            fecha_actualizacion, fecha_cierre, archivos_adjuntos,
            comentarios, usuario_reasignado, fecha_reasignacion, informe_supervisor
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          handleValue(ticket.id),
          handleValue(ticket.titulo),
          handleValue(ticket.descripcion),
          handleValue(ticket.estado),
          handleValue(ticket.prioridad),
          handleValue(ticket.categoria),
          handleValue(ticket.usuario_creador_id),
          handleValue(ticket.usuario_asignado_id),
          convertDate(ticket.fecha_creacion),
          convertDate(ticket.fecha_actualizacion),
          convertDate(ticket.fecha_cierre),
          archivosAdjuntos,
          handleValue(ticket.comentarios),
          handleValue(ticket.usuario_reasignado),
          convertDate(ticket.fecha_reasignacion),
          handleValue(ticket.informe_supervisor)
        ]);
        importedCount++;
      } catch (error) {
        console.log(`  ⚠️ Error importando ticket ID ${ticket.id}: ${error.message}`);
        // Mostrar datos del ticket problemático
        console.log(`     Título: ${ticket.titulo}`);
        console.log(`     Estado: ${ticket.estado}`);
        console.log(`     Prioridad: ${ticket.prioridad}`);
      }
    }

    console.log(`✅ ${importedCount}/${ticketsData.data.length} tickets importados`);

    // Verificar importación
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM tickets');
    console.log(`📊 Total tickets en nueva DB: ${count[0].total}`);

    // Mostrar algunos tickets como ejemplo
    const [sample] = await connection.execute('SELECT id, titulo, estado, prioridad, usuario_creador_id FROM tickets LIMIT 5');
    console.log('\n📋 Muestra de tickets importados:');
    sample.forEach(t => {
      console.log(`  - ID: ${t.id}, Título: ${t.titulo}, Estado: ${t.estado}, Prioridad: ${t.prioridad}, Creador: ${t.usuario_creador_id}`);
    });

    console.log('\n✅ Importación de tickets completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

importTickets().catch(console.error);
