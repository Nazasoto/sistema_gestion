import bcrypt from 'bcryptjs';
import JsonDB from '../services/jsonDB.service.js';

const db = new JsonDB('users');

const users = [
  {
    email: 'admin@example.com',
    nombre: 'Administrador',
    role: 'admin',
    password: 'messi123'
  },
  {
    email: 'soporte@example.com',
    nombre: 'Técnico de Soporte',
    role: 'soporte',
    password: 'leomessi10'
  },
  {
    email: 'sucursal@example.com',
    nombre: 'Encargado de Sucursal',
    role: 'sucursal',
    password: 'eldiegooo'
  }
];

async function createUsers() {
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    await db.create('users', {
      ...user,
      password: hashedPassword,
      id: i + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  console.log('Usuarios creados exitosamente!');
}

createUsers().catch(console.error);
