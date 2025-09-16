import { query } from './config/database.js';
import fs from 'fs';
import path from 'path';

async function updateTicketHistoryEnum() {
  try {
    console.log('🔄 Actualizando ENUM de ticket_history...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(process.cwd(), 'migrations', 'update_ticket_history_enum.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Ejecutar la actualización
    await query(migrationSQL);
    
    console.log('✅ ENUM actualizado exitosamente');
    
    // Verificar la estructura actualizada
    const [columns] = await query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ticket_history' 
      AND COLUMN_NAME = 'estado_nuevo'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Verificación: ENUM actualizado');
      console.log('Valores permitidos:', columns[0].COLUMN_TYPE);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar ENUM:', error);
    process.exit(1);
  }
}

updateTicketHistoryEnum();
