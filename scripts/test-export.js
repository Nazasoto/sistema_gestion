import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔄 Probando conexión...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

try {
  const { query } = await import('../backend/config/database.js');
  console.log('✅ Módulo de database importado');
  
  const usuarios = await query('SELECT COUNT(*) as total FROM usuarios');
  console.log('👥 Total usuarios:', usuarios[0].total);
  
  const tickets = await query('SELECT COUNT(*) as total FROM tickets');
  console.log('🎫 Total tickets:', tickets[0].total);
  
  console.log('✅ Conexión exitosa');
} catch (error) {
  console.error('❌ Error:', error.message);
}
