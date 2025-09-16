import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'nozomi.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '12624'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'amFgayKbDLBEvAKVRjOfPvDAvXWtGfWS',
  database: process.env.DB_NAME || 'railway',
  ssl: { rejectUnauthorized: false }
};

async function debugSupervisorQueries() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa');

    // Check table structure
    console.log('\n📋 Checking tickets table structure...');
    const [ticketsStructure] = await connection.query('DESCRIBE tickets');
    console.table(ticketsStructure);

    console.log('\n👥 Checking usuarios table structure...');
    const [usuariosStructure] = await connection.query('DESCRIBE usuarios');
    console.table(usuariosStructure);

    // Check for tickets with pendiente_aprobacion state
    console.log('\n🔍 Checking for pendiente_aprobacion tickets...');
    const [pendingCount] = await connection.query("SELECT COUNT(*) as count FROM tickets WHERE estado = 'pendiente_aprobacion'");
    console.log('Pending tickets:', pendingCount[0].count);

    // Test simplified query first
    console.log('\n🧪 Testing simplified query...');
    const simpleQuery = "SELECT id, titulo, estado FROM tickets WHERE estado = 'pendiente_aprobacion' LIMIT 5";
    const [simpleResult] = await connection.query(simpleQuery);
    console.log('Simple query result:', simpleResult);

    // Test the problematic JOIN query
    console.log('\n🔍 Testing JOIN query...');
    const joinQuery = `
      SELECT 
        t.id,
        t.titulo,
        t.estado,
        uc.nombre as nombre_creador
      FROM tickets t
      LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id_usuario
      WHERE t.estado = 'pendiente_aprobacion'
      LIMIT 5
    `;
    
    const [joinResult] = await connection.query(joinQuery);
    console.log('JOIN query result:', joinResult);

    // Check if the issue is with the column reference
    console.log('\n🔍 Testing different JOIN approaches...');
    
    // Try with id instead of id_usuario
    try {
      const altJoinQuery = `
        SELECT 
          t.id,
          t.titulo,
          uc.nombre as nombre_creador
        FROM tickets t
        LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id
        WHERE t.estado = 'pendiente_aprobacion'
        LIMIT 2
      `;
      const [altResult] = await connection.query(altJoinQuery);
      console.log('Alternative JOIN (with uc.id):', altResult);
    } catch (altError) {
      console.log('Alternative JOIN failed:', altError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('Error Code:', error.code);
    console.error('Full error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

debugSupervisorQueries();
