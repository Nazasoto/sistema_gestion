import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import ticketService from '../../../services/ticket.service';
import userService from '../../../services/userService';
import './reportes.css';
import ReactECharts from 'echarts-for-react';
import echarts from '../../../utils/echartsConfig';
import AdvancedStatistics from '../../../components/statistics/AdvancedStatistics';
import './EstadisticasCompletas.css';



const ReportesPage = () => {
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filtros simplificados
  const [filtros, setFiltros] = useState({
    fecha: new Date().toISOString().split('T')[0], // Hoy por defecto
    usuarioAsignado: '',
    tipoFiltro: 'dia' // 'dia', 'semana', 'mes'
  });


  useEffect(() => {
    cargarUsuarios();
    cargarDatosCompletos();
  }, []);

  useEffect(() => {
    cargarDatosCompletos();
  }, [filtros]);


  const cargarUsuarios = async () => {
    try {
      const response = await userService.getAllUsers();
      setUsuarios(response.filter(user => user.role === 'soporte' || user.role === 'supervisor'));
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  // Función para obtener el rango de fechas según el período
  const obtenerRangoFechas = () => {
    const fechaBase = filtros.fecha ? new Date(filtros.fecha) : new Date();
    const inicio = new Date(fechaBase);
    const fin = new Date(fechaBase);

    switch (filtros.tipoFiltro) {
      case 'semana':
        // Inicio de semana (lunes)
        const diaSemana = inicio.getDay();
        const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
        inicio.setDate(inicio.getDate() - diasHastaLunes);
        // Fin de semana (domingo)
        fin.setDate(inicio.getDate() + 6);
        break;
      case 'mes':
        // Primer día del mes
        inicio.setDate(1);
        // Último día del mes
        fin.setMonth(fin.getMonth() + 1, 0);
        break;
      case 'dia':
      default:
        // Mismo día
        break;
    }

    return {
      inicio: inicio.toISOString().split('T')[0],
      fin: fin.toISOString().split('T')[0]
    };
  };

  const cargarDatosCompletos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Si no hay fecha, usar la fecha actual
      if (!filtros.fecha) {
        const hoy = new Date().toISOString().split('T')[0];
        setFiltros(prev => ({...prev, fecha: hoy}));
      }

      const rangoFechas = obtenerRangoFechas();
      const fechaDesde = rangoFechas.inicio;
      const fechaHasta = rangoFechas.fin;

      const filtrosAPI = {
        fechaDesde,
        fechaHasta,
        usuarioAsignado: filtros.usuarioAsignado
      };

      // Usar el endpoint de tickets directamente para obtener datos reales
      const [ticketsResponse, usuariosData] = await Promise.all([
        fetch('/api/tickets', {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user') || '{}').token}`,
            'Content-Type': 'application/json'
          }
        }),
        userService.getUsersByRole('tecnico')
      ]);
      
      const ticketsData = await ticketsResponse.json();
      
        
      // Asegurar que tickets sea siempre un array
      let ticketsArray = [];
      if (Array.isArray(ticketsData)) {
        ticketsArray = ticketsData;
      } else if (ticketsData && Array.isArray(ticketsData.data)) {
        ticketsArray = ticketsData.data;
      } else if (ticketsData && Array.isArray(ticketsData.tickets)) {
        ticketsArray = ticketsData.tickets;
      } else if (ticketsData && Array.isArray(ticketsData.reportes)) {
        ticketsArray = ticketsData.reportes;
      } else if (ticketsData && Array.isArray(ticketsData.result)) {
        ticketsArray = ticketsData.result;
      } else if (ticketsData && ticketsData.data && typeof ticketsData.data === 'object') {
        // Si ticketsData.data es un objeto, buscar arrays dentro de él
        const possibleArrays = Object.values(ticketsData.data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          ticketsArray = possibleArrays[0];
        }
      } else if (ticketsData && typeof ticketsData === 'object') {
        // Si es un objeto, intentar encontrar el array de tickets
        const possibleArrays = Object.values(ticketsData).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          ticketsArray = possibleArrays[0];
        }
      }
      
      if (ticketsArray.length > 0) {
      }
      
      setTickets(ticketsArray);
      setUsuarios(usuariosData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError(`Error al cargar datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };








  const aplicarFiltros = async () => {
    // Primero cargar los datos si no están disponibles
    if (tickets.length === 0) {
      await cargarDatosCompletos();
    }

    // Validar si hay actividad en el período seleccionado
    const rango = obtenerRangoFechas();
    if (!Array.isArray(tickets)) return <div>No hay datos de tickets disponibles</div>;
    
    
    const ticketsEnPeriodo = tickets.filter(t => {
      const fechaCreacion = t.fecha_creacion ? t.fecha_creacion.split('T')[0] : null;
      const fechaTomado = t.fecha_tomado ? t.fecha_tomado.split('T')[0] : null;
      const fechaResuelto = t.fecha_resuelto ? t.fecha_resuelto.split('T')[0] : null;
      
      
      return (fechaCreacion && fechaCreacion >= rango.inicio && fechaCreacion <= rango.fin) ||
             (fechaTomado && fechaTomado >= rango.inicio && fechaTomado <= rango.fin) ||
             (fechaResuelto && fechaResuelto >= rango.inicio && fechaResuelto <= rango.fin);
    });


    if (ticketsEnPeriodo.length === 0) {
      const periodoTexto = filtros.tipoFiltro === 'dia' ? 'este día' : 
                          filtros.tipoFiltro === 'semana' ? 'esta semana' : 'este mes';
      alert(`No hubo actividad ${periodoTexto}`);
      return;
    }

    // Si hay actividad, continuar con la carga normal
    cargarDatosCompletos();
  };

  const limpiarFiltros = () => {
    setFiltros({
      fecha: new Date().toISOString().split('T')[0],
      usuarioAsignado: '',
      tipoFiltro: 'dia'
    });
    cargarDatosCompletos();
  };

  const exportarEstadisticas = () => {
    const estadisticasCompletas = {
      fechaGeneracion: new Date().toISOString(),
      filtrosAplicados: filtros,
      totalTickets: tickets.length,
      tickets: tickets
    };

    const dataStr = JSON.stringify(estadisticasCompletas, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `estadisticas_tickets_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getEstadoBadgeClass = (estado) => {
    const clases = {
      'nuevo': 'bg-blue-100 text-blue-800',
      'en_progreso': 'bg-yellow-100 text-yellow-800',
      'resuelto': 'bg-green-100 text-green-800',
      'pendiente': 'bg-orange-100 text-orange-800',
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  // Función para preparar datos de la gráfica
  const prepararDatosGrafica = () => {
    const rango = obtenerRangoFechas();
    const fechas = [];
    const ticketsCreados = [];
    const ticketsResueltos = [];

    if (filtros.tipoFiltro === 'semana') {
      // Generar 7 días de la semana
      const fechaInicio = new Date(rango.inicio);
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fechaInicio.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        fechas.push(fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
        
        const creados = tickets.filter(t => t.fecha_creacion?.split('T')[0] === fechaStr).length;
        const resueltos = tickets.filter(t => t.fecha_resuelto?.split('T')[0] === fechaStr).length;
        
        ticketsCreados.push(creados);
        ticketsResueltos.push(resueltos);
      }
    } else if (filtros.tipoFiltro === 'mes') {
      // Generar días del mes
      const fechaInicio = new Date(rango.inicio);
      const fechaFin = new Date(rango.fin);
      const diasMes = fechaFin.getDate();
      
      for (let dia = 1; dia <= diasMes; dia++) {
        const fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), dia);
        const fechaStr = fecha.toISOString().split('T')[0];
        fechas.push(dia.toString());
        
        const creados = tickets.filter(t => t.fecha_creacion?.split('T')[0] === fechaStr).length;
        const resueltos = tickets.filter(t => t.fecha_resuelto?.split('T')[0] === fechaStr).length;
        
        ticketsCreados.push(creados);
        ticketsResueltos.push(resueltos);
      }
    }

    return { fechas, ticketsCreados, ticketsResueltos };
  };

  // Configuración de la gráfica
  const obtenerOpcionesGrafica = () => {
    const datos = prepararDatosGrafica();
    
    return {
      title: {
        text: `Actividad de Tickets - ${filtros.tipoFiltro === 'semana' ? 'Semanal' : 'Mensual'}`,
        left: 'center',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        data: ['Tickets Creados', 'Tickets Resueltos'],
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: datos.fechas
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: 'Tickets Creados',
          type: 'line',
          stack: 'Total',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(54, 162, 235, 0.8)'
              }, {
                offset: 1, color: 'rgba(54, 162, 235, 0.1)'
              }]
            }
          },
          emphasis: {
            focus: 'series'
          },
          data: datos.ticketsCreados,
          itemStyle: {
            color: '#36A2EB'
          }
        },
        {
          name: 'Tickets Resueltos',
          type: 'line',
          stack: 'Total',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(75, 192, 192, 0.8)'
              }, {
                offset: 1, color: 'rgba(75, 192, 192, 0.1)'
              }]
            }
          },
          emphasis: {
            focus: 'series'
          },
          data: datos.ticketsResueltos,
          itemStyle: {
            color: '#4BC0C0'
          }
        }
      ]
    };
  };

  return (
    <div className="reportes-container">
      {/* Header */}
      <div className="reportes-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="header-title">📊 Estadísticas de Tickets</h1>
            <p className="header-subtitle">Métricas y análisis del sistema de soporte</p>
          </div>
          <div className="update-badge">
            <span className="update-time">
              🕒 Última actualización: {format(new Date(), 'HH:mm:ss')}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtros-header">
          <h3 className="filtros-title">🔍 Filtros de Búsqueda</h3>
          <p className="filtros-subtitle">Personaliza tu análisis seleccionando período y técnico</p>
        </div>
        
        <div className="filtros-grid">
          {/* Fecha */}
          <div className="filter-group">
            <label className="filter-label">📅 Fecha de análisis</label>
            <input
              type="date"
              value={filtros.fecha}
              onChange={(e) => setFiltros({...filtros, fecha: e.target.value})}
              className="filter-input"
            />
          </div>

          {/* Período */}
          <div className="filter-group">
            <label className="filter-label">⏰ Período</label>
            <select
              value={filtros.tipoFiltro}
              onChange={(e) => setFiltros({...filtros, tipoFiltro: e.target.value})}
              className="filter-select"
            >
              <option value="dia">📊 Diario</option>
              <option value="semana">📈 Semanal</option>
              <option value="mes">📉 Mensual</option>
            </select>
          </div>

          {/* Técnico */}
          <div className="filter-group">
            <label className="filter-label">👨‍💻 Técnico asignado</label>
            <select
              value={filtros.usuarioAsignado}
              onChange={(e) => setFiltros({...filtros, usuarioAsignado: e.target.value})}
              className="filter-select"
            >
              <option value="">Filtrar todos los técnicos</option>
              {usuarios.filter(usuario => usuario.role === 'soporte').map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Acciones */}
        <div className="filtros-actions">
          <button 
            style={{textDecoration:'none'}}
            onClick={limpiarFiltros}
            className="btn-secondary"
          >
            🔄 Resetear
          </button>
          <button 
            style={{textDecoration:'none'}}
            onClick={exportarEstadisticas}
            className="btn-outline"
          >
            📥 Exportar
          </button>
          <button 
            style={{textDecoration:'none'}}
            onClick={aplicarFiltros}
            className="btn-primary"
          >
            ✨ Aplicar filtros
          </button>
        </div>

        {/* Métricas - Solo mostrar cuando NO hay técnico seleccionado */}
        {!filtros.usuarioAsignado && (
          <div className="quick-filters-section">
            <p className="quick-filters-label">📊 Métricas Totales del Equipo</p>
          <div className="percentage-filters">
            <div className="percentage-card">
              <div className="percentage-icon">📥</div>
              <div className="percentage-content">
                <span className="percentage-label">Total Tickets Tomados</span>
                <div className="metric-number">
                  {(() => {
                    if (!Array.isArray(tickets)) return 0;
                    const rango = obtenerRangoFechas();
                    const tomadosEnPeriodo = tickets.filter(t => {
                      const fechaTomado = t.fecha_tomado ? t.fecha_tomado.split('T')[0] : null;
                      return fechaTomado && fechaTomado >= rango.inicio && fechaTomado <= rango.fin && 
                             (t.estado === 'en_progreso' || t.estado === 'resuelto' || t.estado === 'cerrado');
                    });
                    return tomadosEnPeriodo.length;
                  })()}
                </div>
                <span className="metric-label">tickets</span>
              </div>
            </div>
            
            <div className="percentage-card">
              <div className="percentage-icon">✅</div>
              <div className="percentage-content">
                <span className="percentage-label">Total Tickets Resueltos</span>
                <div className="metric-number">
                  {(() => {
                    if (!Array.isArray(tickets)) return 0;
                    const rango = obtenerRangoFechas();
                    const resueltosEnPeriodo = tickets.filter(t => {
                      const fechaResuelto = t.fecha_resuelto ? t.fecha_resuelto.split('T')[0] : null;
                      return fechaResuelto && fechaResuelto >= rango.inicio && fechaResuelto <= rango.fin && 
                             (t.estado === 'resuelto' || t.estado === 'cerrado');
                    });
                    return resueltosEnPeriodo.length;
                  })()}
                </div>
                <span className="metric-label">tickets</span>
              </div>
            </div>

            <div className="percentage-card">
              <div className="percentage-icon">🕐</div>
              <div className="percentage-content">
                <span className="percentage-label">Tiempo Promedio Total</span>
                <div className="metric-number">
                  {(() => {
                    if (!Array.isArray(tickets)) return 0;
                    const rango = obtenerRangoFechas();
                    const resueltos = tickets.filter(t => {
                      const fechaResuelto = t.fecha_resuelto ? t.fecha_resuelto.split('T')[0] : null;
                      return (t.estado === 'resuelto' || t.estado === 'cerrado') &&
                             t.fecha_creacion && t.fecha_resuelto &&
                             fechaResuelto && fechaResuelto >= rango.inicio && fechaResuelto <= rango.fin;
                    });
                    if (resueltos.length === 0) return 'N/A';
                    const tiempos = resueltos.map(t => {
                      const inicio = new Date(t.fecha_creacion);
                      const fin = new Date(t.fecha_resuelto);
                      return (fin - inicio) / (1000 * 60 * 60); // horas
                    });
                    const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
                    return Math.round(promedio * 10) / 10; // 1 decimal
                  })()}
                </div>
                <span className="metric-label">horas</span>
              </div>
            </div>

            <div className="percentage-card">
              <div className="percentage-icon">📊</div>
              <div className="percentage-content">
                <span className="percentage-label">Total Tickets Asignados</span>
                <div className="metric-number">
                  {Array.isArray(tickets) ? tickets.filter(t => t.nombre_asignado).length : 0}
                </div>
                <span className="metric-label">tickets</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Métricas por Técnico Individual */}
        {filtros.usuarioAsignado && (
          <div className="quick-filters-section">
            <p className="quick-filters-label">👤 Métricas del Técnico Seleccionado</p>
            <p className="selected-user-label">
              🎯 {usuarios.find(u => u.id === parseInt(filtros.usuarioAsignado))?.nombre || 'Técnico Seleccionado'}
            </p>
            <div className="percentage-filters">
              <div className="percentage-card">
                <div className="percentage-icon">📥</div>
                <div className="percentage-content">
                  <span className="percentage-label">Tickets Tomados</span>
                  <div className="metric-number">
                    {(() => {
                      const usuarioId = parseInt(filtros.usuarioAsignado);
                      const usuarioSeleccionado = usuarios.find(u => u.id === usuarioId);
                      const rango = obtenerRangoFechas();
                      const tomadosEnPeriodo = Array.isArray(tickets) ? tickets.filter(t => {
                        const fechaTomado = t.fecha_tomado ? t.fecha_tomado.split('T')[0] : null;
                          if (t.id <= 5) { // Solo mostrar los primeros 5 tickets para no saturar la consola
                        }
                        return fechaTomado && fechaTomado >= rango.inicio && fechaTomado <= rango.fin && 
                               (t.estado === 'en_progreso' || t.estado === 'resuelto' || t.estado === 'cerrado') &&
                               (t.nombre_asignado === usuarioSeleccionado?.nombre || t.usuario_asignado === usuarioId);
                      }) : [];
                      return tomadosEnPeriodo.length;
                    })()}
                  </div>
                  <span className="metric-label">tickets</span>
                </div>
              </div>
              
              <div className="percentage-card">
                <div className="percentage-icon">✅</div>
                <div className="percentage-content">
                  <span className="percentage-label">Tickets Resueltos</span>
                  <div className="metric-number">
                    {(() => {
                      const usuarioId = parseInt(filtros.usuarioAsignado);
                      const usuarioSeleccionado = usuarios.find(u => u.id === usuarioId);
                      const rango = obtenerRangoFechas();
                      const resueltosEnPeriodo = Array.isArray(tickets) ? tickets.filter(t => {
                        const fechaResuelto = t.fecha_resuelto ? t.fecha_resuelto.split('T')[0] : null;
                        return fechaResuelto && fechaResuelto >= rango.inicio && fechaResuelto <= rango.fin && 
                               (t.estado === 'resuelto' || t.estado === 'cerrado') &&
                               (t.nombre_asignado === usuarioSeleccionado?.nombre || t.usuario_asignado === usuarioId);
                      }) : [];
                      return resueltosEnPeriodo.length;
                    })()}
                  </div>
                  <span className="metric-label">tickets</span>
                </div>
              </div>

              <div className="percentage-card">
                <div className="percentage-icon">🕐</div>
                <div className="percentage-content">
                  <span className="percentage-label">Tiempo Promedio</span>
                  <div className="metric-number">
                    {(() => {
                      const usuarioId = parseInt(filtros.usuarioAsignado);
                      const usuarioSeleccionado = usuarios.find(u => u.id === usuarioId);
                      const rango = obtenerRangoFechas();
                      const resueltos = Array.isArray(tickets) ? tickets.filter(t => {
                        const fechaResuelto = t.fecha_resuelto ? t.fecha_resuelto.split('T')[0] : null;
                        return (t.estado === 'resuelto' || t.estado === 'cerrado') &&
                               t.fecha_creacion && t.fecha_resuelto &&
                               fechaResuelto && fechaResuelto >= rango.inicio && fechaResuelto <= rango.fin &&
                               (t.nombre_asignado === usuarioSeleccionado?.nombre || t.usuario_asignado === usuarioId);
                      }) : [];
                      if (resueltos.length === 0) return 'N/A';
                      const tiempos = resueltos.map(t => {
                        const inicio = new Date(t.fecha_creacion);
                        const fin = new Date(t.fecha_resuelto);
                        return (fin - inicio) / (1000 * 60 * 60); // horas
                      });
                      const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
                      return Math.round(promedio * 10) / 10; // 1 decimal
                    })()}
                  </div>
                  <span className="metric-label">horas</span>
                </div>
              </div>

              <div className="percentage-card">
                <div className="percentage-icon">📊</div>
                <div className="percentage-content">
                  <span className="percentage-label">Total Asignados</span>
                  <div className="metric-number">
                    {(() => {
                      const usuarioId = parseInt(filtros.usuarioAsignado);
                      const usuarioSeleccionado = usuarios.find(u => u.id === usuarioId);
                      return Array.isArray(tickets) ? tickets.filter(t => t.nombre_asignado === usuarioSeleccionado?.nombre || t.usuario_asignado === usuarioId).length : 0;
                    })()}
                  </div>
                  <span className="metric-label">tickets</span>
                </div>
              </div>
            </div>
          </div>
        )}


      {loading && (
        <div className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <span className="loading-text mt-2">🔄 Cargando estadísticas...</span>
        </div>
      )}

      {error && (
        <div className="error-container">
          <div className="error-message">⚠️ {error}</div>
        </div>
      )}

      {/* Gráfica para períodos semanal y mensual */}
      {(filtros.tipoFiltro === 'semana' || filtros.tipoFiltro === 'mes') && (
        <div className="chart-section">
          <div className="chart-header">
            <h3 className="chart-title">📈 Tendencia de Actividad</h3>
            <p className="chart-subtitle">
              Evolución de tickets creados y resueltos en el período seleccionado
            </p>
          </div>
          <div className="chart-container">
            <ReactECharts 
              option={obtenerOpcionesGrafica()} 
              style={{ height: '400px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              echarts={echarts}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ReportesPage;
