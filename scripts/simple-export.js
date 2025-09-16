import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function exportData() {
  console.log('🔄 Exportando datos de Railway...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Crear directorio
    await fs.mkdir('./exports', { recursive: true });
    
    // Exportar usuarios
    const [usuarios] = await connection.execute('SELECT * FROM usuarios');
    await fs.writeFile('./exports/usuarios.json', JSON.stringify({ usuarios }, null, 2));
    console.log(`✅ ${usuarios.length} usuarios exportados`);
    
    // Exportar tickets
    const [tickets] = await connection.execute('SELECT * FROM tickets');
    await fs.writeFile('./exports/tickets.json', JSON.stringify({ tickets }, null, 2));
    console.log(`✅ ${tickets.length} tickets exportados`);
    
    console.log('✅ Exportación completada');
    
  } finally {
    await connection.end();
  }
}

exportData().catch(console.error);
