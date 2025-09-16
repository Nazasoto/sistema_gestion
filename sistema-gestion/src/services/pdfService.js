import { formatearFecha } from '../utils/dateUtils';

/**
 * Servicio para generar informes PDF de tickets
 */
const PDFService = {
  /**
   * Genera los datos del informe para enviar al supervisor
   * @param {Object} ticket - Datos completos del ticket
   * @returns {Object} Datos del informe
   */
  async generateTicketReportData(ticket) {
    if (!ticket) {
      throw new Error('No hay ticket seleccionado para generar los datos del informe');
    }

    try {
      return {
        ticketId: ticket.id,
        titulo: ticket.titulo,
        descripcion: ticket.descripcion,
        estado: ticket.estado,
        prioridad: ticket.prioridad,
        categoria: ticket.categoria,
        fechaCreacion: ticket.fechaCreacion || ticket.fecha_creacion,
        fechaActualizacion: ticket.fechaActualizacion || ticket.fecha_actualizacion,
        creador: ticket.creador?.nombre || ticket.nombre_creador,
        sucursal: ticket.creador?.sucursal || ticket.sucursal_creador || ticket.sucursal,
        asignado: ticket.asignadoA?.nombre || ticket.asignado?.nombre || ticket.nombre_asignado,
        comentarios: ticket.comentarios,
        archivos: ticket.archivos_adjuntos,
        fechaInforme: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error al generar datos del informe:', error);
      throw new Error('Error al generar los datos del informe');
    }
  },

  /**
   * Genera y abre un informe PDF para un ticket
   * @param {Object} ticket - Datos completos del ticket
   */
  async generateTicketReport(ticket) {
    if (!ticket) {
      throw new Error('No hay ticket seleccionado para generar el PDF');
    }

    try {
      const printContent = this.createPrintHTML(ticket);
      
      // Abrir nueva ventana con el contenido
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Enfocar la ventana para que aparezca al frente
      printWindow.focus();
      
      return { success: true, message: `Informe del ticket #${ticket.id} abierto en nueva ventana` };
      
    } catch (error) {
      console.error('Error al generar el informe del ticket:', error);
      throw new Error('Error al generar el informe del ticket');
    }
  },

  /**
   * Crea el HTML para el informe del ticket
   * @param {Object} ticket - Datos del ticket
   * @returns {string} HTML del informe
   */
  createPrintHTML(ticket) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Informe Ticket #${ticket.id}</title>
        <style>
          ${this.getPrintStyles()}
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 INFORME DE TICKET #${ticket.id}</h1>
          <p class="subtitle">Sistema de Gestión de Tickets</p>
        </div>
        
        <div class="section">
          <h2>📝 Información del Ticket</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>🎫 ID del Ticket:</strong> #${ticket.id}
            </div>
            <div class="info-item">
              <strong>📌 Título:</strong> ${ticket.titulo || 'Sin título'}
            </div>
            <div class="info-item">
              <strong>📄 Descripción:</strong> ${ticket.descripcion || 'Sin descripción'}
            </div>
            <div class="info-item">
              <strong>⚠️ Prioridad:</strong> <span class="priority-${ticket.prioridad}">${ticket.prioridad?.toUpperCase() || 'SIN PRIORIDAD'}</span>
            </div>
            <div class="info-item">
              <strong>📂 Categoría:</strong> ${ticket.categoria || 'Sin categoría'}
            </div>
            <div class="info-item">
              <strong>🏢 Sucursal:</strong> ${ticket.sucursal || 'Sin sucursal'}
            </div>
            <div class="info-item">
              <strong>📅 Fecha de Creación:</strong> ${ticket.fechaCreacion ? formatearFecha(ticket.fechaCreacion) : 'Fecha no disponible'}
            </div>
            <div class="info-item">
              <strong>🔄 Última Actualización:</strong> ${ticket.fechaActualizacion ? formatearFecha(ticket.fechaActualizacion) : 'Sin actualizaciones'}
            </div>
            <div class="info-item">
              <strong>📊 Estado Actual:</strong> <span class="status-badge status-${ticket.estado}">${ticket.estado?.toUpperCase() || 'SIN ESTADO'}</span>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="description-box" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
            <strong>👤 Usuario Solicitante</strong><br>
            <strong>Nombre Completo:</strong> ${
              ticket.nombre_creador && ticket.apellido_creador
                ? `${ticket.nombre_creador} ${ticket.apellido_creador}`
                : ticket.usuario?.nombre || 'No proporcionado'
            }<br>
            <strong>Correo Electrónico:</strong> ${ticket.email_creador || ticket.usuario?.email || 'No proporcionado'}<br>
            <strong>Sucursal:</strong> ${
              ticket.numero_sucursal_creador && ticket.nombre_sucursal_creador
                ? `Sucursal ${ticket.numero_sucursal_creador} - ${ticket.nombre_sucursal_creador}`
                : ticket.usuario?.sucursal ? `Sucursal ${ticket.usuario.sucursal}` : ticket.sucursal || 'No especificada'
            }${(ticket.localidad_sucursal_creador && ticket.provincia_sucursal_creador) ? 
              `<br><strong>Ubicación:</strong> ${ticket.localidad_sucursal_creador}, ${ticket.provincia_sucursal_creador}` : ''
            }
          </div>
        </div>
      
        ${(ticket.usuario_asignado_id || ticket.asignadoA || ticket.nombre_asignado) ? `
        <div class="section">
          <div class="description-box" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
            <strong>👤 Usuario asignado</strong><br>
            <strong>Técnico:</strong> ${ticket.nombre_asignado || 'No especificado'}${ticket.apellido_asignado ? ` ${ticket.apellido_asignado}` : ''}<br>
            ${ticket.email_asignado ? `<strong>Email:</strong> ${ticket.email_asignado}` : ''}
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="description-box">
            <strong>📄 Observaciones</strong><br>
            ${ticket.descripcion || 'No se proporcionó descripción del problema'}
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Informe generado:</strong> ${formatearFecha(new Date().toISOString())}</p>
          <p><strong>PALMARES / COLLINS S.A.</strong> | Departamento de Soporte Técnico</p>
          <p style="font-size: 10px; margin-top: 8px; opacity: 0.7;">Este documento contiene información confidencial de la empresa</p>
        </div>
        
        <div class="button-container no-print">
          <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
          <button class="print-button secondary" onclick="window.close()">❌ Cerrar Ventana</button>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Retorna los estilos CSS para el informe
   * @returns {string} CSS styles
   */
  getPrintStyles() {
    return `
      @media print {
        .header { page-break-after: avoid; }
        .section { page-break-inside: avoid; margin-bottom: 8px; }
        .info-grid { gap: 10px; }
        .timeline-container { max-height: 200px; overflow: hidden; }
        .no-print { display: none !important; }
      }
      
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        line-height: 1.3; 
        color: #2c3e50; 
        margin: 0; 
        padding: 8px; 
        background: #ffffff;
        font-size: 11px;
      }
      
      .header { 
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white;
        text-align: center; 
        margin: -8px -8px 12px -8px; 
        padding: 15px 12px; 
        box-shadow: 0 1px 5px rgba(0,0,0,0.1);
      }
      .header h1 { 
        margin: 0; 
        font-size: 18px; 
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .header h2 { 
        margin: 4px 0 0 0; 
        font-size: 13px; 
        opacity: 0.9;
        font-weight: 400;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .section { 
        margin-bottom: 10px; 
        background: #ffffff;
        border: 1px solid #e8ecef;
        border-radius: 4px;
        overflow: hidden;
      }
      .section h3 { 
        background: #f8f9fa;
        color: #495057; 
        margin: 0;
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        border-bottom: 1px solid #e8ecef;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      
      .description-box { 
        background-color: #f8f9fa; 
        padding: 10px; 
        margin: 0;
        border-top: 1px solid #e8ecef;
        font-size: 10px;
        line-height: 1.3;
        max-height: 60px;
        overflow: hidden;
      }
      
      .status-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .status-nuevo { background: #e3f2fd; color: #1565c0; }
      .status-en_progreso { background: #fff3e0; color: #ef6c00; }
      .status-resuelto { background: #e8f5e8; color: #2e7d32; }
      .status-cerrado { background: #f3e5f5; color: #7b1fa2; }
      .status-cancelado { background: #ffebee; color: #c62828; }
      
      .priority-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .priority-urgente { background: #ffebee; color: #c62828; }
      .priority-alta { background: #fff3e0; color: #ef6c00; }
      .priority-media { background: #e3f2fd; color: #1565c0; }
      .priority-baja { background: #e8f5e8; color: #2e7d32; }
      
      .footer { 
        margin-top: 15px; 
        text-align: center; 
        color: #6c757d; 
        font-size: 9px; 
        border-top: 1px solid #e8ecef; 
        padding-top: 8px; 
        background: #f8f9fa;
        margin-left: -8px;
        margin-right: -8px;
        padding-left: 8px;
        padding-right: 8px;
      }
      
      .print-button { 
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white; 
        padding: 12px 24px; 
        border: none; 
        border-radius: 6px; 
        cursor: pointer; 
        margin: 15px 10px; 
        display: inline-block;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .print-button:hover { 
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      .print-button.secondary {
        background: #6c757d;
      }
      .print-button.secondary:hover {
        background: #5a6268;
      }
      
      .button-container {
        text-align: center;
        margin: 20px 0;
      }
    `;
  }
};

export default PDFService;
