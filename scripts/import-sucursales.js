import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function importSucursales() {
  console.log('🏢 Importando tabla sucursales...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('✅ Conexión establecida');
    
    // Función para convertir fechas ISO a MySQL
    function convertDate(isoDate) {
      if (!isoDate) return null;
      return new Date(isoDate).toISOString().slice(0, 19).replace('T', ' ');
    }

    // Función para manejar valores undefined
    function handleValue(value) {
      return value === undefined ? null : value;
    }

    // Crear tabla sucursales con estructura exacta
    console.log('📋 Creando tabla sucursales...');
    
    await connection.execute('DROP TABLE IF EXISTS sucursales');
    
    await connection.execute(`
      CREATE TABLE sucursales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nro_sucursal VARCHAR(10) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        localidad VARCHAR(100) NOT NULL,
        provincia VARCHAR(50) NOT NULL,
        mail VARCHAR(100),
        direccion VARCHAR(200),
        telefono VARCHAR(20),
        email VARCHAR(100),
        activa TINYINT(1) DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nro_sucursal (nro_sucursal),
        INDEX idx_localidad (localidad),
        INDEX idx_provincia (provincia)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Estructura de tabla sucursales creada');

    // Leer datos de sucursales
    const sucursalesData = JSON.parse(await fs.readFile('./exports/sucursales.json', 'utf8'));
    console.log(`📊 Encontrados ${sucursalesData.data.length} registros de sucursales`);

    // Importar datos
    let importedCount = 0;
    for (const sucursal of sucursalesData.data) {
      try {
        await connection.execute(`
          INSERT INTO sucursales (
            id, nro_sucursal, nombre, localidad, provincia, mail,
            direccion, telefono, email, activa, fecha_creacion, fecha_actualizacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          handleValue(sucursal.id),
          handleValue(sucursal.nro_sucursal),
          handleValue(sucursal.nombre),
          handleValue(sucursal.localidad),
          handleValue(sucursal.provincia),
          handleValue(sucursal.mail),
          handleValue(sucursal.direccion),
          handleValue(sucursal.telefono),
          handleValue(sucursal.email),
          handleValue(sucursal.activa),
          convertDate(sucursal.fecha_creacion),
          convertDate(sucursal.fecha_actualizacion)
        ]);
        importedCount++;
      } catch (error) {
        console.log(`  ⚠️ Error importando sucursal ID ${sucursal.id}: ${error.message}`);
      }
    }

    console.log(`✅ ${importedCount}/${sucursalesData.data.length} sucursales importadas`);

    // Verificar importación
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM sucursales');
    console.log(`📊 Total sucursales en nueva DB: ${count[0].total}`);

    // Mostrar algunas sucursales como ejemplo
    const [sample] = await connection.execute('SELECT id, nro_sucursal, nombre, localidad, provincia FROM sucursales LIMIT 5');
    console.log('\n📋 Muestra de sucursales importadas:');
    sample.forEach(s => {
      console.log(`  - ID: ${s.id}, Nro: ${s.nro_sucursal}, Nombre: ${s.nombre}, Localidad: ${s.localidad}, Provincia: ${s.provincia}`);
    });

    console.log('\n✅ Importación de sucursales completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

importSucursales().catch(console.error);
