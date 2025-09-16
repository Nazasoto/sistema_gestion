import { query, getConnection, beginTransaction, commit, rollback } from '../config/database.js';

class MySQLService {
  /**
   * Crea una nueva instancia del servicio de base de datos
   * @param {string} tableName - Nombre de la tabla
   * @param {Object} options - Opciones de configuración
   * @param {string} options.idField - Nombre del campo de ID (por defecto: 'id')
   * @param {Object} options.schema - Esquema para validación (opcional)
   * @param {Object} options.relations - Definición de relaciones (opcional)
   */
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.idField = options.idField || 'id';
    this.schema = options.schema || null;
    this.relations = options.relations || {};
  }

  // ========== MÉTODOS BÁSICOS DE CONSULTA ==========

  /**
   * Obtiene todos los registros con opciones de paginación y ordenación
   * @param {Object} [options] - Opciones de consulta
   * @param {number} [options.page=1] - Número de página
   * @param {number} [options.limit=100] - Cantidad de resultados por página
   * @param {string} [options.orderBy] - Campo para ordenar
   * @param {'ASC'|'DESC'} [options.orderDirection='ASC'] - Dirección de ordenación
   * @param {Object} [criteria] - Criterios de búsqueda
   * @returns {Promise<Array>} - Lista de registros
   */
  async getAll({ page = 1, limit = 100, orderBy, orderDirection = 'ASC' } = {}, criteria = {}) {
    const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 100;
    const safePage = Number.isFinite(Number(page)) ? Number(page) : 1;
    const offset = (safePage - 1) * safeLimit;
    const whereClause = this._buildWhereClause(criteria);
    const orderClause = orderBy ? `ORDER BY \`${orderBy}\` ${orderDirection.toUpperCase()}` : '';
    const limitClause = `LIMIT ${safeLimit} OFFSET ${offset}`;
    
    const sql = `
      SELECT * FROM \`${this.tableName}\` 
      ${whereClause.whereClause}
      ${orderClause}
      ${limitClause}
    `;
    
    return await query(sql, [...whereClause.values]);
  }

  /**
   * Obtiene un registro por su ID
   * @param {number|string} id - ID del registro
   * @param {Object} [options] - Opciones adicionales
   * @param {boolean} [options.includePassword=false] - Incluir el campo de contraseña en los resultados
   * @returns {Promise<Object|null>} - El registro encontrado o null
   */
  async getById(id, options = {}) {
    const fields = options.includePassword ? '*' : this._getSelectFields();
    const sql = `SELECT ${fields} FROM \`${this.tableName}\` WHERE \`${this.idField}\` = ?`;
    const [row] = await query(sql, [id]);
    return row || null;
  }

  /**
   * Busca registros que cumplan con los criterios especificados
   * @param {Object} criteria - Criterios de búsqueda
   * @param {Object} [options] - Opciones de consulta
   * @param {number} [options.limit] - Límite de resultados
   * @param {string} [options.orderBy] - Campo para ordenar
   * @param {'ASC'|'DESC'} [options.orderDirection='ASC'] - Dirección de ordenación
   * @param {Array} [options.include] - Relaciones a incluir
   * @returns {Promise<Array>} - Lista de registros que cumplen los criterios
   */
  async find(criteria, options = {}) {
    const { limit, orderBy, orderDirection = 'ASC', include = [] } = options;
    const whereClause = this._buildWhereClause(criteria);
    const orderClause = orderBy ? `ORDER BY \`${orderBy}\` ${orderDirection.toUpperCase()}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const sql = `
      SELECT * FROM \`${this.tableName}\` 
      ${whereClause.whereClause}
      ${orderClause}
      ${limitClause}
    `;
    
    let results = await query(sql, whereClause.values);
    
    // Cargar relaciones si se especificaron
    if (include.length > 0) {
      results = await Promise.all(
        results.map(async item => {
          await this._loadRelations(item, include);
          return item;
        })
      );
    }
    
    return results;
  }

  // ========== MÉTODOS DE ESCRITURA ==========

  /**
   * Crea un nuevo registro
   * @param {Object} data - Datos del registro a crear
   * @param {Object} [options] - Opciones de la operación
   * @param {boolean} [options.validate=true] - Si validar contra el esquema
   * @param {Object} [options.connection] - Conexión existente para transacciones
   * @returns {Promise<Object>} - El registro creado
   */
  async create(data, options = {}) {
    const { validate = true, connection } = options;
    
    // Validar datos contra el esquema si está definido
    if (validate && this.schema) {
      this._validateData(data);
    }
    
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(key => data[key]);
    
    const columns = keys.map(key => `\`${key}\``).join(', ');
    
    const sql = `
      INSERT INTO \`${this.tableName}\` (${columns}) 
      VALUES (${placeholders})
    `;
    
    // Usar la conexión proporcionada o una nueva
    const result = connection ? 
      await query(sql, values, connection) : 
      await query(sql, values);
    
    if (result.insertId) {
      return this.getById(result.insertId, { connection });
    }
    
    return null;
  }

  /**
   * Actualiza un registro existente
   * @param {string|number} id - ID del registro a actualizar
   * @param {Object} data - Datos a actualizar
   * @param {Object} [options] - Opciones de la operación
   * @param {boolean} [options.validate=true] - Si validar contra el esquema
   * @param {Object} [options.connection] - Conexión existente para transacciones
   * @returns {Promise<Object|null>} - El registro actualizado o null si no existe
   */
  async update(id, data, options = {}) {
    const { validate = true, connection } = options;
    
    // Validar datos contra el esquema si está definido
    if (validate && this.schema) {
      this._validateData(data, true);
    }
    
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return this.getById(id, { connection });
    }
    
    const setClause = keys.map(key => `\`${key}\` = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const sql = `
      UPDATE \`${this.tableName}\` 
      SET ${setClause} 
      WHERE \`${this.idField}\` = ?
    `;
    
    // Usar la conexión proporcionada o una nueva
    if (connection) {
      await query(sql, values, connection);
    } else {
      await query(sql, values);
    }
    
    return this.getById(id, { connection });
  }

  /**
   * Elimina un registro por su ID
   * @param {string|number} id - ID del registro a eliminar
   * @param {Object} [options] - Opciones de la operación
   * @param {Object} [options.connection] - Conexión existente para transacciones
   * @returns {Promise<boolean>} - true si se eliminó correctamente, false en caso contrario
   */
  async delete(id, options = {}) {
    const { connection } = options;
    const sql = `DELETE FROM \`${this.tableName}\` WHERE \`${this.idField}\` = ?`;
    
    // Usar la conexión proporcionada o una nueva
    const result = connection ? 
      await query(sql, [id], connection) : 
      await query(sql, [id]);
      
    return result.affectedRows > 0;
  }

  // ========== MÉTODOS DE AYUDA ==========

  /**
   * Cuenta el número de registros que cumplen con los criterios especificados
   * @param {Object} [criteria={}] - Criterios de búsqueda
   * @returns {Promise<number>} - Número de registros
   */
  async count(criteria = {}) {
    const whereClause = this._buildWhereClause(criteria);
    const sql = `SELECT COUNT(*) as count FROM \`${this.tableName}\` ${whereClause.whereClause}`;
    const result = await query(sql, whereClause.values);
    return result[0].count;
  }

  /**
   * Ejecuta una consulta personalizada
   * @param {string} sql - Consulta SQL
   * @param {Array} [params=[]] - Parámetros para la consulta
   * @param {Object} [options] - Opciones adicionales
   * @param {Object} [options.connection] - Conexión existente para transacciones
   * @returns {Promise<Array>} - Resultados de la consulta
   */
  async query(sql, params = [], options = {}) {
    return options.connection ? 
      await query(sql, params, options.connection) : 
      await query(sql, params);
  }

  // ========== MÉTODOS DE TRANSACCIÓN ==========

  /**
   * Inicia una transacción
   * @returns {Promise<Object>} - Objeto de conexión para la transacción
   */
  async beginTransaction() {
    const connection = await getConnection();
    await beginTransaction(connection);
    return connection;
  }

  /**
   * Confirma una transacción
   * @param {Object} connection - Conexión de la transacción
   * @returns {Promise<void>}
   */
  async commitTransaction(connection) {
    if (!connection) throw new Error('Se requiere una conexión para confirmar la transacción');
    await commit(connection);
    connection.release();
  }

  /**
   * Revierte una transacción
   * @param {Object} connection - Conexión de la transacción
   * @returns {Promise<void>}
   */
  async rollbackTransaction(connection) {
    if (!connection) throw new Error('Se requiere una conexión para revertir la transacción');
    await rollback(connection);
    connection.release();
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Obtiene la lista de campos a seleccionar, excluyendo la contraseña por defecto
   * @private
   * @returns {string} Lista de campos para la cláusula SELECT
   */
  _getSelectFields() {
    // Si no hay esquema definido o no hay campos específicos, seleccionar todos
    if (!this.schema) return '*';
    
    // Obtener todos los campos del esquema excepto 'password'
    const fields = Object.keys(this.schema).filter(field => field !== 'password');
    
    // Si no hay campos, seleccionar todos
    if (fields.length === 0) return '*';
    
    // Devolver los campos formateados para la consulta SQL
    return fields.map(field => `\`${field}\``).join(', ');
  }

  /**
   * Construye la cláusula WHERE y los valores para una consulta
   * @private
   */
  _buildWhereClause(criteria) {
    const keys = Object.keys(criteria);
    const conditions = [];
    const values = [];
    
    for (const key of keys) {
      const value = criteria[key];
      
      // Manejo de operadores especiales (ej: { $like: '%texto%' })
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const operators = Object.keys(value);
        let hasOperator = false;
        
        for (const op of operators) {
          switch (op) {
            case '$like':
              conditions.push(`\`${key}\` LIKE ?`);
              values.push(value[op]);
              hasOperator = true;
              break;
            case '$in':
              if (Array.isArray(value[op])) {
                const placeholders = value[op].map(() => '?').join(',');
                conditions.push(`\`${key}\` IN (${placeholders})`);
                values.push(...value[op]);
                hasOperator = true;
              }
              break;
            case '$ne':
              conditions.push(`\`${key}\` != ?`);
              values.push(value[op]);
              hasOperator = true;
              break;
            case '$gt':
              conditions.push(`\`${key}\` > ?`);
              values.push(value[op]);
              hasOperator = true;
              break;
            case '$lt':
              conditions.push(`\`${key}\` < ?`);
              values.push(value[op]);
              hasOperator = true;
              break;
            case '$gte':
              conditions.push(`\`${key}\` >= ?`);
              values.push(value[op]);
              hasOperator = true;
              break;
            case '$lte':
              conditions.push(`\`${key}\` <= ?`);
              values.push(value[op]);
              hasOperator = true;
              break;
          }
        }
        
        // Si no se encontró ningún operador especial, usar igualdad
        if (!hasOperator) {
          conditions.push(`\`${key}\` = ?`);
          values.push(value);
        }
      } 
      // Manejo de arrays (usar IN)
      else if (Array.isArray(value)) {
        if (value.length === 0) {
          // Si el array está vacío, agregar una condición que siempre sea falsa
          conditions.push('1 = 0');
        } else {
          const placeholders = value.map(() => '?').join(',');
          conditions.push(`\`${key}\` IN (${placeholders})`);
          values.push(...value);
        }
      }
      // Manejo de valores nulos
      else if (value === null) {
        conditions.push(`\`${key}\` IS NULL`);
      }
      // Valor simple (igualdad)
      else {
        conditions.push(`\`${key}\` = ?`);
        values.push(value);
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  /**
   * Carga las relaciones especificadas para un registro
   * @private
   */
  async _loadRelations(item, relations) {
    for (const relation of relations) {
      if (typeof relation === 'string') {
        // Relación simple: cargar por nombre
        if (this.relations[relation]) {
          const { model, foreignKey } = this.relations[relation];
          const relatedItem = await model.getById(item[foreignKey]);
          item[relation] = relatedItem;
        }
      } else if (typeof relation === 'object') {
        // Relación con opciones
        const [relationName, options] = Object.entries(relation)[0];
        if (this.relations[relationName]) {
          const { model, foreignKey, localKey = this.idField } = this.relations[relationName];
          
          // Si es una relación de uno a muchos
          if (options.as === 'many') {
            const criteria = { [foreignKey]: item[localKey] };
            const relatedItems = await model.find(criteria, options);
            item[relationName] = relatedItems;
          } 
          // Relación uno a uno
          else {
            const relatedItem = await model.getById(item[foreignKey], options);
            item[relationName] = relatedItem;
          }
        }
      }
    }
  }

  /**
   * Valida los datos contra el esquema definido
   * @private
   */
  _validateData(data, isUpdate = false) {
    if (!this.schema) return;
    
    const errors = [];
    const fields = Object.keys(data);
    
    // Validar campos requeridos solo para creación
    if (!isUpdate) {
      const requiredFields = Object.entries(this.schema)
        .filter(([_, def]) => def.required)
        .map(([field]) => field);
      
      for (const field of requiredFields) {
        if (!fields.includes(field) || data[field] === undefined || data[field] === null) {
          errors.push(`El campo '${field}' es requerido`);
        }
      }
    }
    
    // Validar tipos y restricciones
    for (const [field, value] of Object.entries(data)) {
      const fieldDef = this.schema[field];
      if (!fieldDef) continue; // Ignorar campos que no están en el esquema
      
      // Validar tipo
      if (fieldDef.type && typeof value !== fieldDef.type) {
        // Intentar hacer conversión de tipos si es posible
        try {
          if (fieldDef.type === 'number') {
            data[field] = Number(value);
          } else if (fieldDef.type === 'string') {
            data[field] = String(value);
          } else if (fieldDef.type === 'boolean') {
            data[field] = Boolean(value);
          } else if (fieldDef.type === 'date' && !(value instanceof Date)) {
            data[field] = new Date(value);
          }
          
          // Si después de la conversión sigue siendo del tipo incorrecto, lanzar error
          if (typeof data[field] !== fieldDef.type) {
            throw new Error('Tipo incorrecto');
          }
        } catch (e) {
          errors.push(`El campo '${field}' debe ser de tipo ${fieldDef.type}`);
          continue;
        }
      }
      
      // Validar longitud máxima para strings
      if (fieldDef.maxLength && typeof value === 'string' && value.length > fieldDef.maxLength) {
        errors.push(`El campo '${field}' no puede tener más de ${fieldDef.maxLength} caracteres`);
      }
      
      // Validar valores mínimos/máximos para números
      if (fieldDef.min !== undefined && typeof value === 'number' && value < fieldDef.min) {
        errors.push(`El campo '${field}' no puede ser menor que ${fieldDef.min}`);
      }
      
      if (fieldDef.max !== undefined && typeof value === 'number' && value > fieldDef.max) {
        errors.push(`El campo '${field}' no puede ser mayor que ${fieldDef.max}`);
      }
      
      // Validar valores permitidos
      if (fieldDef.enum && !fieldDef.enum.includes(value)) {
        errors.push(`El campo '${field}' debe ser uno de: ${fieldDef.enum.join(', ')}`);
      }
      
      // Validar con expresión regular
      if (fieldDef.pattern && typeof value === 'string' && !fieldDef.pattern.test(value)) {
        errors.push(`El campo '${field}' no cumple con el formato requerido`);
      }
    }
    
    if (errors.length > 0) {
      const error = new Error('Error de validación');
      error.details = errors;
      error.status = 400;
      throw error;
    }
  }
}

export default MySQLService;
