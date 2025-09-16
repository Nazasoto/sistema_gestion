import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'nozomi.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '12624'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'amFgayKbDLBEvAKVRjOfPvDAvXWtGfWS',
  database: process.env.DB_NAME || 'railway',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 60000
};

async function testAndSetupDatabase() {
  let connection;
  try {
    console.log('🔄 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa');

    // Verificar tablas existentes
    console.log('\n📋 Verificando tablas...');
    const [tables] = await connection.query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tablas disponibles:', tableNames);

    // Verificar si ticket_approvals existe
    if (!tableNames.includes('ticket_approvals')) {
      console.log('\n⚠️ Tabla ticket_approvals no existe. Creándola...');
      
      // Crear tabla ticket_approvals
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ticket_approvals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_id INT NOT NULL,
          supervisor_id INT NOT NULL,
          accion ENUM('aprobado', 'rechazado') NOT NULL,
          motivo TEXT,
          fecha_decision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notificacion_enviada BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
          FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )
      `;
      
      await connection.query(createTableSQL);
      console.log('✅ Tabla ticket_approvals creada');
    } else {
      console.log('✅ Tabla ticket_approvals ya existe');
    }

    // Verificar estructura de la tabla tickets para estados
    console.log('\n🔍 Verificando estados de tickets...');
    const [ticketColumns] = await connection.query("SHOW COLUMNS FROM tickets LIKE 'estado'");
    if (ticketColumns.length > 0) {
      console.log('Estados disponibles:', ticketColumns[0].Type);
      
      // Verificar si los nuevos estados existen
      const currentType = ticketColumns[0].Type;
      const hasNewStates = currentType.includes('pendiente_aprobacion') && 
                          currentType.includes('aprobado') && 
                          currentType.includes('rechazado');
      
      if (!hasNewStates) {
        console.log('⚠️ Actualizando estados de tickets...');
        const updateStatesSQL = `
          ALTER TABLE tickets 
          MODIFY COLUMN estado ENUM(
            'nuevo', 'en_espera', 'en_progreso', 'resuelto', 'cerrado', 'cancelado',
            'pendiente_aprobacion', 'aprobado', 'rechazado'
          ) DEFAULT 'pendiente_aprobacion'
        `;
        
        await connection.query(updateStatesSQL);
        console.log('✅ Estados de tickets actualizados');
      } else {
        console.log('✅ Estados de tickets ya están actualizados');
      }
    }

    // Verificar usuarios supervisor
    console.log('\n👥 Verificando usuarios supervisor...');
    const [supervisors] = await connection.query("SELECT COUNT(*) as count FROM usuarios WHERE role = 'supervisor' OR rol = 'supervisor'");
    console.log(`Supervisores encontrados: ${supervisors[0].count}`);
    
    if (supervisors[0].count === 0) {
      console.log('⚠️ No hay supervisores. Creando usuario supervisor de prueba...');
      const createSupervisorSQL = `
        INSERT INTO usuarios (nombre, email, password, role, sucursal, activo) 
        VALUES ('Supervisor Test', 'supervisor@test.com', '$2b$10$hash', 'supervisor', 'Central', 1)
        ON DUPLICATE KEY UPDATE role = 'supervisor'
      `;
      
      try {
        await connection.query(createSupervisorSQL);
        console.log('✅ Usuario supervisor creado');
      } catch (error) {
        console.log('⚠️ Error creando supervisor (puede ser normal):', error.message);
      }
    }

    // Verificar campos en noticias para notificaciones
    console.log('\n📢 Verificando tabla noticias...');
    const [noticiasColumns] = await connection.query("DESCRIBE noticias");
    const columnNames = noticiasColumns.map(col => col.Field);
    
    const requiredColumns = ['sucursal_destino', 'ticket_id', 'supervisor_id', 'tipo'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('⚠️ Agregando columnas faltantes a noticias...');
      for (const column of missingColumns) {
        let alterSQL = '';
        switch (column) {
          case 'sucursal_destino':
            alterSQL = 'ALTER TABLE noticias ADD COLUMN sucursal_destino VARCHAR(100)';
            break;
          case 'ticket_id':
            alterSQL = 'ALTER TABLE noticias ADD COLUMN ticket_id INT';
            break;
          case 'supervisor_id':
            alterSQL = 'ALTER TABLE noticias ADD COLUMN supervisor_id INT';
            break;
          case 'tipo':
            alterSQL = 'ALTER TABLE noticias ADD COLUMN tipo ENUM("general", "rechazo_ticket") DEFAULT "general"';
            break;
        }
        
        if (alterSQL) {
          try {
            await connection.query(alterSQL);
            console.log(`✅ Columna ${column} agregada`);
          } catch (error) {
            console.log(`⚠️ Error agregando ${column}:`, error.message);
          }
        }
      }
    } else {
      console.log('✅ Tabla noticias tiene todas las columnas necesarias');
    }

    console.log('\n🎉 Base de datos configurada correctamente para supervisor workflow');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

testAndSetupDatabase();
