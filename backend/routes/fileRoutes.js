import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.js';
import { uploadFiles, getFile } from '../controllers/fileController.js';
import { handleFileUpload } from '../utils/fileUpload.js';

const router = Router();

// Aplicar el middleware de autenticación a todas las rutas
router.use(verificarToken);

// Ruta para subir archivos
router.post('/upload', handleFileUpload, uploadFiles);

// Ruta para obtener archivos
router.get('/:filename', getFile);

export default router;
