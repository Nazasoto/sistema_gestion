const { query, testConnection } = require('./backend/config/database.js');

async function debugSupervisorEndpoints() {
  try {
    console.log('🔍 Debugging supervisor endpoints...');
    
    // Test database connection
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected');

    // Check if tables exist
    console.log('\n2. Checking tables...');
    const tables = await query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Available tables:', tableNames);

    // Check if ticket_approvals table exists
    if (!tableNames.includes('ticket_approvals')) {
      console.log('❌ ticket_approvals table missing');
      return;
    }
    console.log('✅ ticket_approvals table exists');

    // Check table structure
    console.log('\n3. Checking ticket_approvals structure...');
    const structure = await query("DESCRIBE ticket_approvals");
    console.log('Table structure:', structure.map(col => `${col.Field} (${col.Type})`));

    // Check if there are any records
    console.log('\n4. Checking data...');
    const count = await query("SELECT COUNT(*) as count FROM ticket_approvals");
    console.log('Records in ticket_approvals:', count[0].count);

    // Test the exact queries used in the service
    console.log('\n5. Testing supervisor statistics query...');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_decisiones,
        SUM(CASE WHEN accion = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
        SUM(CASE WHEN accion = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
        (SELECT COUNT(*) FROM tickets WHERE estado = 'pendiente_aprobacion') as pendientes
      FROM ticket_approvals 
      WHERE supervisor_id = ?
    `;
    
    const statsResult = await query(statsQuery, [1]); // Test with supervisor ID 1
    console.log('Stats query result:', statsResult);

    console.log('\n6. Testing supervisor historial query...');
    const historialQuery = `
      SELECT 
        ta.*,
        t.titulo as ticket_titulo,
        t.descripcion as ticket_descripcion,
        t.prioridad as ticket_prioridad,
        uc.nombre as creador_nombre,
        uc.sucursal as creador_sucursal
      FROM ticket_approvals ta
      JOIN tickets t ON ta.ticket_id = t.id
      LEFT JOIN usuarios uc ON t.usuario_creador_id = uc.id
      WHERE ta.supervisor_id = ?
      ORDER BY ta.fecha_decision DESC
    `;
    
    const historialResult = await query(historialQuery, [1]); // Test with supervisor ID 1
    console.log('Historial query result:', historialResult);

    // Check usuarios table structure
    console.log('\n7. Checking usuarios table...');
    const usuariosStructure = await query("DESCRIBE usuarios");
    console.log('Usuarios structure:', usuariosStructure.map(col => `${col.Field} (${col.Type})`));

    // Check tickets table structure
    console.log('\n8. Checking tickets table...');
    const ticketsStructure = await query("DESCRIBE tickets");
    console.log('Tickets structure:', ticketsStructure.map(col => `${col.Field} (${col.Type})`));

    console.log('\n✅ Debug completed successfully');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
}

debugSupervisorEndpoints();
