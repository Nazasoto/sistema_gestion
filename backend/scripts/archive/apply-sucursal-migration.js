const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Aplicando migración para agregar columna sucursal...');

db.serialize(() => {
  // Verificar si la columna ya existe
  db.get("SELECT COUNT(*) as count FROM pragma_table_info('tickets') WHERE name = 'sucursal'", (err, row) => {
    if (err) {
      console.error('Error al verificar la columna sucursal:', err);
      process.exit(1);
    }

    if (row.count === 0) {
      console.log('Agregando columna sucursal a la tabla tickets...');
      
      // Agregar la columna sucursal
      db.run(`
        ALTER TABLE tickets 
        ADD COLUMN sucursal VARCHAR(10) 
        DEFAULT NULL 
        COMMENT 'Número de sucursal asociada al ticket'
      `, (err) => {
        if (err) {
          console.error('Error al agregar la columna sucursal:', err);
          process.exit(1);
        }
        
        console.log('¡Columna sucursal agregada exitosamente!');
        
        // Crear un índice para búsquedas por sucursal
        db.run('CREATE INDEX IF NOT EXISTS idx_sucursal ON tickets(sucursal)', (err) => {
          if (err) {
            console.error('Error al crear el índice:', err);
          } else {
            console.log('Índice idx_sucursal creado correctamente');
          }
          db.close();
        });
      });
    } else {
      console.log('La columna sucursal ya existe en la tabla tickets');
      db.close();
    }
  });
});
