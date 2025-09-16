import MySQLService from '../services/mysql.service.js';
import { testConnection } from '../config/database.js';

// Configuración del servicio para la tabla de usuarios
const userService = new MySQLService('usuarios', {
  idField: 'id_usuario',
  schema: {
    usuario: { type: 'string', required: true, maxLength: 50 },
    role: { 
      type: 'string', 
      required: true, 
      enum: ['admin', 'sucursal', 'soporte'],
      description: 'Rol del usuario en el sistema. Valores permitidos: admin, sucursal, soporte'
    },
    nombre: { type: 'string', required: true, maxLength: 100 },
    apellido: { type: 'string', required: true, maxLength: 100 },
    mail: { 
      type: 'string', 
      required: true, 
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      description: 'Correo electrónico del usuario'
    },
    password: { 
      type: 'string', 
      required: true, 
      minLength: 6,
      description: 'Contraseña del usuario (mínimo 6 caracteres)'
    },
    telefono: { 
      type: 'string', 
      maxLength: 20,
      description: 'Número de teléfono del usuario'
    },
    vigencia: { 
      type: 'number', 
      default: 1,
      description: 'Estado del usuario (1: activo, 0: inactivo)'
    }
  }
});

// Datos de prueba para un nuevo usuario
const testUser = {
  usuario: 'usuario_prueba',
  role: 'soporte', // Usando uno de los roles válidos: 'admin', 'sucursal', 'soporte'
  nombre: 'Usuario',
  apellido: 'de Prueba',
  mail: 'prueba@example.com',
  password: 'password123',
  telefono: '123456789',
  vigencia: 1
};

// Función para ejecutar las pruebas
async function runTests() {
  let testUserId;
  let connection;
  
  try {
    console.log('🚀 Probando conexión a MySQL...');
    await testConnection();
    console.log('🚀 Iniciando pruebas del servicio MySQL...\n');
    
    // 1. Prueba de conexión y conteo inicial
    console.log('1. Probando conexión y conteo de usuarios...');
    const initialCount = await userService.count();
    console.log(`   ✅ OK - Usuarios en la base de datos: ${initialCount}`);
    
    // 2. Prueba de creación de usuario
    console.log('\n2. Probando creación de usuario...');
    const newUser = await userService.create(testUser);
    testUserId = newUser.id_usuario;
    console.log('   ✅ OK - Usuario creado con ID:', testUserId);
    
    // 3. Prueba de búsqueda por ID
    console.log('\n3. Probando búsqueda por ID...');
    const foundUser = await userService.getById(testUserId);
    console.log('   ✅ OK - Usuario encontrado:', foundUser.usuario);
    
    // 4. Prueba de búsqueda con criterios
    console.log('\n4. Probando búsqueda con criterios...');
    const [user] = await userService.find({ mail: testUser.mail });
    console.log(`   ✅ OK - Usuario encontrado por email: ${user.mail}`);
    
    // 5. Prueba de actualización
    console.log('\n5. Probando actualización de usuario...');
    const updatedData = { telefono: '987654321' };
    await userService.update(testUserId, updatedData);
    const updatedUser = await userService.getById(testUserId);
    console.log(`   ✅ OK - Teléfono actualizado a: ${updatedUser.telefono}`);
    
    // 6. Prueba de transacción
    console.log('\n6. Probando transacciones...');
    connection = await userService.beginTransaction();
    try {
      await userService.update(testUserId, { telefono: '111111111' }, { connection });
      await userService.commitTransaction(connection);
      console.log('   ✅ OK - Transacción completada correctamente');
    } catch (error) {
      await userService.rollbackTransaction(connection);
      console.error('   ❌ Error en la transacción:', error.message);
      throw error;
    }
    
    // 7. Prueba de validación de esquema
    console.log('\n7. Probando validación de esquema...');
    try {
      await userService.create({ 
        // Falta el campo requerido 'role'
        usuario: 'invalido',
        nombre: 'Invalido',
        apellido: 'Usuario',
        mail: 'invalido@example.com',
        password: '123'
      });
      console.log('   ❌ FALLA - La validación debería haber fallado');
    } catch (error) {
      console.log('   ✅ OK - Validación falló como se esperaba:', error.details[0]);
    }
    
    console.log('\n✅ ¡Todas las pruebas se completaron con éxito!');
    
  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
    if (error.details) {
      console.error('Detalles de validación:', error.details);
    }
    process.exit(1);
  } finally {
    // Limpieza: eliminar el usuario de prueba
    if (testUserId) {
      try {
        await userService.delete(testUserId);
        console.log('\n🧹 Usuario de prueba eliminado');
      } catch (error) {
        console.error('Error al limpiar el usuario de prueba:', error);
      }
    }
    
    // Cerrar la conexión si está abierta
    if (connection) {
      try {
        connection.release();
      } catch (error) {
        console.error('Error al liberar la conexión:', error);
      }
    }
    
    process.exit(0);
  }
}

// Ejecutar las pruebas
runTests();
