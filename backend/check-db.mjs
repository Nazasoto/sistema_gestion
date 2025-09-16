import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
console.log('Ruta de la base de datos:', dbPath);

try {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error al conectar a la base de datos:', err.message);
            return;
        }
        console.log('Conectado a la base de datos SQLite');
    });

    db.serialize(() => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
            if (err) {
                console.error('Error al listar tablas:', err);
                return;
            }
            console.log('\nTablas en la base de datos:');
            tables.forEach(t => console.log(`- ${t.name}`));
            
            db.all("PRAGMA table_info('tickets')", [], (err, columns) => {
                if (err) {
                    console.error('\nError al obtener la estructura de la tabla tickets:', err.message);
                    return;
                }
                
                console.log('\nColumnas en la tabla tickets:');
                if (columns.length === 0) {
                    console.log('La tabla tickets está vacía o no existe');
                } else {
                    columns.forEach(col => {
                        console.log(`- ${col.name} (${col.type})`);
                    });
                }
                
                db.close();
            });
        });
    });
} catch (error) {
    console.error('Error inesperado:', error);
}
