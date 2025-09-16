import { query } from '../config/database.js';

async function checkTables() {
  try {
    // Verificar si la tabla usuarios existe
    const [usersTable] = await query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'railway' 
      AND TABLE_NAME = 'usuarios'
    `);

    console.log('Tabla usuarios existe:', usersTable ? 'Sí' : 'No');

    // Verificar si la tabla tickets existe
    const [ticketsTable] = await query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'railway' 
      AND TABLE_NAME = 'tickets'
    `);

    console.log('Tabla tickets existe:', ticketsTable ? 'Sí' : 'No');

  } catch (error) {
    console.error('Error al verificar las tablas:', error);
  } finally {
    process.exit();
  }
}

checkTables();
