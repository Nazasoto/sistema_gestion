import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

console.log('Conectando a la base de datos...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        return;
    }
    
    console.log('Conexión exitosa a la base de datos');
    
    // Verificar si la columna ya existe
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('tickets') WHERE name = 'sucursal'", (err, row) => {
        if (err) {
            console.error('Error al verificar la columna sucursal:', err);
            db.close();
            return;
        }
        
        if (row.count > 0) {
            console.log('La columna sucursal ya existe en la tabla tickets');
            db.close();
            return;
        }
        
        // Si no existe, agregarla
        console.log('Agregando columna sucursal...');
        
        db.run(`
            ALTER TABLE tickets 
            ADD COLUMN sucursal VARCHAR(10) 
            DEFAULT NULL
        `, (err) => {
            if (err) {
                console.error('Error al agregar la columna sucursal:', err.message);
            } else {
                console.log('✅ Columna sucursal agregada exitosamente');
            }
            db.close();
        });
    });
});
