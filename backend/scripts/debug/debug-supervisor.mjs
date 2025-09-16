import { query, testConnection } from './backend/config/database.js';

async function debugSupervisorEndpoints() {
  try {
    console.log('🔍 Debugging supervisor endpoints...');
    
    // Test database connection
    console.log('1. Testing database connection...');
    await testConnection();
    console.log('✅ Database connected');

    // Check if tables exist
    console.log('\n2. Checking tables...');
    const tables = await query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Available tables:', tableNames);

    // Check if ticket_approvals table exists
    if (!tableNames.includes('ticket_approvals')) {
      console.log('❌ ticket_approvals table missing - running migration...');
      
      // Check if migration file exists and run it
      const fs = await import('fs');
      const path = await import('path');
      const migrationPath = './backend/migrations/add_supervisor_workflow.sql';
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('Running migration...');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await query(statement);
            } catch (error) {
              if (!error.message.includes('already exists')) {
                console.log('Migration statement error (might be expected):', error.message);
              }
            }
          }
        }
        console.log('✅ Migration completed');
      }
      
      // Re-check tables
      const newTables = await query("SHOW TABLES");
      const newTableNames = newTables.map(t => Object.values(t)[0]);
      if (!newTableNames.includes('ticket_approvals')) {
        throw new Error('ticket_approvals table still missing after migration');
      }
    }
    console.log('✅ ticket_approvals table exists');

    // Check table structure
    console.log('\n3. Checking ticket_approvals structure...');
    const structure = await query("DESCRIBE ticket_approvals");
    console.log('Table structure:', structure.map(col => `${col.Field} (${col.Type})`));

    // Test the exact queries used in the service
    console.log('\n4. Testing supervisor statistics query...');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_decisiones,
        SUM(CASE WHEN accion = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
        SUM(CASE WHEN accion = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
        (SELECT COUNT(*) FROM tickets WHERE estado = 'pendiente_aprobacion') as pendientes
      FROM ticket_approvals 
      WHERE supervisor_id = ?
    `;
    
    const statsResult = await query(statsQuery, [1]);
    console.log('✅ Stats query successful:', statsResult);

    console.log('\n5. Testing supervisor historial query...');
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
    
    const historialResult = await query(historialQuery, [1]);
    console.log('✅ Historial query successful:', historialResult);

    console.log('\n✅ All supervisor endpoint queries working correctly');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sql: error.sql
    });
  }
}

debugSupervisorEndpoints();
