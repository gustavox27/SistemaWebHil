import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Download, Upload, CreditCard as Edit, Trash2, Search, BarChart3, AlertTriangle } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { ExportUtils } from '../utils/exportUtils';
import { Producto } from '../types';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Modal from '../components/Common/Modal';
import MetricCard from '../components/Dashboard/MetricCard';
import ChartCard from '../components/Dashboard/ChartCard';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const Inventario: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTintoreriaModal, setShowTintoreriaModal] = useState(false);
  const [showHilanderiaModal, setShowHilanderiaModal] = useState(false);
  const [showHilanderiaDetailModal, setShowHilanderiaDetailModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [porHilandarProducts, setPorHilandarProducts] = useState<Producto[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    color: '',
    descripcion: '',
    estado: 'Por Hilandar' as 'Por Hilandar' | 'Conos Devanados' | 'Conos Veteados',
    precio_base: '',
    precio_uni: '',
    stock: '',
    cantidad: ''
  });
  
  const [tintoreriaData, setTintoreriaData] = useState({
    nombre: '',
    color: '',
    cantidad: '',
    descripcion: ''
  });
  
  const [hilanderiaData, setHilanderiaData] = useState({
    estado: 'Conos Devanados' as 'Conos Devanados' | 'Conos Veteados',
    cantidad: '',
    precio_base: '',
    precio_uni: '',
    stock: ''
  });

  // Función para actualizar automáticamente el stock cuando cambia la cantidad
  const handleCantidadChange = (cantidad: string) => {
    const cantidadNum = parseInt(cantidad) || 0;
    const stockCalculado = Math.floor(cantidadNum / 2);
    
    setHilanderiaData(prev => ({
      ...prev,
      cantidad,
      stock: stockCalculado.toString()
    }));
  };

  // Función para actualizar automáticamente el precio unitario cuando cambia el precio base
  const handlePrecioBaseChange = (precioBase: string) => {
    setHilanderiaData(prev => ({
      ...prev,
      precio_base: precioBase,
      precio_uni: precioBase // Copiar automáticamente el precio base al precio unitario
    }));
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProductos();
  }, []);

  useEffect(() => {
    filterProductos();
  }, [productos, searchTerm]);
  
  useEffect(() => {
    loadPorHilandarProducts();
  }, [productos]);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const loadPorHilandarProducts = () => {
    const porHilandar = productos.filter(p => p.estado === 'Por Hilandar');
    setPorHilandarProducts(porHilandar);
  };

  const filterProductos = () => {
    if (!searchTerm) {
      setFilteredProductos(productos);
      return;
    }

    const filtered = productos.filter(producto =>
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredProductos(filtered);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      color: '',
      descripcion: '',
      estado: 'Por Hilandar',
      precio_base: '',
      precio_uni: '',
      stock: '',
      cantidad: ''
    });
    setTintoreriaData({
      nombre: '',
      color: '',
      cantidad: '',
      descripcion: ''
    });
    setHilanderiaData({
      estado: 'Conos Devanados',
      cantidad: '',
      precio_base: '',
      precio_uni: '',
      stock: ''
    });
    setEditingProduct(null);
    setSelectedProduct(null);
  };

  const handleTintoreriaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productoData = {
        nombre: tintoreriaData.nombre,
        color: tintoreriaData.color,
        descripcion: tintoreriaData.descripcion,
        estado: 'Por Hilandar' as const,
        precio_base: 0,
        precio_uni: 0,
        stock: 0,
        cantidad: parseInt(tintoreriaData.cantidad),
        fecha_ingreso: new Date().toISOString()
      };

      await SupabaseService.createProducto(productoData);
      toast.success('Producto de tintorería creado correctamente');
      
      loadProductos();
      setShowTintoreriaModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tintorería product:', error);
      toast.error('Error al guardar producto de tintorería');
    }
  };

  const handleHilanderiaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;
    
    try {
      const cantidadProcesada = parseInt(hilanderiaData.cantidad);
      const cantidadOriginal = selectedProduct.cantidad || 0;
      
      // Validar que la cantidad procesada no sea mayor a la disponible
      if (cantidadProcesada > cantidadOriginal) {
        toast.error('La cantidad a procesar no puede ser mayor a la disponible');
        return;
      }
      
      if (cantidadProcesada <= 0) {
        toast.error('La cantidad debe ser mayor a cero');
        return;
      }
      
      if (cantidadProcesada === cantidadOriginal) {
        // Actualizar el producto existente - cambiar nombre a "Cono" cuando se usa toda la cantidad
        const updateData = {
          nombre: 'Cono', // Cambiar automáticamente el nombre a "Cono"
          estado: hilanderiaData.estado,
          precio_base: parseFloat(hilanderiaData.precio_base),
          precio_uni: parseFloat(hilanderiaData.precio_uni),
          stock: parseInt(hilanderiaData.stock)
        };
        
        await SupabaseService.updateProducto(selectedProduct.id, updateData);
        toast.success('Producto procesado completamente y convertido a Cono');
        
        loadProductos();
        setShowHilanderiaDetailModal(false);
        resetForm();
      } else if (cantidadProcesada < cantidadOriginal) {
        // Crear nuevo producto y actualizar cantidad del original
        const nuevoProducto = {
          nombre: 'Cono', // Cambiar automáticamente el nombre a "Cono"
          color: selectedProduct.color,
          descripcion: selectedProduct.descripcion,
          estado: hilanderiaData.estado,
          precio_base: parseFloat(hilanderiaData.precio_base),
          precio_uni: parseFloat(hilanderiaData.precio_uni),
          stock: parseInt(hilanderiaData.stock),
          cantidad: cantidadProcesada,
          fecha_ingreso: new Date().toISOString()
        };
        
        await SupabaseService.createProducto(nuevoProducto);
        
        // Actualizar cantidad del producto original
        await SupabaseService.updateProducto(selectedProduct.id, {
          cantidad: cantidadOriginal - cantidadProcesada
        });
        
        toast.success('Conos creados correctamente. Cantidad restante actualizada.');
        setShowContinueModal(true);
      }
    } catch (error) {
      console.error('Error processing hilandería:', error);
      toast.error('Error al procesar hilandería');
    }
  };

  const handleContinueProcessing = () => {
    setShowContinueModal(false);
    setHilanderiaData({
      estado: 'Conos Devanados',
      cantidad: '',
      precio_base: '',
      precio_uni: '',
      stock: ''
    });
    loadProductos();
  };

  const handleFinishProcessing = () => {
    setShowContinueModal(false);
    setShowHilanderiaDetailModal(false);
    loadProductos();
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productoData = {
        ...formData,
        precio_base: parseFloat(formData.precio_base),
        precio_uni: parseFloat(formData.precio_uni),
        stock: parseInt(formData.stock),
        cantidad: formData.cantidad ? parseInt(formData.cantidad) : undefined,
        fecha_ingreso: new Date().toISOString()
      };

      if (editingProduct) {
        await SupabaseService.updateProducto(editingProduct.id, productoData);
        toast.success('Producto actualizado correctamente');
      } else {
        await SupabaseService.createProducto(productoData);
        toast.success('Producto creado correctamente');
      }

      loadProductos();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar producto');
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.nombre,
      color: producto.color,
      descripcion: producto.descripcion || '',
      estado: producto.estado,
      precio_base: producto.precio_base.toString(),
      precio_uni: producto.precio_uni.toString(),
      stock: producto.stock.toString(),
      cantidad: producto.cantidad?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDeleteClick = (producto: Producto) => {
    setProductToDelete(producto);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await SupabaseService.deleteProducto(productToDelete.id);
      toast.success('Producto eliminado correctamente');
      loadProductos();
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = productos.map(producto => ({
        'Nombre': producto.nombre,
        'Color': producto.color,
        'Descripción': producto.descripcion,
        'Estado': producto.estado,
        'Precio Base': producto.precio_base,
        'Precio Unitario': producto.precio_uni,
        'Stock': producto.stock,
        'Fecha Ingreso': new Date(producto.fecha_ingreso).toLocaleDateString('es-ES')
      }));

      ExportUtils.exportToExcel(exportData, 'inventario-productos', 'Inventario');
      toast.success('Reporte Excel generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const exportData = productos.map(producto => ({
        'Nombre': producto.nombre,
        'Color': producto.color,
        'Estado': producto.estado,
        'Precio': `S/ ${producto.precio_uni}`,
        'Stock': producto.stock.toString()
      }));

      await ExportUtils.exportToPDF(
        exportData,
        ['Nombre', 'Color', 'Estado', 'Precio', 'Stock'],
        'inventario-productos',
        'Inventario de Productos - HILOSdeCALIDAD'
      );

      toast.success('Reporte PDF generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte PDF');
    }
  };

  const handleMassUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const productos = jsonData.map((row: any) => ({
          nombre: row.nombre,
          color: row.color,
          descripcion: row.descripcion || '',
          estado: row.estado as 'En Cono' | 'Sin Cono',
          precio_base: parseFloat(row.precio_base),
          precio_uni: parseFloat(row.precio_uni),
          stock: parseInt(row.stock),
          fecha_ingreso: new Date().toISOString()
        }));

        await SupabaseService.createProductos(productos);
        toast.success(`${productos.length} productos importados correctamente`);
        loadProductos();
      } catch (error) {
        console.error('Error importing products:', error);
        toast.error('Error al importar productos');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    ExportUtils.generateProductTemplate();
    toast.success('Plantilla descargada correctamente');
  };

  // Calcular métricas
  const totalProductos = productos.length;
  const stockTotal = productos.reduce((acc, p) => acc + p.stock, 0);
  const valorInventario = productos.reduce((acc, p) => acc + (p.precio_uni * p.stock), 0);
  const productosAgotados = productos.filter(p => p.stock === 0).length;

  // Datos para gráficos
  const stockPorEstado = productos.reduce((acc: any[], producto) => {
    const existente = acc.find(item => item.name === producto.estado);
    if (existente) {
      existente.value += producto.stock;
    } else {
      acc.push({ name: producto.estado, value: producto.stock });
    }
    return acc;
  }, []);

  const coloresMasVendidos = productos
    .reduce((acc: any[], producto) => {
      const existente = acc.find(item => item.name === producto.color);
      if (existente) {
        existente.value += producto.stock;
      } else {
        acc.push({ name: producto.color, value: producto.stock });
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h2>
          <p className="text-gray-600">Administra tus productos y stock</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Plantilla</span>
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMassUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Upload size={16} />
            <span>Importar</span>
          </button>
          
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

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Productos"
          value={totalProductos.toString()}
          icon={Package}
          color="bg-blue-500"
        />
        <MetricCard
          title="Stock Total"
          value={stockTotal.toString()}
          icon={BarChart3}
          color="bg-green-500"
        />
        <MetricCard
          title="Valor Inventario"
          value={`S/ ${valorInventario.toFixed(2)}`}
          icon={Package}
          color="bg-purple-500"
        />
        <MetricCard
          title="Productos Agotados"
          value={productosAgotados.toString()}
          icon={Package}
          color="bg-red-500"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Stock por Estado"
          data={stockPorEstado}
          type="pie"
        />
        <ChartCard
          title="Colores con Mayor Stock"
          data={coloresMasVendidos}
          type="bar"
        />
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Productos</h3>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={() => {
                  resetForm();
                  setShowTypeModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Nuevo Producto</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProductos.map(producto => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500">{producto.descripcion}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.color}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      producto.estado === 'Por Hilandar' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : producto.estado === 'Conos Devanados'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {producto.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.cantidad || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.estado === 'Por Hilandar' ? 'En proceso...' : `S/ ${producto.precio_base.toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.estado === 'Por Hilandar' ? 'En proceso...' : `S/ ${producto.precio_uni.toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.estado === 'Por Hilandar' ? (
                      'En proceso...'
                    ) : (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        producto.stock > 10 ? 'bg-green-100 text-green-800' :
                        producto.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {producto.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(producto)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(producto)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Selección de Tipo */}
      <Modal
        isOpen={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="Seleccionar Tipo de Producto"
        size="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setShowTypeModal(false);
              setShowTintoreriaModal(true);
            }}
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Package className="mx-auto h-12 w-12 text-blue-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Tintorería</h3>
            <p className="text-sm text-gray-600 mt-2">Productos para procesar en hilandería</p>
          </button>
          
          <button
            onClick={() => {
              setShowTypeModal(false);
              setShowHilanderiaModal(true);
            }}
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
          >
            <BarChart3 className="mx-auto h-12 w-12 text-green-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Hilandería</h3>
            <p className="text-sm text-gray-600 mt-2">Procesar productos de tintorería</p>
          </button>
        </div>
      </Modal>

      {/* Modal de Tintorería */}
      <Modal
        isOpen={showTintoreriaModal}
        onClose={() => {
          setShowTintoreriaModal(false);
          resetForm();
        }}
        title="Nuevo Producto - Tintorería"
        size="md"
      >
        <form onSubmit={handleTintoreriaSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              value={tintoreriaData.nombre}
              onChange={(e) => setTintoreriaData({ ...tintoreriaData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="text"
              required
              value={tintoreriaData.color}
              onChange={(e) => setTintoreriaData({ ...tintoreriaData, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input
              type="number"
              required
              value={tintoreriaData.cantidad}
              onChange={(e) => setTintoreriaData({ ...tintoreriaData, cantidad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
            <textarea
              value={tintoreriaData.descripcion}
              onChange={(e) => setTintoreriaData({ ...tintoreriaData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowTintoreriaModal(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Producto
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Hilandería */}
      <Modal
        isOpen={showHilanderiaModal}
        onClose={() => setShowHilanderiaModal(false)}
        title="Hilandería - Productos Por Hilandar"
        size="xl"
      >
        {porHilandarProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Sin Inventario</p>
            <p className="text-sm text-gray-400 mt-2">No hay productos pendientes de hilandería</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {porHilandarProducts.map(producto => (
                  <tr 
                    key={producto.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onDoubleClick={() => {
                      setSelectedProduct(producto);
                      setShowHilanderiaDetailModal(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500">{producto.descripcion}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {producto.color}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        {producto.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p>Haga doble clic en una fila para procesar el producto</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Detalle de Hilandería */}
      <Modal
        isOpen={showHilanderiaDetailModal}
        onClose={() => {
          setShowHilanderiaDetailModal(false);
          resetForm();
        }}
        title={`Procesar: ${selectedProduct?.nombre} - ${selectedProduct?.color}`}
        size="md"
      >
        {selectedProduct && (
          <form onSubmit={handleHilanderiaSubmit} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Producto Seleccionado</h4>
              <p className="text-sm text-gray-600">Cantidad disponible: {selectedProduct.cantidad}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={hilanderiaData.estado}
                onChange={(e) => setHilanderiaData({ ...hilanderiaData, estado: e.target.value as 'Conos Devanados' | 'Conos Veteados' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Conos Devanados">Conos Devanados</option>
                <option value="Conos Veteados">Conos Veteados</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Procesar</label>
              <input
                type="number"
                required
                min="1"
                max={selectedProduct.cantidad}
                value={hilanderiaData.cantidad}
                onChange={(e) => handleCantidadChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Máximo: ${selectedProduct.cantidad}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Cantidad disponible: {selectedProduct.cantidad}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={hilanderiaData.precio_base}
                onChange={(e) => handlePrecioBaseChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese el precio base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={hilanderiaData.precio_uni}
                onChange={(e) => setHilanderiaData({ ...hilanderiaData, precio_uni: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Se llena automáticamente con el precio base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock (Calculado automáticamente)</label>
              <input
                type="number"
                min="0"
                required
                value={hilanderiaData.stock}
                onChange={(e) => setHilanderiaData({ ...hilanderiaData, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Se calcula como cantidad ÷ 2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Stock calculado: {hilanderiaData.cantidad ? Math.floor(parseInt(hilanderiaData.cantidad) / 2) : 0}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowHilanderiaDetailModal(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Agregar Productos
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Continuar Procesando */}
      <Modal
        isOpen={showContinueModal}
        onClose={() => setShowContinueModal(false)}
        title="¿Continuar procesando?"
        size="md"
      >
        <div className="text-center py-4">
          <Package className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <p className="text-gray-700 mb-6">¿Desea seguir adicionando más productos o terminar el proceso?</p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleFinishProcessing}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Terminar
            </button>
            <button
              onClick={handleContinueProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Adicionar Más
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setProductToDelete(null);
        }}
        title="Confirmar Eliminación"
        size="md"
      >
        <div className="text-center py-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Está seguro?</h3>
          <p className="text-gray-600 mb-6">
            Esta acción eliminará permanentemente el producto "{productToDelete?.nombre}" y no se puede deshacer.
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setProductToDelete(null);
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Producto */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                required
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'Por Hilandar' | 'Conos Devanados' | 'Conos Veteados' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Por Hilandar">Por Hilandar</option>
              <option value="Conos Devanados">Conos Devanados</option>
              <option value="Conos Veteados">Conos Veteados</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base</label>
              <input
                type="number"
                step="0.01"
                required={formData.estado !== 'Por Hilandar'}
                value={formData.precio_base}
                onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={formData.estado === 'Por Hilandar'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
              <input
                type="number"
                step="0.01"
                required={formData.estado !== 'Por Hilandar'}
                value={formData.precio_uni}
                onChange={(e) => setFormData({ ...formData, precio_uni: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={formData.estado === 'Por Hilandar'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                required={formData.estado !== 'Por Hilandar'}
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={formData.estado === 'Por Hilandar'}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingProduct ? 'Actualizar' : 'Crear'} Producto
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventario;