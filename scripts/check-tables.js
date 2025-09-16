import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
};

async function checkTables() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa a la base de datos');

    // Ver tablas existentes
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Tablas existentes:');
    console.table(tables);

    // Ver estructura de la tabla tickets si existe
    if (tables.some(t => t.Tables_in_railway === 'tickets')) {
      console.log('\n🔍 Estructura de la tabla tickets:');
      const [columns] = await connection.query('DESCRIBE tickets');
      console.table(columns);
      
      // Contar tickets
      const [count] = await connection.query('SELECT COUNT(*) as total FROM tickets');
      console.log(`\n📊 Total de tickets: ${count[0].total}`);
      
      // Mostrar algunos tickets de ejemplo
      const [tickets] = await connection.query('SELECT * FROM tickets LIMIT 5');
      console.log('\n📝 Ejemplo de tickets:');
      console.table(tickets);
    }

    // Ver estructura de la tabla usuarios
    if (tables.some(t => t.Tables_in_railway === 'usuarios')) {
      console.log('\n👥 Estructura de la tabla usuarios:');
      const [columns] = await connection.query('DESCRIBE usuarios');
      console.table(columns);
      
      // Contar usuarios
      const [count] = await connection.query('SELECT COUNT(*) as total FROM usuarios');
      console.log(`\n👥 Total de usuarios: ${count[0].total}`);
    }

  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkTables();
