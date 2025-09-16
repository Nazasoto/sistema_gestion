import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function importTicketHistory() {
  console.log('📋 Importando tabla ticket_history...');
  
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

    // Crear tabla ticket_history con estructura correcta
    console.log('📋 Creando tabla ticket_history...');
    
    await connection.execute('DROP TABLE IF EXISTS ticket_history');
    
    await connection.execute(`
      CREATE TABLE ticket_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        estado_anterior ENUM('nuevo','en_espera','en_progreso','resuelto','pendiente','cerrado','cancelado','pendiente_aprobacion','aprobado','rechazado'),
        estado_nuevo ENUM('nuevo','en_espera','en_progreso','resuelto','pendiente','cerrado','cancelado','pendiente_aprobacion','aprobado','rechazado') NOT NULL,
        usuario_id INT NOT NULL,
        comentario TEXT,
        fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket_id (ticket_id),
        INDEX idx_fecha_cambio (fecha_cambio),
        INDEX idx_usuario_id (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Estructura de tabla ticket_history creada');

    // Leer datos de ticket_history
    const historyData = JSON.parse(await fs.readFile('./exports/ticket_history.json', 'utf8'));
    console.log(`📊 Encontrados ${historyData.data.length} registros de historial`);

    // Importar datos
    let importedCount = 0;
    for (const history of historyData.data) {
      try {
        await connection.execute(`
          INSERT INTO ticket_history (
            id, ticket_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_cambio
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          handleValue(history.id),
          handleValue(history.ticket_id),
          handleValue(history.estado_anterior),
          handleValue(history.estado_nuevo),
          handleValue(history.usuario_id),
          handleValue(history.comentario),
          convertDate(history.fecha_cambio)
        ]);
        importedCount++;
      } catch (error) {
        console.log(`  ⚠️ Error importando historial ID ${history.id}: ${error.message}`);
        console.log(`     Ticket ID: ${history.ticket_id}, Estado: ${history.estado_anterior} -> ${history.estado_nuevo}`);
      }
    }

    console.log(`✅ ${importedCount}/${historyData.data.length} registros de historial importados`);

    // Verificar importación
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM ticket_history');
    console.log(`📊 Total registros de historial en nueva DB: ${count[0].total}`);

    // Mostrar algunos registros como ejemplo
    const [sample] = await connection.execute(`
      SELECT id, ticket_id, usuario_id, estado_anterior, estado_nuevo, fecha_cambio 
      FROM ticket_history 
      ORDER BY fecha_cambio DESC 
      LIMIT 5
    `);
    console.log('\n📋 Muestra de historial importado:');
    sample.forEach(h => {
      console.log(`  - ID: ${h.id}, Ticket: ${h.ticket_id}, Usuario: ${h.usuario_id}, Estado: ${h.estado_anterior} -> ${h.estado_nuevo}, Fecha: ${h.fecha_cambio}`);
    });

    console.log('\n✅ Importación de ticket_history completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

importTicketHistory().catch(console.error);
