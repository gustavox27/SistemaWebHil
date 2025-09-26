import React, { useState, useEffect } from 'react';
import { History, Download, Search, Calendar, Eye } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { ExportUtils } from '../utils/exportUtils';
import { Venta } from '../types';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Modal from '../components/Common/Modal';
import toast from 'react-hot-toast';

const Historial: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadVentas();
  }, []);

  useEffect(() => {
    filterVentas();
  }, [ventas, searchTerm, fechaInicio, fechaFin]);

  const loadVentas = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getVentas();
      setVentas(data);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Error al cargar el historial de ventas');
    } finally {
      setLoading(false);
    }
  };

  const filterVentas = () => {
    let filtered = [...ventas];

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(venta =>
        venta.usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venta.usuario?.dni.includes(searchTerm) ||
        venta.vendedor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rango de fechas
    if (fechaInicio) {
      filtered = filtered.filter(venta =>
        new Date(venta.fecha_venta) >= new Date(fechaInicio)
      );
    }

    if (fechaFin) {
      const fechaFinDate = new Date(fechaFin);
      fechaFinDate.setHours(23, 59, 59, 999); // Incluir todo el día
      filtered = filtered.filter(venta =>
        new Date(venta.fecha_venta) <= fechaFinDate
      );
    }

    setFilteredVentas(filtered);
  };

  const handleExportPDF = async () => {
    try {
      const exportData = filteredVentas.map(venta => ({
        'Fecha': new Date(venta.fecha_venta).toLocaleDateString('es-ES'),
        'Cliente': venta.usuario?.nombre || 'N/A',
        'DNI': venta.usuario?.dni || 'N/A',
        'Total': `S/ ${venta.total.toFixed(2)}`,
        'Vendedor': venta.vendedor
      }));

      await ExportUtils.exportToPDF(
        exportData,
        ['Fecha', 'Cliente', 'DNI', 'Total', 'Vendedor'],
        'historial-ventas',
        'Historial de Ventas - HILOSdeCALIDAD'
      );

      toast.success('Reporte PDF generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredVentas.map(venta => ({
        'Fecha': new Date(venta.fecha_venta).toLocaleDateString('es-ES'),
        'Cliente': venta.usuario?.nombre || 'N/A',
        'DNI': venta.usuario?.dni || 'N/A',
        'Teléfono': venta.usuario?.telefono || 'N/A',
        'Total': venta.total,
        'Vendedor': venta.vendedor,
        'Productos': venta.detalles?.map(d => d.producto?.nombre).join(', ') || ''
      }));

      ExportUtils.exportToExcel(exportData, 'historial-ventas', 'Ventas');
      toast.success('Reporte Excel generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte Excel');
    }
  };

  const handleViewDetail = (venta: Venta) => {
    setSelectedVenta(venta);
    setShowDetailModal(true);
  };

  const handleGenerateBoleta = async (venta: Venta) => {
    try {
      if (!venta.usuario || !venta.detalles) {
        toast.error('Datos incompletos para generar la boleta');
        return;
      }

      await ExportUtils.generateSalePDF(venta, venta.usuario, venta.detalles);
      toast.success('Boleta regenerada correctamente');
    } catch (error) {
      console.error('Error generating boleta:', error);
      toast.error('Error al generar la boleta');
    }
  };

  // Estadísticas rápidas
  const totalVentas = filteredVentas.reduce((acc, venta) => acc + venta.total, 0);
  const promedioVenta = filteredVentas.length > 0 ? totalVentas / filteredVentas.length : 0;
  const ventasPorMes = filteredVentas.length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Ventas</h2>
          <p className="text-gray-600">Registro completo de todas las transacciones</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <History className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Ventas</h3>
              <p className="text-2xl font-bold text-gray-900">S/ {totalVentas.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Promedio por Venta</h3>
              <p className="text-2xl font-bold text-gray-900">S/ {promedioVenta.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <History className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Número de Ventas</h3>
              <p className="text-2xl font-bold text-gray-900">{ventasPorMes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente o vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              placeholder="Fecha inicio"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              placeholder="Fecha fin"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setFechaInicio('');
              setFechaFin('');
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Registro de Ventas ({filteredVentas.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVentas.map(venta => (
                <tr key={venta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(venta.fecha_venta).toLocaleDateString('es-ES')}
                    <div className="text-xs text-gray-500">
                      {new Date(venta.fecha_venta).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {venta.usuario?.nombre || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {venta.usuario?.dni || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    S/ {venta.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {venta.vendedor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(venta)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        title="Ver detalles"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleGenerateBoleta(venta)}
                        className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                        title="Regenerar boleta"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredVentas.length === 0 && (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No se encontraron ventas</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detalle de Venta"
        size="xl"
      >
        {selectedVenta && (
          <div className="space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Información de la Venta</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Fecha:</span> {new Date(selectedVenta.fecha_venta).toLocaleDateString('es-ES')}</p>
                  <p><span className="font-medium">Hora:</span> {new Date(selectedVenta.fecha_venta).toLocaleTimeString('es-ES')}</p>
                  <p><span className="font-medium">Vendedor:</span> {selectedVenta.vendedor}</p>
                  <p><span className="font-medium">Total:</span> S/ {selectedVenta.total.toFixed(2)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Información del Cliente</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Nombre:</span> {selectedVenta.usuario?.nombre || 'N/A'}</p>
                  <p><span className="font-medium">DNI:</span> {selectedVenta.usuario?.dni || 'N/A'}</p>
                  <p><span className="font-medium">Teléfono:</span> {selectedVenta.usuario?.telefono || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Productos vendidos */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Productos Vendidos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">P. Unitario</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedVenta.detalles?.map((detalle, index) => (
                      <tr key={detalle.id || index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{detalle.producto?.nombre || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{detalle.producto?.color}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{detalle.cantidad}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">S/ {detalle.precio_unitario.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-semibold">S/ {detalle.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Historial;