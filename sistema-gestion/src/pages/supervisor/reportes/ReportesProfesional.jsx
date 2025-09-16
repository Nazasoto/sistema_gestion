import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import echarts from '../../../utils/echartsConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faUsers, 
  faTicketAlt, 
  faClock, 
  faCheckCircle, 
  faExclamationTriangle,
  faCalendarAlt,
  faFilter,
  faDownload,
  faArrowUp,
  faArrowDown,
  faMinus,
  faSync,
  faInfoCircle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import ticketService from '../../../services/ticket.service';
import PDFService from '../../../services/pdfService';
import userService from '../../../services/userService';
import * as XLSX from 'xlsx-js-style';
import './ReportesProfesional.css';

const ReportesProfesional = () => {
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    periodo: '7', // días
    usuario: '',
    estado: ''
  });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const [ticketsResponse, usuariosData] = await Promise.all([
        fetch('/api/tickets/todos', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        userService.getAllUsers()
      ]);
      
      if (!ticketsResponse.ok) {
        throw new Error(`Error HTTP: ${ticketsResponse.status}`);
      }

      const ticketsData = await ticketsResponse.json();
      
      // Procesar datos de tickets
      let ticketsArray = [];
      if (Array.isArray(ticketsData)) {
        ticketsArray = ticketsData;
      } else if (ticketsData && ticketsData.data && Array.isArray(ticketsData.data)) {
        ticketsArray = ticketsData.data;
      } else if (ticketsData && typeof ticketsData === 'object') {
        // Si es un objeto, intentar extraer los tickets
        const keys = Object.keys(ticketsData);
        
        // Buscar una clave que contenga los tickets
        for (const key of keys) {
          if (Array.isArray(ticketsData[key])) {
            ticketsArray = ticketsData[key];
            break;
          }
        }
      }
      
      if (ticketsArray.length > 0) {
        // console.log('📝 Campos de fecha disponibles:', {
        //   fecha_creacion: ticketsArray[0].fecha_creacion,
        //   fechaCreacion: ticketsArray[0].fechaCreacion,
        //   fecha_cierre: ticketsArray[0].fecha_cierre,
        //   fechaCierre: ticketsArray[0].fechaCierre,
        //   fecha_resuelto: ticketsArray[0].fecha_resuelto,
        //   fechaResuelto: ticketsArray[0].fechaResuelto,
        //   fecha_actualizacion: ticketsArray[0].fecha_actualizacion,
        //   fechaActualizacion: ticketsArray[0].fechaActualizacion,
        //   fecha_reasignacion: ticketsArray[0].fecha_reasignacion,
        //   fechaReasignacion: ticketsArray[0].fechaReasignacion,
        //   usuario_asignado_id: ticketsArray[0].usuario_asignado_id,
        //   usuarioAsignadoId: ticketsArray[0].usuarioAsignadoId,
        //   nombre_reasignado: ticketsArray[0].nombre_reasignado,
        //   apellido_reasignado: ticketsArray[0].apellido_reasignado,
        //   updated_at: ticketsArray[0].updated_at,
        //   created_at: ticketsArray[0].created_at
        // });
        
        // Mostrar todos los tickets resueltos
        const ticketsResueltos = ticketsArray.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado');
      }
      
      setTickets(ticketsArray);
      setUsuarios(usuariosData || []);
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error(' Error al cargar datos:', error);
      setError(`Error al cargar los datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        cargarDatos();
      }, 5 * 60 * 1000); // 5 minutos
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, cargarDatos]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const actualizarManual = () => {
    cargarDatos();
  };

  const formatearUltimaActualizacion = () => {
    const ahora = new Date();
    const diff = Math.floor((ahora - ultimaActualizacion) / 1000); // segundos
    
    if (diff < 60) return `hace ${diff} segundos`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return `hace ${Math.floor(diff / 3600)} horas`;
  };

  // Función para formatear tiempo en horas y minutos
  const formatearTiempo = (horas) => {
    if (horas <= 0) return '-';
    
    const horasEnteras = Math.floor(horas);
    const minutos = Math.round((horas - horasEnteras) * 60);
    
    if (horasEnteras === 0) {
      return `${minutos}m`;
    } else if (minutos === 0) {
      return `${horasEnteras}h`;
    } else {
      return `${horasEnteras}h ${minutos}m`;
    }
  };

  // Función para calcular períodos con precisión absoluta
  const calcularPeriodoExacto = (tipoPeriodo) => {
    // Usar zona horaria de Argentina consistentemente
    const ahora = new Date();
    const argentinaOffset = -3 * 60; // Argentina UTC-3
    const ahoraArgentina = new Date(ahora.getTime() + (ahora.getTimezoneOffset() + argentinaOffset) * 60000);
    
    let inicioActual, finActual, inicioAnterior, finAnterior;
    
    switch (tipoPeriodo) {
      case 'mes_actual':
        // Mes actual: 1 Enero 00:00:00 - 31 Enero 23:59:59
        inicioActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth(), 1, 0, 0, 0, 0);
        finActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Mes anterior para comparación
        inicioAnterior = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth() - 1, 1, 0, 0, 0, 0);
        finAnterior = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth(), 0, 23, 59, 59, 999);
        break;
        
      case 'mes_anterior':
        // Mes anterior completo
        inicioActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth() - 1, 1, 0, 0, 0, 0);
        finActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth(), 0, 23, 59, 59, 999);
        
        // Mes anterior al anterior para comparación
        inicioAnterior = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth() - 2, 1, 0, 0, 0, 0);
        finAnterior = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth() - 1, 0, 23, 59, 59, 999);
        break;
        
      case 'año_actual':
        // Año actual: 1 Enero 00:00:00 - 31 Diciembre 23:59:59
        inicioActual = new Date(ahoraArgentina.getFullYear(), 0, 1, 0, 0, 0, 0);
        finActual = new Date(ahoraArgentina.getFullYear(), 11, 31, 23, 59, 59, 999);
        
        // Año anterior para comparación
        inicioAnterior = new Date(ahoraArgentina.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        finAnterior = new Date(ahoraArgentina.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
        
      case 'personalizado':
        // Por ahora usar últimos 30 días como fallback
        // TODO: Implementar selector de fechas personalizado
        const diasFallback = 30;
        
        finActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth(), ahoraArgentina.getDate(), 23, 59, 59, 999);
        inicioActual = new Date(finActual);
        inicioActual.setDate(inicioActual.getDate() - (diasFallback - 1));
        inicioActual.setHours(0, 0, 0, 0);
        
        finAnterior = new Date(inicioActual);
        finAnterior.setMilliseconds(finAnterior.getMilliseconds() - 1);
        
        inicioAnterior = new Date(finAnterior);
        inicioAnterior.setDate(inicioAnterior.getDate() - (diasFallback - 1));
        inicioAnterior.setHours(0, 0, 0, 0);
        break;
        
      default:
        // Períodos deslizantes (7, 15, 30, 90 días) - mejorados
        const diasPeriodo = parseInt(tipoPeriodo);
        
        // Validar que diasPeriodo sea un número válido
        if (isNaN(diasPeriodo) || diasPeriodo <= 0) {
          console.warn(`Período inválido: ${tipoPeriodo}, usando 7 días por defecto`);
          const diasDefault = 7;
          
          finActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth(), ahoraArgentina.getDate(), 23, 59, 59, 999);
          inicioActual = new Date(finActual);
          inicioActual.setDate(inicioActual.getDate() - (diasDefault - 1));
          inicioActual.setHours(0, 0, 0, 0);
          
          finAnterior = new Date(inicioActual);
          finAnterior.setMilliseconds(finAnterior.getMilliseconds() - 1);
          
          inicioAnterior = new Date(finAnterior);
          inicioAnterior.setDate(inicioAnterior.getDate() - (diasDefault - 1));
          inicioAnterior.setHours(0, 0, 0, 0);
        } else {
          // Fin: hasta el final del día actual
          finActual = new Date(ahoraArgentina.getFullYear(), ahoraArgentina.getMonth(), ahoraArgentina.getDate(), 23, 59, 59, 999);
          
          // Inicio: desde el comienzo del día hace N días
          inicioActual = new Date(finActual);
          inicioActual.setDate(inicioActual.getDate() - (diasPeriodo - 1));
          inicioActual.setHours(0, 0, 0, 0);
          
          // Período anterior para comparación
          finAnterior = new Date(inicioActual);
          finAnterior.setMilliseconds(finAnterior.getMilliseconds() - 1);
          
          inicioAnterior = new Date(finAnterior);
          inicioAnterior.setDate(inicioAnterior.getDate() - (diasPeriodo - 1));
          inicioAnterior.setHours(0, 0, 0, 0);
        }
        break;
    }
    
    return {
      inicioActual,
      finActual,
      inicioAnterior,
      finAnterior,
      debug: {
        tipo: tipoPeriodo,
        ahoraArgentina: ahoraArgentina.toISOString(),
        inicioActual: inicioActual.toISOString(),
        finActual: finActual.toISOString()
      }
    };
  };

  // Calcular métricas principales con tendencias reales
  const calcularMetricas = () => {
    if (!tickets || tickets.length === 0) {
      return {
        total: 0,
        nuevos: 0,
        enProgreso: 0,
        resueltos: 0,
        cancelados: 0,
        tiempoPromedio: 0,
        ticketsFiltrados: [],
        tendencias: { total: 0, resueltos: 0, tiempo: 0 }
      };
    }

    const periodo = calcularPeriodoExacto(filtros.periodo);
    
    // Filtrar tickets del período actual con precisión exacta
    const ticketsPeriodoActual = tickets.filter(ticket => {
      const fechaCreacion = new Date(ticket.fecha_creacion || ticket.fechaCreacion);
      const enPeriodoActual = fechaCreacion >= periodo.inicioActual && fechaCreacion <= periodo.finActual;
      const porUsuario = !filtros.usuario || ticket.usuario_asignado_id === parseInt(filtros.usuario);
      const porEstado = !filtros.estado || ticket.estado === filtros.estado;
      
      return enPeriodoActual && porUsuario && porEstado;
    });

    // Filtrar tickets del período anterior para comparar tendencias
    const ticketsPeriodoAnterior = tickets.filter(ticket => {
      const fechaCreacion = new Date(ticket.fechaCreacion || ticket.fecha_creacion);
      const enPeriodoAnterior = fechaCreacion >= periodo.inicioAnterior && fechaCreacion <= periodo.finAnterior;
      const porUsuario = !filtros.usuario || ticket.usuario_asignado_id === parseInt(filtros.usuario);
      const porEstado = !filtros.estado || ticket.estado === filtros.estado;
      
      return enPeriodoAnterior && porUsuario && porEstado;
    });

    // Métricas período actual
    const total = ticketsPeriodoActual.length;
    const nuevos = ticketsPeriodoActual.filter(t => t.estado === 'nuevo').length;
    const pendientes = ticketsPeriodoActual.filter(t => t.estado === 'pendiente').length;
    const enProgreso = ticketsPeriodoActual.filter(t => t.estado === 'en_progreso').length;
    const resueltos = ticketsPeriodoActual.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado').length;
    const cancelados = ticketsPeriodoActual.filter(t => t.estado === 'cancelado').length;

    // Métricas período anterior
    const totalAnterior = ticketsPeriodoAnterior.length;
    const resueltosAnterior = ticketsPeriodoAnterior.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado').length;

    // Calcular tiempo promedio de resolución período actual
    // Usar fechaActualizacion como fecha de resolución
    const ticketsResueltosActual = tickets.filter(t => {
      const fechaActualizacion = new Date(t.fechaActualizacion);
      
      const resueltoenPeriodoActual = fechaActualizacion >= periodo.inicioActual && fechaActualizacion <= periodo.finActual;
      const tieneEstadoResuelto = (t.estado === 'resuelto' || t.estado === 'cerrado');
      const tieneFechas = t.fechaCreacion && t.fechaActualizacion;
      const porUsuario = !filtros.usuario || t.usuario_asignado_id === parseInt(filtros.usuario);
      
      return resueltoenPeriodoActual && tieneEstadoResuelto && tieneFechas && porUsuario;
    });
    
    let tiempoPromedio = 0;
    if (ticketsResueltosActual.length > 0) {
      // console.log('- Tickets resueltos para cálculo:', ticketsResueltosActual.map(t => ({
      //   id: t.id,
      //   estado: t.estado,
      //   fechaCreacion: t.fechaCreacion,
      //   fechaActualizacion: t.fechaActualizacion,
      //   usuario_asignado_id: t.usuario_asignado_id
      // })));
      
      const tiempos = ticketsResueltosActual.map(t => {
        const inicio = new Date(t.fechaCreacion);
        const fin = new Date(t.fechaActualizacion);
        const horas = (fin - inicio) / (1000 * 60 * 60);
        return horas;
      });
      tiempoPromedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    } else {
      // console.log('- No hay tickets resueltos para calcular tiempo promedio');
    }

    // Calcular tiempo promedio período anterior
    const ticketsResueltosAnterior = tickets.filter(t => {
      const fechaActualizacion = new Date(t.fechaActualizacion);
      const resueltoenPeriodoAnterior = fechaActualizacion >= periodo.inicioAnterior && fechaActualizacion <= periodo.finAnterior;
      const tieneEstadoResuelto = (t.estado === 'resuelto' || t.estado === 'cerrado');
      const tieneFechas = t.fechaCreacion && t.fechaActualizacion;
      const porUsuario = !filtros.usuario || t.usuario_asignado_id === parseInt(filtros.usuario);
      
      return resueltoenPeriodoAnterior && tieneEstadoResuelto && tieneFechas && porUsuario;
    });
    
    let tiempoPromedioAnterior = 0;
    if (ticketsResueltosAnterior.length > 0) {
      const tiemposAnterior = ticketsResueltosAnterior.map(t => {
        const inicio = new Date(t.fechaCreacion);
        const fin = new Date(t.fechaActualizacion);
        return (fin - inicio) / (1000 * 60 * 60); // horas
      });
      tiempoPromedioAnterior = tiemposAnterior.reduce((a, b) => a + b, 0) / tiemposAnterior.length;
    }

    // Calcular tendencias (porcentaje de cambio)
    const calcularTendencia = (actual, anterior) => {
      if (anterior === 0) return actual > 0 ? 100 : 0;
      return Math.round(((actual - anterior) / anterior) * 100);
    };

    const tendenciaTotal = calcularTendencia(total, totalAnterior);
    const tendenciaResueltos = calcularTendencia(resueltos, resueltosAnterior);
    const tendenciaTiempo = calcularTendencia(Math.round(tiempoPromedio * 100), Math.round(tiempoPromedioAnterior * 100));

    return {
      total,
      nuevos,
      pendientes,
      enProgreso,
      resueltos,
      cancelados,
      tiempoPromedio: parseFloat(tiempoPromedio.toFixed(3)),
      ticketsFiltrados: ticketsPeriodoActual,
      tendencias: {
        total: tendenciaTotal,
        resueltos: tendenciaResueltos,
        tiempo: tendenciaTiempo
      }
    };
  };

  const metricas = calcularMetricas();
  
  
  // Datos para gráficos
  const datosGraficoEstados = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['Nuevos', 'Pendientes', 'En Progreso', 'Resueltos', 'Cancelados']
    },
    series: [
      {
        name: 'Estados',
        type: 'pie',
        radius: '50%',
        data: [
          { value: metricas.nuevos, name: 'Nuevos', itemStyle: { color: '#ff6b6b' } },
          { value: metricas.pendientes, name: 'Pendientes', itemStyle: { color: '#ffa726' } },
          { value: metricas.enProgreso, name: 'En Progreso', itemStyle: { color: '#4ecdc4' } },
          { value: metricas.resueltos, name: 'Resueltos', itemStyle: { color: '#45b7d1' } },
          { value: metricas.cancelados, name: 'Cancelados', itemStyle: { color: '#96ceb4' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  // Gráfico de tendencia por días
  const obtenerDatosTendencia = () => {
    const dias = [];
    const creados = [];
    const resueltos = [];
    
    for (let i = parseInt(filtros.periodo) - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      dias.push(fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
      
      // Filtrar tickets creados en el día aplicando filtros de usuario y estado
      const creadosEnDia = tickets.filter(t => {
        const fechaCreacion = new Date(t.fechaCreacion || t.fecha_creacion);
        const fechaCreacionStr = fechaCreacion.toISOString().split('T')[0];
        const porUsuario = !filtros.usuario || t.usuario_asignado_id === parseInt(filtros.usuario);
        const porEstado = !filtros.estado || t.estado === filtros.estado;
        
        return fechaCreacionStr === fechaStr && porUsuario && porEstado;
      }).length;
      
      // Filtrar tickets resueltos en el día aplicando filtros de usuario
      const resueltosEnDia = tickets.filter(t => {
        const fechaActualizacion = new Date(t.fechaActualizacion);
        const fechaActualizacionStr = fechaActualizacion.toISOString().split('T')[0];
        const esResuelto = (t.estado === 'resuelto' || t.estado === 'cerrado');
        const porUsuario = !filtros.usuario || t.usuario_asignado_id === parseInt(filtros.usuario);
        
        return fechaActualizacionStr === fechaStr && esResuelto && porUsuario;
      }).length;
      
      creados.push(creadosEnDia);
      resueltos.push(resueltosEnDia);
    }

    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['Creados', 'Resueltos']
      },
      xAxis: {
        type: 'category',
        data: dias
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'Creados',
          type: 'line',
          data: creados,
          smooth: true,
          itemStyle: { color: '#ff6b6b' }
        },
        {
          name: 'Resueltos',
          type: 'line',
          data: resueltos,
          smooth: true,
          itemStyle: { color: '#45b7d1' }
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="reportes-loading">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
        <p className="mt-3">Cargando reportes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reportes-error">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        <p>{error}</p>
        <button onClick={cargarDatos} className="btn-retry">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="reportes-profesional">
      <div className="reportes-header">
        {/* Panel de control de actualización */}
        <div className="refresh-controls" style={{
          display: 'flex', 
          gap: '15px', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={toggleAutoRefresh}
            />
            Auto-actualizar cada 5 min
          </label>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            color: '#6c757d',
            fontSize: '14px'
          }}>
            <FontAwesomeIcon icon={faInfoCircle} />
            Última actualización: {formatearUltimaActualizacion()}
          </div>
          
          {autoRefresh && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#28a745',
              fontSize: '12px'
            }}>
              <span className="pulse-dot" style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#28a745',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></span>
              Actualizando automáticamente
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="filtros-modernos">
          <div className="filtro-grupo">
            <label>
              <FontAwesomeIcon icon={faCalendarAlt} />
              Período
            </label>
            <select 
              value={filtros.periodo} 
              onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
            >
              <option value="7">Últimos 7 días</option>
              <option value="15">Últimos 15 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 3 meses</option>
              <option value="mes_actual">Mes actual</option>
              <option value="mes_anterior">Mes anterior</option>
              <option value="año_actual">Año actual</option>
            </select>
          </div>

          <div className="filtro-grupo">
            <label>
              <FontAwesomeIcon icon={faUsers} />
              Usuario
            </label>
            <select 
              value={filtros.usuario} 
              onChange={(e) => setFiltros({...filtros, usuario: e.target.value})}
            >
              <option value="">Todos los usuarios</option>
              {usuarios.filter(u => u.role === 'soporte' || u.role === 'tecnico').map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Métricas principales */}
      <div className="metricas-grid">
        <div className="metrica-card total">
          <div className="metrica-icon">
            <FontAwesomeIcon icon={faTicketAlt} />
          </div>
          <div className="metrica-content">
            <h3>Total de Tickets</h3>
            <div className="metrica-numero">{metricas.total}</div>
            <div className={`metrica-tendencia ${metricas.tendencias.total > 0 ? 'positiva' : metricas.tendencias.total < 0 ? 'negativa' : 'neutral'}`}>
              <FontAwesomeIcon icon={metricas.tendencias.total > 0 ? faArrowUp : metricas.tendencias.total < 0 ? faArrowDown : faMinus} />
              {metricas.tendencias.total > 0 ? '+' : ''}{metricas.tendencias.total}% vs período anterior
            </div>
          </div>
        </div>

        <div className="metrica-card nuevos">
          <div className="metrica-icon">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="metrica-content">
            <h3>Tickets Nuevos</h3>
            <div className="metrica-numero">{metricas.nuevos}</div>
            <div className="metrica-tendencia neutral">
              <FontAwesomeIcon icon={faMinus} />
              {metricas.nuevos} tickets nuevos
            </div>
          </div>
        </div>

        <div className="metrica-card pendientes">
          <div className="metrica-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="metrica-content">
            <h3>Tickets Pendientes</h3>
            <div className="metrica-numero">{metricas.pendientes}</div>
            <div className="metrica-tendencia neutral">
              <FontAwesomeIcon icon={faMinus} />
              {metricas.pendientes} tickets pendientes
            </div>
          </div>
        </div>

        <div className="metrica-card resueltos">
          <div className="metrica-icon">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="metrica-content">
            <h3>Tickets Resueltos</h3>
            <div className="metrica-numero">{metricas.resueltos}</div>
            <div className={`metrica-tendencia ${metricas.tendencias.resueltos > 0 ? 'positiva' : metricas.tendencias.resueltos < 0 ? 'negativa' : 'neutral'}`}>
              <FontAwesomeIcon icon={metricas.tendencias.resueltos > 0 ? faArrowUp : metricas.tendencias.resueltos < 0 ? faArrowDown : faMinus} />
              {metricas.tendencias.resueltos > 0 ? '+' : ''}{metricas.tendencias.resueltos}% vs período anterior
            </div>
          </div>
        </div>

        <div className="metrica-card cancelados">
          <div className="metrica-icon">
            <FontAwesomeIcon icon={faMinus} />
          </div>
          <div className="metrica-content">
            <h3>Tickets Cancelados</h3>
            <div className="metrica-numero">{metricas.cancelados}</div>
            <div className="metrica-tendencia neutral">
              <FontAwesomeIcon icon={faMinus} />
              {metricas.cancelados} tickets cancelados
            </div>
          </div>
        </div>

        <div className="metrica-card tiempo">
          <div className="metrica-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="metrica-content">
            <h3>Tiempo Promedio</h3>
            <div className="metrica-numero">{formatearTiempo(metricas.tiempoPromedio)}</div>
            <div className={`metrica-tendencia ${metricas.tendencias.tiempo > 0 ? 'positiva' : metricas.tendencias.tiempo < 0 ? 'negativa' : 'neutral'}`}>
              <FontAwesomeIcon icon={metricas.tendencias.tiempo > 0 ? faArrowUp : metricas.tendencias.tiempo < 0 ? faArrowDown : faMinus} />
              {metricas.tendencias.tiempo > 0 ? '+' : ''}{metricas.tendencias.tiempo}% vs período anterior
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="graficos-grid">
        <div className="grafico-card">
          <div className="card-header">
            <h3>Distribución por Estados</h3>
          </div>
          <div className="card-content">
            <ReactECharts 
              option={datosGraficoEstados} 
              style={{ height: '300px' }} 
              echarts={echarts}
            />
          </div>
        </div>

        <div className="grafico-card">
          <div className="card-header">
            <h3>Tendencia de Tickets</h3>
          </div>
          <div className="card-content">
            <ReactECharts 
              option={obtenerDatosTendencia()} 
              style={{ height: '300px' }} 
              echarts={echarts}
            />
          </div>
        </div>
      </div>

      {/* Tabla de resumen por usuario */}
      <div className="tabla-resumen">
        <div className="card-header">
          <h3>Resumen por Usuario</h3>
        </div>
        <div className="tabla-container">
          <table className="tabla-moderna">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Total</th>
                <th>Pendientes</th>
                <th>Cancelados</th>
                <th>En Progreso</th>
                <th>Resueltos</th>
                <th>Tiempo Promedio</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.filter(u => u.role === 'soporte' || u.role === 'tecnico').map(usuario => {
                const ticketsUsuario = metricas.ticketsFiltrados.filter(t => t.usuario_asignado_id === usuario.id);
                const total = ticketsUsuario.length;
                const resueltos = ticketsUsuario.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado').length;
                
                // Calcular tiempo promedio para este usuario
                const ticketsResueltosUsuario = ticketsUsuario.filter(t => {
                  const tieneEstadoResuelto = (t.estado === 'resuelto' || t.estado === 'cerrado');
                  const tieneFechas = t.fechaCreacion && t.fechaActualizacion;
                  return tieneEstadoResuelto && tieneFechas;
                });
                
                let tiempoPromedioUsuario = 0;
                if (ticketsResueltosUsuario.length > 0) {
                  const tiempos = ticketsResueltosUsuario.map(t => {
                    const inicio = new Date(t.fechaCreacion);
                    const fin = new Date(t.fechaActualizacion);
                    const horas = (fin - inicio) / (1000 * 60 * 60);
                    return horas;
                  });
                  tiempoPromedioUsuario = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
                }
                
                return (
                  <tr key={usuario.id}>
                    <td className="usuario-cell">
                      <div className="usuario-avatar">{usuario.nombre.charAt(0)}</div>
                      <span>{usuario.nombre}</span>
                    </td>
                    <td><span className="badge badge-total">{total}</span></td>
                    <td><span className="badge badge-pendientes">{ticketsUsuario.filter(t => t.estado === 'pendiente').length}</span></td>
                    <td><span className="badge badge-cancelados">{ticketsUsuario.filter(t => t.estado === 'cancelado').length}</span></td>
                    <td><span className="badge badge-progreso">{ticketsUsuario.filter(t => t.estado === 'en_progreso').length}</span></td>
                    <td><span className="badge badge-resueltos">{resueltos}</span></td>
                    <td>{formatearTiempo(tiempoPromedioUsuario)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportesProfesional;
