import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'nozomi.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '12624'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'amFgayKbDLBEvAKVRjOfPvDAvXWtGfWS',
  database: process.env.DB_NAME || 'railway',
  ssl: { rejectUnauthorized: false }
};

// Tablas que SÍ están siendo utilizadas activamente en el código
const TABLAS_ACTIVAS = [
  'tickets',           // Tabla principal de tickets
  'usuarios',          // Usuarios del sistema
  'sucursales',        // Sucursales/oficinas
  'ticket_history',    // Historial de cambios de tickets
  'ticket_approvals',  // Aprobaciones de supervisores
  'password_resets',   // Recuperación de contraseñas
  'noticias'          // Sistema de notificaciones
];

async function cleanupDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa a la base de datos\n');

    // Obtener todas las tablas existentes
    const [tables] = await connection.query('SHOW TABLES');
    const allTables = tables.map(row => row.Tables_in_railway);
    
    console.log('📋 ANÁLISIS DE TABLAS EN LA BASE DE DATOS');
    console.log('==========================================\n');
    
    console.log('🟢 TABLAS ACTIVAS (en uso por el sistema):');
    const tablasEncontradas = [];
    const tablasNoEncontradas = [];
    
    for (const tabla of TABLAS_ACTIVAS) {
      if (allTables.includes(tabla)) {
        const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tabla}`);
        console.log(`   ✓ ${tabla} - ${count[0].total} registros`);
        tablasEncontradas.push(tabla);
      } else {
        console.log(`   ❌ ${tabla} - NO EXISTE`);
        tablasNoEncontradas.push(tabla);
      }
    }
    
    // Identificar tablas no utilizadas
    const tablasNoUtilizadas = allTables.filter(tabla => !TABLAS_ACTIVAS.includes(tabla));
    
    console.log('\n🔴 TABLAS CANDIDATAS PARA ELIMINACIÓN:');
    if (tablasNoUtilizadas.length === 0) {
      console.log('   ✓ No hay tablas innecesarias');
    } else {
      const tablasParaEliminar = [];
      
      for (const tabla of tablasNoUtilizadas) {
        try {
          const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tabla}`);
          const [info] = await connection.query(`
            SELECT TABLE_COMMENT, CREATE_TIME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          `, [dbConfig.database, tabla]);
          
          console.log(`   ⚠️  ${tabla} - ${count[0].total} registros - Creada: ${info[0]?.CREATE_TIME || 'N/A'}`);
          
          // Determinar si es seguro eliminar
          const esTablaTemporal = tabla.includes('temp') || tabla.includes('test') || tabla.includes('backup');
          const estaVacia = count[0].total === 0;
          
          if (esTablaTemporal || estaVacia) {
            tablasParaEliminar.push({
              nombre: tabla,
              registros: count[0].total,
              razon: esTablaTemporal ? 'Tabla temporal/test' : 'Tabla vacía'
            });
          }
        } catch (error) {
          console.log(`   ❌ Error analizando ${tabla}: ${error.message}`);
        }
      }
      
      // Generar script de limpieza
      if (tablasParaEliminar.length > 0) {
        console.log('\n📝 SCRIPT DE LIMPIEZA GENERADO:');
        console.log('=====================================');
        
        let sqlScript = '-- Script de limpieza de tablas innecesarias\n';
        sqlScript += '-- Generado automáticamente\n';
        sqlScript += `-- Fecha: ${new Date().toISOString()}\n\n`;
        
        sqlScript += '-- IMPORTANTE: Revisar cada tabla antes de eliminar\n';
        sqlScript += '-- Hacer backup antes de ejecutar este script\n\n';
        
        for (const tabla of tablasParaEliminar) {
          sqlScript += `-- Eliminar ${tabla.nombre} (${tabla.razon})\n`;
          sqlScript += `-- Registros: ${tabla.registros}\n`;
          sqlScript += `DROP TABLE IF EXISTS \`${tabla.nombre}\`;\n\n`;
        }
        
        // Guardar script
        const fs = await import('fs');
        fs.writeFileSync('cleanup-tables.sql', sqlScript);
        console.log('💾 Script guardado en: cleanup-tables.sql');
        
        console.log('\n⚠️  TABLAS MARCADAS PARA ELIMINACIÓN:');
        tablasParaEliminar.forEach(tabla => {
          console.log(`   - ${tabla.nombre} (${tabla.razon})`);
        });
      }
    }
    
    // Resumen final
    console.log('\n📊 RESUMEN:');
    console.log('===========');
    console.log(`Total de tablas: ${allTables.length}`);
    console.log(`Tablas activas: ${tablasEncontradas.length}`);
    console.log(`Tablas no utilizadas: ${tablasNoUtilizadas.length}`);
    console.log(`Tablas para eliminar: ${tablasParaEliminar?.length || 0}`);
    
    if (tablasNoEncontradas.length > 0) {
      console.log('\n⚠️  TABLAS FALTANTES (deberían existir):');
      tablasNoEncontradas.forEach(tabla => {
        console.log(`   - ${tabla}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

cleanupDatabase();
