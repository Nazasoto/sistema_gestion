import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';

const createAdmin = async () => {
  try {
    // Determinar si usar MongoDB local o en memoria
    const useMemoryDB = process.env.USE_MEMORY_DB === 'true';
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ticketsApp';

    if (useMemoryDB) {
      console.log('🔗 Conectando a MongoDB en Memoria');
      const mongoServer = await MongoMemoryServer.create({
        instance: {
          port: 27018,
          ip: '127.0.0.1',
          replSet: false
        },
        binary: {
          version: '4.4.19',
          downloadDir: './mongodb-binaries',
          platform: 'win32',
          arch: 'x64'
        }
      });
      const uri = mongoServer.getUri();
      
      if (!uri) {
        throw new Error("No se pudo obtener la URI de MongoMemoryServer");
      }

      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } else {
      console.log('🔗 Conectando a MongoDB local');
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    if (!uri) {
      throw new Error("No se pudo obtener la URI de MongoMemoryServer");
    }

    console.log('🔗 Conectando a Mongo URI:', uri);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existe = await User.findOne({ username: 'admin' });

    if (existe) {
      console.log('⚠️ El usuario admin ya existe');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });

      await admin.save();
      console.log('✅ Usuario admin creado con éxito');
    }

    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creando admin:', err);
    process.exit(1);
  }
};

createAdmin();
