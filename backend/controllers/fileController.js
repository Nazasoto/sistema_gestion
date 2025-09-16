import { handleFileUpload, getFileUrl } from '../utils/fileUpload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    // Mapear los archivos subidos a sus URLs
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(req, file.filename)
    }));

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Error uploading files', details: error.message });
  }
};

export const getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Enviar el archivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ error: 'Error getting file', details: error.message });
  }
};
