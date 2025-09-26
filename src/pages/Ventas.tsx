import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, User, Package, Receipt, Search } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { ExportUtils } from '../utils/exportUtils';
import { Usuario, Producto, CarritoItem } from '../types';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Modal from '../components/Common/Modal';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const Ventas: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [newUserData, setNewUserData] = useState({
    nombre: '',
    telefono: '',
    dni: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsuarios();
  }, [usuarios, searchUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosData, productosData] = await Promise.all([
        SupabaseService.getUsuarios(),
        SupabaseService.getProductosVendibles()
      ]);

      setUsuarios(usuariosData);
      setProductos(productosData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filterUsuarios = () => {
    if (!searchUser.trim()) {
      setFilteredUsuarios(usuarios);
      return;
    }

    const filtered = usuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(searchUser.toLowerCase()) ||
      usuario.dni.includes(searchUser) ||
      (usuario.telefono && usuario.telefono.includes(searchUser))
    );
    
    setFilteredUsuarios(filtered);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const nuevoUsuario = await SupabaseService.createUsuario(newUserData);
      
      // Actualizar la lista de usuarios
      setUsuarios([nuevoUsuario, ...usuarios]);
      
      // Seleccionar automáticamente el nuevo usuario
      setUsuarioSeleccionado(nuevoUsuario);
      
      // Limpiar formulario y cerrar modales
      setNewUserData({ nombre: '', telefono: '', dni: '' });
      setShowAddUserModal(false);
      setShowUserModal(false);
      
      toast.success('Cliente creado y seleccionado correctamente');
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('duplicate key value')) {
        toast.error('Ya existe un cliente con ese DNI');
      } else {
        toast.error('Error al crear cliente');
      }
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    if (producto.stock <= 0) {
      toast.error('Producto sin stock');
      return;
    }

    const itemExistente = carrito.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      if (itemExistente.cantidad >= producto.stock) {
        toast.error('No hay suficiente stock');
        return;
      }
      
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { producto, cantidad: 1 }]);
    }
    
    toast.success('Producto agregado al carrito');
  };

  const actualizarCantidad = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }

    const producto = productos.find(p => p.id === productoId);
    if (producto && nuevaCantidad > producto.stock) {
      toast.error('No hay suficiente stock');
      return;
    }

    setCarrito(carrito.map(item =>
      item.producto.id === productoId
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(item => item.producto.id !== productoId));
    toast.success('Producto eliminado del carrito');
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + (item.producto.precio_uni * item.cantidad), 0);
  };

  const procesarVenta = async () => {
    if (!usuarioSeleccionado) {
      toast.error('Debe seleccionar un cliente');
      return;
    }

    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    try {
      setProcesandoVenta(true);
      
      const total = calcularTotal();
      const codigoQR = uuidv4();
      
      const venta = {
        id_usuario: usuarioSeleccionado.id,
        fecha_venta: new Date().toISOString(),
        total,
        vendedor: 'Freddy STG',
        codigo_qr: codigoQR
      };

      const detalles = carrito.map(item => ({
        id_producto: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_uni,
        subtotal: item.producto.precio_uni * item.cantidad
      }));

      const ventaCreada = await SupabaseService.createVenta(venta, detalles);

      // Generar boleta PDF
      await ExportUtils.generateSalePDF(ventaCreada, usuarioSeleccionado, carrito.map(item => ({
        ...detalles.find(d => d.id_producto === item.producto.id)!,
        producto: item.producto
      })));

      // Limpiar carrito y cliente
      setCarrito([]);
      setUsuarioSeleccionado(null);
      
      // Recargar productos para actualizar stock
      const productosActualizados = await SupabaseService.getProductosVendibles();
      setProductos(productosActualizados);

      toast.success('Venta procesada exitosamente');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error al procesar la venta');
    } finally {
      setProcesandoVenta(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Punto de Venta</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selección de Cliente */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <User className="mr-2 h-5 w-5" />
                Cliente
              </h3>
              
              {usuarioSeleccionado ? (
                <div className="bg-white p-3 rounded-lg border">
                  <p className="font-medium">{usuarioSeleccionado.nombre}</p>
                  <p className="text-sm text-gray-600">DNI: {usuarioSeleccionado.dni}</p>
                  <button
                    onClick={() => setUsuarioSeleccionado(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Cambiar cliente
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Seleccionar Cliente
                </button>
              )}
            </div>

            {/* Carrito */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Carrito ({carrito.length})
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {carrito.map(item => (
                  <div key={item.producto.id} className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{item.producto.nombre}</p>
                        <p className="text-xs text-gray-600">{item.producto.color}</p>
                        <p className="text-xs text-blue-600">S/ {item.producto.precio_uni}</p>
                      </div>
                      <button
                        onClick={() => eliminarDelCarrito(item.producto.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm">{item.cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        S/ {(item.producto.precio_uni * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {carrito.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Package className="mx-auto h-8 w-8 mb-2" />
                    <p>Carrito vacío</p>
                  </div>
                )}
              </div>
              
              {carrito.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      S/ {calcularTotal().toFixed(2)}
                    </span>
                  </div>
                  
                  <button
                    onClick={procesarVenta}
                    disabled={!usuarioSeleccionado || procesandoVenta}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {procesandoVenta ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4" />
                        <span>Procesar Venta</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista de Productos */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Productos Disponibles</h3>
              <button
                onClick={() => setShowProductModal(true)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver Detalles
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {productos.map(producto => (
                <div key={producto.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{producto.nombre}</h4>
                      <p className="text-sm text-gray-600">{producto.color}</p>
                      <p className="text-xs text-gray-500">{producto.estado}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">S/ {producto.precio_uni}</p>
                      <p className="text-xs text-gray-500">Stock: {producto.stock}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => agregarAlCarrito(producto)}
                    disabled={producto.stock <= 0}
                    className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {producto.stock <= 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Selección de Cliente */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSearchUser('');
        }}
        title="Seleccionar Cliente"
        size="lg"
      >
        <div className="space-y-4">
          {/* Filtro de búsqueda */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI o teléfono..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Agregar Cliente</span>
            </button>
          </div>
          
          {/* Lista de usuarios filtrados */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredUsuarios.map(usuario => (
              <div
                key={usuario.id}
                onClick={() => {
                  setUsuarioSeleccionado(usuario);
                  setShowUserModal(false);
                  setSearchUser('');
                }}
                className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <p className="font-medium">{usuario.nombre}</p>
                <p className="text-sm text-gray-600">DNI: {usuario.dni}</p>
                {usuario.telefono && (
                  <p className="text-sm text-gray-600">Tel: {usuario.telefono}</p>
                )}
              </div>
            ))}
            
            {filteredUsuarios.length === 0 && searchUser && (
              <div className="text-center py-8">
                <User className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-500">No se encontraron clientes</p>
                <p className="text-sm text-gray-400">Intenta con otros términos de búsqueda</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Agregar Cliente */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setNewUserData({ nombre: '', telefono: '', dni: '' });
        }}
        title="Agregar Nuevo Cliente"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={newUserData.nombre}
              onChange={(e) => setNewUserData({ ...newUserData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingrese el nombre completo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
            <input
              type="text"
              required
              maxLength={8}
              value={newUserData.dni}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Solo números
                setNewUserData({ ...newUserData, dni: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345678"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
            <input
              type="text"
              value={newUserData.telefono}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Solo números
                setNewUserData({ ...newUserData, telefono: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="987654321"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddUserModal(false);
                setNewUserData({ nombre: '', telefono: '', dni: '' });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Cliente
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalles de Productos - sin cambios */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title="Detalles de Productos"
        size="xl"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productos.map(producto => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {producto.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.color}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.estado}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    S/ {producto.precio_uni}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      producto.stock > 10 ? 'bg-green-100 text-green-800' :
                      producto.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {producto.stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default Ventas;