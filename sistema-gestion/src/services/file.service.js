import axios from 'axios';

export const FileService = {
  async uploadFiles(files) {
    try {
      // Crear FormData para enviar los archivos
      const formData = new FormData();
      
      // Agregar cada archivo al formData
      files.forEach((file, index) => {
        formData.append('files', file);
      });

      // Configurar headers para multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      // Subir archivos al servidor
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/files/upload`,
        formData,
        config
      );

      return response.data;
    } catch (error) {
      console.error('Error subiendo archivos:', error);
      throw error;
    }
  },

  async getFileUrl(filename) {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/files/${filename}`
      );
      return response.data.url;
    } catch (error) {
      console.error('Error obteniendo URL del archivo:', error);
      throw error;
    }
  }
};
