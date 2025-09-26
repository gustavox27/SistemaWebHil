import React, { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, Download } from 'lucide-react';
import MetricCard from '../components/Dashboard/MetricCard';
import ChartCard from '../components/Dashboard/ChartCard';
import { SupabaseService } from '../services/supabaseService';
import { ExportUtils } from '../utils/exportUtils';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('week');

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, eventosData] = await Promise.all([
        SupabaseService.getMetricasVentas(),
        SupabaseService.getEventos(10)
      ]);

      setMetrics(metricsData);
      setEventos(eventosData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (!metrics) return;

      const reportData = [
        ['Métrica', 'Valor'],
        ['Total Ventas del Mes', `S/ ${metrics.totalVentas.toFixed(2)}`],
        ['Productos en Stock', metrics.estadoStock.reduce((acc: number, item: any) => acc + item.cantidad, 0)],
        ['Eventos Registrados', eventos.length],
      ];

      await ExportUtils.exportToPDF(
        reportData.slice(1),
        ['Métrica', 'Valor'],
        'reporte-dashboard',
        'Reporte Dashboard - HILOSdeCALIDAD'
      );

      toast.success('Reporte PDF generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      if (!metrics) return;

      const reportData = [
        {
          metrica: 'Total Ventas del Mes',
          valor: metrics.totalVentas.toFixed(2)
        },
        {
          metrica: 'Productos en Stock',
          valor: metrics.estadoStock.reduce((acc: number, item: any) => acc + item.cantidad, 0)
        },
        {
          metrica: 'Eventos Registrados',
          valor: eventos.length
        }
      ];

      ExportUtils.exportToExcel(reportData, 'reporte-dashboard', 'Dashboard');
      toast.success('Reporte Excel generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte Excel');
    }
  };

  if (loading) return <LoadingSpinner />;

  const chartData = metrics?.ventasPorPeriodo?.map((item: any, index: number) => ({
    name: `Día ${index + 1}`,
    value: item.total || 0
  })) || [];

  const pieData = metrics?.estadoStock?.map((item: any) => ({
    name: item.estado,
    value: item.cantidad
  })) || [];

  const popularProductsData = metrics?.productosPopulares?.map((item: any) => ({
    name: item.nombre,
    value: item.cantidad
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header with filters and export buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Métricas clave del sistema de ventas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Hoy</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
          </select>
          
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Download size={16} />
            <span>PDF</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Ventas del Mes"
          value={`S/ ${metrics?.totalVentas?.toFixed(2) || '0.00'}`}
          icon={DollarSign}
          color="bg-green-500"
          trend="+12% vs mes anterior"
        />
        <MetricCard
          title="Productos en Stock"
          value={metrics?.estadoStock?.reduce((acc: number, item: any) => acc + item.cantidad, 0)?.toString() || '0'}
          icon={Package}
          color="bg-blue-500"
        />
        <MetricCard
          title="Ventas Realizadas"
          value={metrics?.ventasPorPeriodo?.length?.toString() || '0'}
          icon={ShoppingCart}
          color="bg-purple-500"
        />
        <MetricCard
          title="Clientes Activos"
          value="125"
          icon={Users}
          color="bg-orange-500"
          trend="+5% esta semana"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Ventas por Período"
          data={chartData}
          type="bar"
        />
        <ChartCard
          title="Estado de Hilos"
          data={pieData}
          type="pie"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard
            title="Productos Más Vendidos"
            data={popularProductsData}
            type="bar"
            colors={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']}
          />
        </div>
        
        {/* Event Log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Eventos Recientes</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {eventos.map((evento, index) => (
              <div key={evento.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{evento.tipo}</p>
                  <p className="text-xs text-gray-600 truncate">{evento.descripcion}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(evento.fecha).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;