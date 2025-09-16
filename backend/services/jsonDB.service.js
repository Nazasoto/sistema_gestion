import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JsonDB {
  constructor(filename) {
    this.filePath = path.join(__dirname, '..', 'data', `${filename}.json`);
    this.cache = null;
    this.lastRead = 0;
    this.CACHE_TTL = 1000 * 5; // 5 segundos de caché
  }

  async readFile() {
    const now = Date.now();
    
    // Usar caché si está disponible y no ha expirado
    if (this.cache && now - this.lastRead < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      this.cache = JSON.parse(data);
      this.lastRead = now;
      return this.cache;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Si el archivo no existe, crear una estructura vacía
        const initialData = { [Object.keys(this.cache || {})[0] || 'items']: [] };
        await fs.writeFile(this.filePath, JSON.stringify(initialData, null, 2), 'utf8');
        this.cache = initialData;
        return this.cache;
      }
      throw error;
    }
  }

  async writeFile(data) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    this.cache = data;
    this.lastRead = Date.now();
  }

  async getAll(collectionName) {
    const data = await this.readFile();
    return data[collectionName] || [];
  }

  async getById(collectionName, id) {
    const items = await this.getAll(collectionName);
    return items.find(item => item.id === id);
  }

  async create(collectionName, item) {
    const data = await this.readFile();
    const items = data[collectionName] || [];
    
    // Generar un nuevo ID
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem = { ...item, id: newId };
    
    items.push(newItem);
    data[collectionName] = items;
    
    await this.writeFile(data);
    return newItem;
  }

  async update(collectionName, id, updates) {
    const data = await this.readFile();
    const items = data[collectionName] || [];
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedItem = { ...items[index], ...updates, id };
    items[index] = updatedItem;
    data[collectionName] = items;
    
    await this.writeFile(data);
    return updatedItem;
  }

  async delete(collectionName, id) {
    const data = await this.readFile();
    const items = data[collectionName] || [];
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    items.splice(index, 1);
    data[collectionName] = items;
    
    await this.writeFile(data);
    return true;
  }

  async find(collectionName, filter) {
    const items = await this.getAll(collectionName);
    return items.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }

  async findOne(collectionName, filter) {
    const items = await this.getAll(collectionName);
    return items.find(item => {
      return Object.entries(filter).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }
}

export default JsonDB;
