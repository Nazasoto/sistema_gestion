import moment from 'moment-timezone';

// Configurar timezone de Argentina
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

// Configurar moment en español
moment.locale('es');

/**
 * Formatea una fecha a la zona horaria de Argentina
 * @param {string|Date} fecha - Fecha a formatear
 * @param {string} formato - Formato de salida (por defecto: 'DD/MM/YYYY HH:mm')
 * @returns {string} Fecha formateada
 */
export const formatearFecha = (fecha, formato = 'DD/MM/YYYY HH:mm') => {
  if (!fecha) return 'N/A';
  
  try {
    // Since dates are now stored as strings in Argentina timezone, 
    // we can parse them directly without timezone conversion
    const fechaMoment = moment(fecha, 'YYYY-MM-DD HH:mm:ss');
    
    // Format in a readable way
    return fechaMoment.format(formato);
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * Obtiene la fecha actual en timezone de Argentina
 * @param {string} formato - Formato de salida
 * @returns {string} Fecha actual formateada
 */
export const fechaActualArgentina = (formato = 'YYYY-MM-DD HH:mm:ss') => {
  return moment().tz(ARGENTINA_TIMEZONE).format(formato);
};

/**
 * Convierte una fecha a formato ISO en timezone de Argentina
 * @param {string|Date} fecha - Fecha a convertir
 * @returns {string} Fecha en formato ISO
 */
export const fechaToISOArgentina = (fecha) => {
  if (!fecha) return null;
  
  try {
    return moment.utc(fecha).tz(ARGENTINA_TIMEZONE).toISOString();
  } catch (error) {
    console.error('Error convirtiendo fecha a ISO:', error, fecha);
    return null;
  }
};

/**
 * Calcula la diferencia entre dos fechas en formato legible
 * @param {string|Date} fechaInicio - Fecha de inicio
 * @param {string|Date} fechaFin - Fecha de fin
 * @returns {string} Diferencia en formato legible
 */
export const calcularTiempoTranscurrido = (fechaInicio, fechaFin) => {
  if (!fechaInicio) return 'N/A';
  
  try {
    const inicio = moment.utc(fechaInicio).tz(ARGENTINA_TIMEZONE);
    const fin = fechaFin ? moment.utc(fechaFin).tz(ARGENTINA_TIMEZONE) : moment().tz(ARGENTINA_TIMEZONE);
    
    const duracion = moment.duration(fin.diff(inicio));
    
    const dias = Math.floor(duracion.asDays());
    const horas = duracion.hours();
    const minutos = duracion.minutes();
    
    if (dias > 0) {
      return `${dias}d ${horas}h ${minutos}m`;
    } else if (horas > 0) {
      return `${horas}h ${minutos}m`;
    } else {
      return `${minutos}m`;
    }
  } catch (error) {
    console.error('Error calculando tiempo transcurrido:', error);
    return 'Error de cálculo';
  }
};

/**
 * Verifica si una fecha es de hoy
 * @param {string|Date} fecha - Fecha a verificar
 * @returns {boolean} True si es de hoy
 */
export const esHoy = (fecha) => {
  if (!fecha) return false;
  
  try {
    const fechaMoment = moment.utc(fecha).tz(ARGENTINA_TIMEZONE);
    const hoy = moment().tz(ARGENTINA_TIMEZONE);
    
    return fechaMoment.isSame(hoy, 'day');
  } catch (error) {
    return false;
  }
};

/**
 * Formatos predefinidos comunes
 */
export const FORMATOS = {
  FECHA_HORA: 'DD/MM/YYYY HH:mm',
  FECHA_HORA_SEGUNDOS: 'DD/MM/YYYY HH:mm:ss',
  SOLO_FECHA: 'DD/MM/YYYY',
  SOLO_HORA: 'HH:mm',
  FECHA_COMPLETA: 'dddd, DD [de] MMMM [de] YYYY',
  ISO_ARGENTINA: 'YYYY-MM-DD HH:mm:ss'
};

export default {
  formatearFecha,
  fechaActualArgentina,
  fechaToISOArgentina,
  calcularTiempoTranscurrido,
  esHoy,
  FORMATOS,
  ARGENTINA_TIMEZONE
};
