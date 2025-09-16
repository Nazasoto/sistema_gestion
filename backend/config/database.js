import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la base de datos (Railway)
const dbConfig = {
  host: process.env.DB_HOST || 'nozomi.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '12624'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'amFgayKbDLBEvAKVRjOfPvDAvXWtGfWS',
  database: process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  charset: 'utf8mb4',
  timezone: 'local'
};

// Crear el pool de conexiones
const pool = mysql.createPool(dbConfig);

// Probar la conexión
async function testConnection() {
  let connection;
  try {
    console.log('🔍 DATABASE - Testing connection with config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? 'enabled' : 'disabled'
    });
    connection = await pool.getConnection();
    console.log(' Conexión a MySQL establecida correctamente');
    return true;
  } catch (error) {
    console.error(' Error al conectar a MySQL:', error.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// Obtener una conexión del pool (desarrollo)
async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error al obtener conexión del pool:', error.message);
    throw error;
  }
}

// Iniciar una transacción (desarrollo)
async function beginTransaction(connection) {
  if (!connection) {
    throw new Error('Se requiere una conexión para iniciar una transacción');
  }
  try {
    await connection.beginTransaction();
  } catch (error) {
    console.error('Error al iniciar transacción:', error.message);
    throw error;
  }
}

// Confirmar una transacción
async function commit(connection) {
  if (!connection) {
    throw new Error('Se requiere una conexión para confirmar una transacción');
  }
  try {
    await connection.commit();
  } catch (error) {
    console.error('Error al confirmar transacción:', error.message);
    throw error;
  }
}

// Revertir una transacción
async function rollback(connection) {
  if (!connection) {
    console.error('No se pudo revertir la transacción: conexión no válida');
    return;
  }
  try {
    await connection.rollback();
  } catch (error) {
    console.error('Error al revertir transacción:', error.message);
  }
}

// Ejecutar una consulta
async function query(sql, params = [], connection = null) {
  let shouldRelease = !connection;
  let conn = connection;
  
  try {
    // Si no se proporciona una conexión, obtener una nueva
    if (!conn) {
      console.log('Obteniendo nueva conexión del pool...');
      conn = await pool.getConnection();
      console.log('Conexión obtenida exitosamente');
    }
    
    console.log('\n--- INICIO CONSULTA SQL ---');
    console.log('SQL:', sql);
    console.log('Parámetros originales:', params);
    
    const startTime = Date.now();
    // Solo usar parámetros si la consulta los requiere (contiene ?)
    const needsParams = sql.includes('?');
    const finalParams = needsParams ? (Array.isArray(params) ? params : []) : [];
    console.log('Query necesita parámetros:', needsParams);
    console.log('Parámetros finales:', finalParams);
    
    const [results] = await conn.query({
      sql,
      values: finalParams,
      timeout: 10000 // 10 segundos de timeout
    });
    
    const endTime = Date.now();
    console.log(`Consulta ejecutada en ${endTime - startTime}ms`);
    console.log('Resultados obtenidos:', Array.isArray(results) ? 
      `${results.length} filas` : 
      JSON.stringify(results, null, 2));
    
    return results;
  } catch (error) {
    console.error('\n--- ERROR EN CONSULTA SQL ---');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Número de error:', error.errno);
    console.error('Estado SQL:', error.sqlState);
    console.error('SQL con errores:', error.sql);
    console.error('Stack:', error.stack);
    
    // Verificar si el error es por timeout
    if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
      console.error('Error: La consulta ha excedido el tiempo de espera');
    }
    
    // Verificar si es un error de conexión
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNREFUSED') {
      console.error('Error: No se pudo conectar a la base de datos');
    }
    
    throw new Error(`Error en la consulta SQL: ${error.message}`, { cause: error });
  } finally {
    if (conn && shouldRelease) {
      try {
        await conn.release();
        console.log('Conexión liberada al pool');
      } catch (releaseError) {
        console.error('Error al liberar la conexión:', releaseError);
      }
    }
    console.log('--- FIN CONSULTA SQL ---\n');
  }
}

// Exportar todas las funciones necesarias
export { 
  pool, 
  testConnection, 
  query, 
  getConnection, 
  beginTransaction, 
  commit, 
  rollback 
};
