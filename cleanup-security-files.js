import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista de archivos con credenciales hardcodeadas identificados (30 archivos encontrados)
const ARCHIVOS_INSEGUROS = [
  // Scripts raíz con credenciales
  'backend/apply-migration-direct.js',
  
  // Scripts de migración y setup
  'backend/scripts/apply-database-changes.js',
  'backend/scripts/apply-migration.js',
  'backend/scripts/check-db.js',
  'backend/scripts/check-tickets-structure.js',
  'backend/scripts/check-users-structure.js',
  'backend/scripts/check-users-table.js',
  'backend/scripts/direct-query.js',
  'backend/scripts/run-migration-improvements.js',
  'backend/scripts/run-sql-file.js',
  'backend/scripts/verify-tickets-table.js',
  
  // Scripts archive con credenciales
  'backend/scripts/archive/actualizar-emails-admin.js',
  'backend/scripts/archive/add-sucursal-mysql.js',
  'backend/scripts/archive/add-sucursal-to-usuarios.js',
  'backend/scripts/archive/agregar-sucursales-completas.js',
  'backend/scripts/archive/cleanup-database.js',
  'backend/scripts/archive/crear-usuario-pendiente.js',
  'backend/scripts/archive/crear-usuarios-admin.js',
  'backend/scripts/archive/create-sucursales-table.js',
  'backend/scripts/archive/execute-migration.js',
  'backend/scripts/archive/manual-migration.js',
  'backend/scripts/archive/reorganizar-ids-sucursales.js',
  'backend/scripts/archive/run-migration-direct.js',
  'backend/scripts/archive/sucursales-orden-correcto.js',
  'backend/scripts/archive/update-usuarios-table.js',
  'backend/scripts/archive/verificar-usuarios-login.js',
  'backend/scripts/archive/verificar-usuarios-pendientes.js',
  
  // Scripts utilities con credenciales
  'backend/scripts/utilities/db-diagnostic.js',
  'backend/scripts/utilities/reset-database.js'
];

// Archivos a conservar (producción)
const ARCHIVOS_CONSERVAR = [
  'backend/controllers/passwordResetController.js',
  'backend/repositories/passwordResetRepository.js',
  'backend/repositories/passwordResetRequestRepository.js',
  'backend/routes/passwordReset.routes.js',
  'backend/scripts/init-password-reset-table.js',
  'backend/services/emailService.js'
];

function verificarCredenciales(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tieneCredenciales = 
      content.includes('amFgayKbDLBEvAKVRjOfPvDAvXWtGfWS') ||
      content.includes('nozomi.proxy.rlwy.net') ||
      content.includes('nazarepro') ||
      (content.includes('password:') && content.includes('root'));
    
    return tieneCredenciales;
  } catch (error) {
    return false;
  }
}

function limpiarArchivos(dryRun = true) {
  console.log('🔍 ANÁLISIS DE ARCHIVOS CON CREDENCIALES HARDCODEADAS\n');
  
  let archivosEncontrados = 0;
  let archivosEliminados = 0;
  let espacioLiberado = 0;
  
  ARCHIVOS_INSEGUROS.forEach(relativePath => {
    const fullPath = path.join(__dirname, relativePath);
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const tieneCredenciales = verificarCredenciales(fullPath);
      
      if (tieneCredenciales) {
        archivosEncontrados++;
        espacioLiberado += stats.size;
        
        console.log(`🔴 INSEGURO: ${relativePath} (${(stats.size/1024).toFixed(1)} KB)`);
        
        if (!dryRun) {
          try {
            fs.unlinkSync(fullPath);
            archivosEliminados++;
            console.log(`   ✅ Eliminado`);
          } catch (error) {
            console.log(`   ❌ Error al eliminar: ${error.message}`);
          }
        }
      } else {
        console.log(`🟡 SIN CREDENCIALES: ${relativePath}`);
      }
    } else {
      console.log(`⚪ NO EXISTE: ${relativePath}`);
    }
  });
  
  // Eliminar carpeta test completa si está vacía o solo contiene archivos inseguros
  const testDir = path.join(__dirname, 'backend/test');
  if (fs.existsSync(testDir) && !dryRun) {
    try {
      const files = fs.readdirSync(testDir);
      if (files.length === 0) {
        fs.rmdirSync(testDir);
        console.log(`📁 Carpeta test eliminada (vacía)`);
      }
    } catch (error) {
      console.log(`⚠️  No se pudo eliminar carpeta test: ${error.message}`);
    }
  }
  
  console.log('\n📊 RESUMEN:');
  console.log(`- Archivos con credenciales encontrados: ${archivosEncontrados}`);
  console.log(`- Espacio total: ${(espacioLiberado/1024).toFixed(1)} KB`);
  
  if (dryRun) {
    console.log('\n⚠️  MODO SIMULACIÓN - No se eliminó nada');
    console.log('Para eliminar realmente, ejecuta: node cleanup-security-files.js --delete');
  } else {
    console.log(`- Archivos eliminados: ${archivosEliminados}`);
    console.log('✅ Limpieza de seguridad completada');
  }
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete') || args.includes('--force');

limpiarArchivos(!shouldDelete);
