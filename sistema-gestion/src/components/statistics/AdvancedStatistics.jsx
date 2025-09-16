import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import reportService from '../../services/reportService';

const AdvancedStatistics = ({ tickets, filtros }) => {
  const [vistaActiva, setVistaActiva] = useState('resumen');
  const [estadisticasGenerales, setEstadisticasGenerales] = useState({});

  useEffect(() => {
    if (tickets.length > 0) {
      const estadisticas = calcularEstadisticasDiarias();
      setEstadisticasGenerales(estadisticas);
    }
  }, [tickets]);

  const calcularEstadisticasDiarias = () => {
    // console.log('🔍 Debug - Total tickets:', tickets.length);
    // console.log('🔍 Debug - Sample ticket:', tickets[0]);
    
    // Tickets tomados (asignados a usuarios) en el período
    const ticketsTomados = tickets.filter(t => t.nombre_asignado && t.nombre_asignado !== 'Sin asignar');
    const tomados = ticketsTomados.length;
    
    // console.log('🔍 Debug - Tickets tomados:', tomados);
    // console.log('🔍 Debug - Estados únicos:', [...new Set(tickets.map(t => t.estado))]);
    
    const resueltos = tickets.filter(t => t.estado === 'resuelto').length;
    const cerrados = tickets.filter(t => t.estado === 'cerrado').length;
    const cancelados = tickets.filter(t => t.estado === 'cancelado').length;
    const enProgreso = tickets.filter(t => t.estado === 'en_progreso').length;
    const nuevos = tickets.filter(t => t.estado === 'nuevo').length;
    
    // console.log('🔍 Debug - Resueltos:', resueltos, 'Cerrados:', cerrados, 'En progreso:', enProgreso);
    
    // Calcular por usuario asignado (solo tickets que tienen usuario asignado)
    const porUsuario = {};
    ticketsTomados.forEach(ticket => {
      const usuario = ticket.nombre_asignado;
      // console.log('🔍 Debug - Processing ticket:', ticket.id, 'Estado:', ticket.estado, 'Usuario:', usuario);
      
      if (!porUsuario[usuario]) {
        porUsuario[usuario] = {
          nombre: usuario,
          tomados: 0,
          resueltos: 0,
          enProgreso: 0,
          cerrados: 0,
          cancelados: 0
        };
      }
      porUsuario[usuario].tomados++;
      if (ticket.estado === 'resuelto') {
        porUsuario[usuario].resueltos++;
        // console.log('✅ Found resolved ticket for user:', usuario);
      }
      if (ticket.estado === 'cerrado') {
        porUsuario[usuario].cerrados++;
        // console.log('🔒 Found closed ticket for user:', usuario);
      }
      if (ticket.estado === 'en_progreso') porUsuario[usuario].enProgreso++;
      if (ticket.estado === 'cancelado') porUsuario[usuario].cancelados++;
    });

    return {
      total: tickets.length,
      tomados,
      resueltos,
      cerrados,
      cancelados,
      enProgreso,
      nuevos,
      porUsuario: Object.values(porUsuario).sort((a, b) => b.tomados - a.tomados)
    };
  };

  return (
    <>
      {/* Navegación */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Análisis detallado</h3>
        </div>
        <div className="px-6 py-3">
          <nav className="flex gap-2">
            {[{ id: 'resumen', label: 'Resumen' }, { id: 'usuario', label: 'Por usuario' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVistaActiva(tab.id)}
                className={`${vistaActiva === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-4 py-2 rounded-md text-sm font-medium`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido de las vistas */}
      {vistaActiva === 'resumen' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Resumen {filtros.tipoFiltro === 'dia' ? 'diario' : filtros.tipoFiltro === 'semana' ? 'semanal' : 'mensual'}
            {filtros.fecha && (
              <span className="ml-2 text-sm text-gray-500">
                ({format(new Date(filtros.fecha + 'T00:00:00'), 'dd/MM/yyyy')})
              </span>
            )}
          </h3>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl font-semibold text-gray-900">{estadisticasGenerales.tomados || 0}</div>
              <div className="text-xs text-gray-500">Tomados</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl font-semibold text-gray-900">{estadisticasGenerales.resueltos || 0}</div>
              <div className="text-xs text-gray-500">Resueltos</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl font-semibold text-gray-900">{estadisticasGenerales.cerrados || 0}</div>
              <div className="text-xs text-gray-500">Cerrados</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl font-semibold text-gray-900">{estadisticasGenerales.cancelados || 0}</div>
              <div className="text-xs text-gray-500">Cancelados</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl font-semibold text-gray-900">{estadisticasGenerales.enProgreso || 0}</div>
              <div className="text-xs text-gray-500">En progreso</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl font-semibold text-gray-900">{estadisticasGenerales.nuevos || 0}</div>
              <div className="text-xs text-gray-500">Nuevos</div>
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Eficiencia General */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tasa de resolución</p>
                <div className="text-2xl font-semibold text-gray-900">
                  {estadisticasGenerales.tomados > 0 ? Math.round(((estadisticasGenerales.resueltos + estadisticasGenerales.cerrados) / estadisticasGenerales.tomados) * 100) : 0}%
                </div>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{width: `${estadisticasGenerales.tomados > 0 ? Math.round(((estadisticasGenerales.resueltos + estadisticasGenerales.cerrados) / estadisticasGenerales.tomados) * 100) : 0}%`}}
                ></div>
              </div>
            </div>

            {/* Tickets Completados */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tickets finalizados</p>
                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 border border-gray-200">Completados</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {(estadisticasGenerales.resueltos || 0) + (estadisticasGenerales.cerrados || 0)}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">{estadisticasGenerales.resueltos || 0}</span> resueltos +
                <span className="font-medium"> {estadisticasGenerales.cerrados || 0}</span> cerrados
              </div>
            </div>

            {/* Trabajo Activo */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tickets activos</p>
                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 border border-gray-200">En curso</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {estadisticasGenerales.enProgreso || 0}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {estadisticasGenerales.nuevos || 0} nuevos esperando
              </div>
            </div>
          </div>
        </div>
      )}

      {vistaActiva === 'usuario' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Rendimiento por técnico</h3>
              {filtros.fecha && (
                <p className="text-sm text-gray-500 mt-1">
                  Período: {format(new Date(filtros.fecha + 'T00:00:00'), 'dd/MM/yyyy')} 
                  ({filtros.tipoFiltro === 'dia' ? 'Diario' : filtros.tipoFiltro === 'semana' ? 'Semanal' : 'Mensual'})
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total técnicos activos</div>
              <div className="text-xl font-semibold text-gray-900">{estadisticasGenerales.porUsuario?.length || 0}</div>
            </div>
          </div>

          {estadisticasGenerales.porUsuario && estadisticasGenerales.porUsuario.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {estadisticasGenerales.porUsuario.map((usuario, index) => {
                const eficiencia = usuario.tomados > 0 ? Math.round(((usuario.resueltos + usuario.cerrados) / usuario.tomados) * 100) : 0;
                const isTopPerformer = index < 3;

                return (
                  <div key={index} className={`relative bg-white border ${isTopPerformer ? 'border-yellow-300' : 'border-gray-200'} rounded-xl p-5 shadow-sm`}>
                    {isTopPerformer && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-xs font-semibold px-2 py-0.5 rounded-full border border-yellow-500">
                        TOP {index + 1}
                      </div>
                    )}

                    <div className="flex items-center mb-4">
                      <div className={`rounded-full w-8 h-8 mr-3 ${
                        eficiencia >= 80 ? 'bg-green-500' : eficiencia >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{usuario.nombre}</h4>
                        <div className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          eficiencia >= 80 ? 'bg-green-100 text-green-800' : 
                          eficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {eficiencia}% eficiencia
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <div className="text-xl font-semibold text-gray-900">{usuario.tomados}</div>
                        <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Tomados</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <div className="text-xl font-semibold text-gray-900">{usuario.resueltos + usuario.cerrados}</div>
                        <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Completados</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Progreso de resolución</span>
                        <span className="font-semibold text-gray-900">{eficiencia}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-700 bg-blue-600"
                          style={{width: `${eficiencia}%`}}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="text-base font-semibold text-gray-900">{usuario.enProgreso}</div>
                        <div className="text-[11px] text-gray-500">Progreso</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="text-base font-semibold text-gray-900">{usuario.cerrados}</div>
                        <div className="text-[11px] text-gray-500">Cerrados</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="text-base font-semibold text-gray-900">{usuario.cancelados}</div>
                        <div className="text-[11px] text-gray-500">Cancelados</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Sin datos disponibles</h3>
              <p className="text-sm text-gray-500">No hay actividad de usuarios en el período seleccionado</p>
              <div className="mt-3">
                <button 
                  onClick={() => setFiltros({...filtros, fecha: new Date().toISOString().split('T')[0], tipoFiltro: 'mes'})}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium border border-blue-200"
                >
                  Ver este mes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdvancedStatistics;
