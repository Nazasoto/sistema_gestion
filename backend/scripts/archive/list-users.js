import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Consulta para obtener todos los usuarios
    const [users] = await connection.execute('SELECT id_usuario, usuario, mail, nombre, apellido, role, vigencia FROM usuarios');
    
    console.log('👥 Usuarios encontrados:', users.length);
    console.log('----------------------------------------');
    
    users.forEach((user, index) => {
      console.log(`🔹 Usuario #${index + 1}:`);
      console.log(`   ID: ${user.id_usuario}`);
      console.log(`   Usuario: ${user.usuario}`);
      console.log(`   Nombre: ${user.nombre} ${user.apellido}`);
      console.log(`   Email: ${user.mail}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Estado: ${user.vigencia === 1 ? 'Activo' : 'Inactivo'}`);
      console.log('----------------------------------------');
    });
    
  } catch (error) {
    console.error('❌ Error al listar usuarios:');
    console.error(error.message);
  } finally {
    await connection.end();
  }
}

listUsers();
