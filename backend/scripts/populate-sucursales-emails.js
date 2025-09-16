import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'ticket',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectTimeout: 60000,
  charset: 'utf8mb4'
};

// Mapeo de sucursales con sus emails correspondientes (emails reales proporcionados)
const sucursalesEmails = {
  '1': 'concordia@palmaresltd.com.ar',
  '2': 'uruguay@palmaresltd.com.ar', 
  '3': 'gualeguaychu@palmaresltd.com.ar',
  '4': 'garupa@palmaresltd.com.ar',
  '5': 'chajari@palmaresltd.com.ar',
  '6': 'villaguay@palmaresltd.com.ar',
  '7': 'victoria@palmaresltd.com.ar',
  '8': 'gualeguay@palmaresltd.com.ar',
  '9': 'vera@palmaresltd.com.ar',
  '10': 'cobranza@palmaresltd.com.ar', // Sucursal 10 ahora tiene email
  '11': 'colonp@palmaresltd.com.ar',
  '12': 'villaelisa@palmaresltd.com.ar',
  '13': 'santaelena@palmaresltd.com.ar',
  '14': 'lapaz@palmaresltd.com.ar',
  '15': 'resistencia@palmaresltd.com.ar',
  '16': 'sansalvador@palmaresltd.com.ar',
  '17': 'pdeloslibres@palmaresltd.com.ar',
  '18': 'tala1@palmaresltd.com.ar',
  '19': 'federacion@palmaresltd.com.ar',
  '20': 'montecaseros@palmaresltd.com.ar',
  '21': 'corrientes@palmaresltd.com.ar',
  '22': 'curuzu@palmaresltd.com.ar',
  '23': 'nogoya@palmaresltd.com.ar',
  '24': 'vangela@palmaresltd.com.ar',
  '25': 'sjose@palmaresltd.com.ar',
  '26': 'formosa@palmaresltd.com.ar',
  '27': 'iguazu@palmaresltd.com.ar',
  '28': 'posadas@palmaresltd.com.ar',
  '29': 'stome@palmaresltd.com.ar',
  '30': 'goya@palmaresltd.com.ar',
  '31': 'rspena@palmaresltd.com.ar',
  '32': 'mercedes@palmaresltd.com.ar',
  '33': 'apostoles@palmaresltd.com.ar',
  '34': 'crespo@palmaresltd.com.ar',
  '35': 'diamante@palmaresltd.com.ar',
  '36': 'esquina@palmaresltd.com.ar',
  '37': 'bvista@palmaresltd.com.ar',
  '38': 'clorinda@palmaresltd.com.ar',
  '39': 'federal@palmaresltd.com.ar',
  '40': 'feliciano@palmaresltd.com.ar',
  '41': 'basavilbaso@palmaresltd.com.ar',
  '42': 'obera@palmaresltd.com.ar',
  '43': 'eldorado@palmaresltd.com.ar',
  '44': 'reconquista@palmaresltd.com.ar',
  '45': 'alem@palmaresltd.com.ar',
  '46': 'puertorico@palmaresltd.com.ar',
  '47': 'lacruz@palmaresltd.com.ar',
  '48': 'santalucia@palmaresltd.com.ar',
  '49': 'saladas@palmaresltd.com.ar',
  '50': 'urdinarrain@palmaresltd.com.ar',
  '51': 'larroque@palmaresltd.com.ar',
  '52': 'avellaneda@palmaresltd.com.ar',
  '53': 'virasoro@palmaresltd.com.ar',
  '54': 'empedrado@palmaresltd.com.ar',
  '55': 'viale@palmaresltd.com.ar',
  '56': 'ituzaingo@palmaresltd.com.ar',
  '57': 'sanroque@palmaresltd.com.ar',
  '58': 'villaocampo@palmaresltd.com.ar',
  '59': 'ramirez@palmaresltd.com.ar',
  '60': 'sanmartin@palmaresltd.com.ar',
  '61': 'charata@palmaresltd.com.ar',
  '62': 'bovril@palmaresltd.com.ar',
  '63': 'jardinamerica@palmaresltd.com.ar',
  '64': 'sanvicente@palmaresltd.com.ar',
  '65': 'sanignacio@palmaresltd.com.ar',
  '66': 'adelvalle@palmaresltd.com.ar',
  '67': 'tostado@palmaresltd.com.ar',
  '68': 'coronda@palmaresltd.com.ar',
  '69': 'rafaela@palmaresltd.com.ar',
  '70': 'sanjusto@palmaresltd.com.ar',
  '71': 'quitilipi@palmaresltd.com.ar',
  '72': 'sunchales@palmaresltd.com.ar',
  '73': 'macia@palmaresltd.com.ar',
  '74': 'pirane@palmaresltd.com.ar',
  '75': 'galvez@palmaresltd.com.ar',
  '76': 'calchaqui@palmaresltd.com.ar',
  '77': 'ceres@palmaresltd.com.ar' // Nueva sucursal agregada
};

async function poblarEmailsSucursales() {
  let connection;
  try {
    connection = await createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');
    
    // Verificar si la columna mail existe, si no, crearla
    console.log('\n🔍 Verificando estructura de tabla sucursales...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM sucursales LIKE 'mail'
    `);
    
    if (columns.length === 0) {
      console.log('📝 Agregando columna mail a tabla sucursales...');
      await connection.execute(`
        ALTER TABLE sucursales 
        ADD COLUMN mail VARCHAR(100) NULL AFTER provincia
      `);
      console.log('✅ Columna mail agregada');
    } else {
      console.log('✅ Columna mail ya existe');
    }
    
    console.log('\n📧 POBLANDO EMAILS DE SUCURSALES...');
    
    let actualizadas = 0;
    let errores = 0;
    
    for (const [nroSucursal, email] of Object.entries(sucursalesEmails)) {
      try {
        
        const [result] = await connection.execute(`
          UPDATE sucursales 
          SET mail = ? 
          WHERE nro_sucursal = ?
        `, [email, nroSucursal]);
        
        if (result.affectedRows > 0) {
          console.log(`✅ Sucursal ${nroSucursal} - ${email}`);
          actualizadas++;
        } else {
          console.log(`⚠️ Sucursal ${nroSucursal} - No encontrada en BD`);
        }
        
      } catch (error) {
        console.error(`❌ Error con sucursal ${nroSucursal}:`, error.message);
        errores++;
      }
    }
    
    console.log(`\n🎉 PROCESO COMPLETADO:`);
    console.log(`   📈 Sucursales actualizadas: ${actualizadas}`);
    console.log(`   ❌ Errores: ${errores}`);
    
    // Verificar el resultado final
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(mail) as con_email,
        COUNT(*) - COUNT(mail) as sin_email
      FROM sucursales
    `);
    
    console.log(`\n📋 RESUMEN FINAL:`);
    console.log(`   🏢 Total sucursales: ${stats[0].total}`);
    console.log(`   📧 Con email: ${stats[0].con_email}`);
    console.log(`   ⚪ Sin email: ${stats[0].sin_email}`);
    
    // Mostrar algunas muestras
    console.log(`\n📋 MUESTRA DE RESULTADOS:`);
    const [muestra] = await connection.execute(`
      SELECT nro_sucursal, nombre, mail 
      FROM sucursales 
      WHERE mail IS NOT NULL
      ORDER BY CAST(nro_sucursal AS UNSIGNED)
      LIMIT 10
    `);
    
    muestra.forEach(s => {
      console.log(`   ${s.nro_sucursal} - ${s.nombre}: ${s.mail}`);
    });
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

poblarEmailsSucursales();
