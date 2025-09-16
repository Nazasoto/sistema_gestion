#!/usr/bin/env node

/**
 * Script de Limpieza para Sistema de Gestión Frontend
 * 
 * Este script limpia archivos innecesarios de la carpeta sistema-gestion:
 * - node_modules (se puede regenerar con npm install)
 * - dist (carpeta de build, se regenera con npm run build)
 * - Archivos temporales y cache
 * - Archivos de logs
 * 
 * Uso: node cleanup-frontend.js [--dry-run] [--force]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FrontendCleaner {
    constructor() {
        this.rootDir = __dirname;
        this.dryRun = process.argv.includes('--dry-run');
        this.force = process.argv.includes('--force');
        this.deletedFiles = [];
        this.deletedDirs = [];
        this.totalSize = 0;
    }

    log(message, type = 'info') {
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m',   // Red
            reset: '\x1b[0m'     // Reset
        };
        
        console.log(`${colors[type]}${message}${colors.reset}`);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getDirectorySize(dirPath) {
        let size = 0;
        try {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    size += this.getDirectorySize(filePath);
                } else {
                    size += stats.size;
                }
            }
        } catch (error) {
            // Ignorar errores de acceso
        }
        return size;
    }

    removeDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) return;

        const size = this.getDirectorySize(dirPath);
        
        if (this.dryRun) {
            this.log(`[DRY RUN] Eliminaría directorio: ${dirPath} (${this.formatBytes(size)})`, 'warning');
            return;
        }

        try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            this.deletedDirs.push(dirPath);
            this.totalSize += size;
            this.log(`✓ Eliminado: ${path.basename(dirPath)} (${this.formatBytes(size)})`, 'success');
        } catch (error) {
            this.log(`✗ Error eliminando ${dirPath}: ${error.message}`, 'error');
        }
    }

    removeFile(filePath) {
        if (!fs.existsSync(filePath)) return;

        const stats = fs.statSync(filePath);
        const size = stats.size;

        if (this.dryRun) {
            this.log(`[DRY RUN] Eliminaría archivo: ${filePath} (${this.formatBytes(size)})`, 'warning');
            return;
        }

        try {
            fs.unlinkSync(filePath);
            this.deletedFiles.push(filePath);
            this.totalSize += size;
            this.log(`✓ Eliminado: ${path.basename(filePath)} (${this.formatBytes(size)})`, 'success');
        } catch (error) {
            this.log(`✗ Error eliminando ${filePath}: ${error.message}`, 'error');
        }
    }

    findAndRemovePattern(pattern, description) {
        this.log(`\n🔍 Buscando ${description}...`, 'info');
        
        const searchDir = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        if (pattern.test(item)) {
                            this.removeDirectory(itemPath);
                        } else if (!item.startsWith('.') && item !== 'src' && item !== 'public') {
                            // Buscar recursivamente, pero evitar carpetas importantes
                            searchDir(itemPath);
                        }
                    } else if (stats.isFile() && pattern.test(item)) {
                        this.removeFile(itemPath);
                    }
                }
            } catch (error) {
                // Ignorar errores de acceso
            }
        };

        searchDir(this.rootDir);
    }

    cleanNodeModules() {
        this.log('\n📦 Limpiando node_modules...', 'info');
        const nodeModulesPath = path.join(this.rootDir, 'node_modules');
        this.removeDirectory(nodeModulesPath);
    }

    cleanDistFolder() {
        this.log('\n🏗️ Limpiando carpeta dist...', 'info');
        const distPath = path.join(this.rootDir, 'dist');
        this.removeDirectory(distPath);
    }

    cleanBuildArtifacts() {
        this.log('\n🧹 Limpiando artefactos de build...', 'info');
        
        // Archivos de build comunes
        const buildFiles = [
            'build',
            '.next',
            '.nuxt',
            '.vite',
            'coverage'
        ];

        buildFiles.forEach(file => {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    this.removeDirectory(filePath);
                } else {
                    this.removeFile(filePath);
                }
            }
        });
    }

    cleanTempFiles() {
        this.log('\n🗑️ Limpiando archivos temporales...', 'info');
        
        // Patrones de archivos temporales
        const tempPatterns = [
            /\.tmp$/,
            /\.temp$/,
            /\.log$/,
            /\.cache$/,
            /~$/,
            /\.swp$/,
            /\.swo$/,
            /\.DS_Store$/,
            /Thumbs\.db$/,
            /\.eslintcache$/
        ];

        tempPatterns.forEach(pattern => {
            this.findAndRemovePattern(pattern, 'archivos temporales');
        });
    }

    cleanPackageManagerFiles() {
        this.log('\n📋 Limpiando archivos de package managers...', 'info');
        
        const pmFiles = [
            'yarn.lock',
            'pnpm-lock.yaml',
            '.yarn',
            '.pnpm-store'
        ];

        pmFiles.forEach(file => {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    this.removeDirectory(filePath);
                } else {
                    this.removeFile(filePath);
                }
            }
        });
    }

    showSummary() {
        this.log('\n📊 RESUMEN DE LIMPIEZA', 'info');
        this.log('═'.repeat(50), 'info');
        
        if (this.dryRun) {
            this.log('MODO DRY RUN - No se eliminaron archivos realmente', 'warning');
        }
        
        this.log(`Directorios eliminados: ${this.deletedDirs.length}`, 'success');
        this.log(`Archivos eliminados: ${this.deletedFiles.length}`, 'success');
        this.log(`Espacio liberado: ${this.formatBytes(this.totalSize)}`, 'success');
        
        if (this.deletedDirs.length > 0) {
            this.log('\nDirectorios eliminados:', 'info');
            this.deletedDirs.forEach(dir => {
                this.log(`  - ${path.basename(dir)}`, 'success');
            });
        }
    }

    showHelp() {
        console.log(`
🧹 Script de Limpieza Frontend - Sistema de Gestión

Uso: node cleanup-frontend.js [opciones]

Opciones:
  --dry-run    Simula la limpieza sin eliminar archivos
  --force      Ejecuta sin confirmación
  --help       Muestra esta ayuda

Qué se limpia:
  ✓ node_modules (se regenera con npm install)
  ✓ dist (se regenera con npm run build)  
  ✓ Archivos temporales (.tmp, .log, .cache, etc.)
  ✓ Archivos de sistema (.DS_Store, Thumbs.db)
  ✓ Archivos de editores (.swp, .swo)
  ✓ Cache de ESLint (.eslintcache)
  ✓ Archivos de package managers alternativos (yarn.lock, etc.)

Ejemplos:
  node cleanup-frontend.js --dry-run    # Ver qué se eliminaría
  node cleanup-frontend.js --force      # Limpiar sin confirmación
  node cleanup-frontend.js              # Limpiar con confirmación
        `);
    }

    async confirmAction() {
        if (this.force || this.dryRun) return true;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('\n¿Continuar con la limpieza? (s/N): ', (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'si');
            });
        });
    }

    async run() {
        if (process.argv.includes('--help')) {
            this.showHelp();
            return;
        }

        this.log('🧹 INICIANDO LIMPIEZA DEL FRONTEND', 'info');
        this.log('═'.repeat(50), 'info');
        
        if (this.dryRun) {
            this.log('MODO DRY RUN ACTIVADO - Solo simulación', 'warning');
        }

        // Verificar que estamos en el directorio correcto
        const packageJsonPath = path.join(this.rootDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            this.log('❌ Error: No se encontró package.json. Ejecuta desde la carpeta sistema-gestion', 'error');
            return;
        }

        const shouldContinue = await this.confirmAction();
        if (!shouldContinue) {
            this.log('Limpieza cancelada por el usuario', 'warning');
            return;
        }

        // Ejecutar limpieza
        this.cleanNodeModules();
        this.cleanDistFolder();
        this.cleanBuildArtifacts();
        this.cleanTempFiles();
        this.cleanPackageManagerFiles();

        this.showSummary();

        if (!this.dryRun && this.deletedDirs.some(dir => dir.includes('node_modules'))) {
            this.log('\n💡 Recuerda ejecutar "npm install" para reinstalar dependencias', 'info');
        }
    }
}

// Ejecutar el script
const cleaner = new FrontendCleaner();
cleaner.run().catch(error => {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
});
