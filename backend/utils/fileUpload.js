import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes y PDFs
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen, PDF y documentos de Office'));
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
  fileFilter: fileFilter
});

export const uploadFiles = upload.array('files');

export const handleFileUpload = (req, res, next) => {
  uploadFiles(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Un error de Multer al subir
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // Un error desconocido
      return res.status(500).json({ error: err.message });
    }
    
    // Los archivos se subieron correctamente
    next();
  });
};

export const getFileUrl = (req, filename) => {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};
