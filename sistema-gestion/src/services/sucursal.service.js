import apiService from './api.service.js';

class SucursalService {
  async getAllSucursales() {
    try {
      const response = await apiService.get('/auth/sucursales');
      return response.data;
    } catch (error) {
      console.error('Error fetching sucursales:', error);
      throw error;
    }
  }

  async getSucursalByNumber(nroSucursal) {
    try {
      const sucursales = await this.getAllSucursales();
      return sucursales.find(s => s.nro_sucursal === nroSucursal);
    } catch (error) {
      console.error('Error fetching sucursal by number:', error);
      throw error;
    }
  }

  formatSucursalDisplay(sucursal) {
    if (!sucursal) return 'Sucursal no asignada';
    return `${sucursal.nro_sucursal} - ${sucursal.nombre}`;
  }
}

export default new SucursalService();
