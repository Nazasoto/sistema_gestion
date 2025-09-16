import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkMalTickets() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Verificando tickets con estado "mal"...');
    
    // Verificar tickets con estado 'mal'
    const [tickets] = await connection.execute(
      'SELECT id, titulo, estado, fecha_creacion FROM tickets WHERE estado = ?',
      ['mal']
    );
    
    console.log(`📊 Encontrados ${tickets.length} tickets con estado "mal"`);
    
    if (tickets.length > 0) {
      console.log('\n📋 Tickets encontrados:');
      tickets.forEach(ticket => {
        console.log(`- ID: ${ticket.id}, Título: ${ticket.titulo}, Fecha: ${ticket.fecha_creacion}`);
      });
    }
    
    // Verificar ticket_history con estado 'mal'
    const [history] = await connection.execute(
      'SELECT COUNT(*) as count FROM ticket_history WHERE estado_anterior = ? OR estado_nuevo = ?',
      ['mal', 'mal']
    );
    
    console.log(`📈 Registros en ticket_history con estado "mal": ${history[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMalTickets();
