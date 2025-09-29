import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, User, Package, Receipt, Search, X, Filter, ShoppingBag, Eraser } from 'lucide-react';
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
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [carritoTemporal, setCarritoTemporal] = useState<CarritoItem[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
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

  useEffect(() => {
    filterProductos();
  }, [productos, searchProduct]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosData, productosData] = await Promise.all([
        SupabaseService.getUsuarios(),
        SupabaseService.getProductosVendibles()
      ]);

      setUsuarios(usuariosData);
      setProductos(productosData);
      setFilteredProductos(productosData);
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

  const filterProductos = () => {
    if (!searchProduct.trim()) {
      setFilteredProductos(productos);
      return;
    }

    const filtered = productos.filter(producto =>
      producto.nombre.toLowerCase().includes(searchProduct.toLowerCase()) ||
      producto.color.toLowerCase().includes(searchProduct.toLowerCase()) ||
      producto.estado.toLowerCase().includes(searchProduct.toLowerCase()) ||
      producto.descripcion?.toLowerCase().includes(searchProduct.toLowerCase())
    );
    
    setFilteredProductos(filtered);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const nuevoUsuario = await SupabaseService.createUsuario(newUserData);
      
      setUsuarios([nuevoUsuario, ...usuarios]);
      setUsuarioSeleccionado(nuevoUsuario);
      
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

  const agregarAlCarritoTemporal = (producto: Producto) => {
    if (producto.stock <= 0) {
      toast.error('Producto sin stock');
      return;
    }

    const itemExistente = carritoTemporal.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      if (itemExistente.cantidad >= producto.stock) {
        toast.error('No hay suficiente stock');
        return;
      }
      
      setCarritoTemporal(carritoTemporal.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarritoTemporal([...carritoTemporal, { producto, cantidad: 1 }]);
    }
    
    toast.success('Producto agregado a la selección');
  };

  const actualizarCantidadTemporal = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarritoTemporal(productoId);
      return;
    }

    const producto = productos.find(p => p.id === productoId);
    if (producto && nuevaCantidad > producto.stock) {
      toast.error('No hay suficiente stock');
      return;
    }

    setCarritoTemporal(carritoTemporal.map(item =>
      item.producto.id === productoId
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarritoTemporal = (productoId: string) => {
    setCarritoTemporal(carritoTemporal.filter(item => item.producto.id !== productoId));
  };

  const confirmarAgregarProductos = () => {
    if (carritoTemporal.length === 0) {
      toast.error('No hay productos seleccionados');
      return;
    }

    // Agregar productos del carrito temporal al carrito principal
    const nuevoCarrito = [...carrito];
    
    carritoTemporal.forEach(itemTemporal => {
      const itemExistente = nuevoCarrito.find(item => item.producto.id === itemTemporal.producto.id);
      
      if (itemExistente) {
        itemExistente.cantidad += itemTemporal.cantidad;
      } else {
        nuevoCarrito.push(itemTemporal);
      }
    });

    setCarrito(nuevoCarrito);
    setCarritoTemporal([]);
    setShowProductModal(false);
    setSearchProduct('');
    
    toast.success(`${carritoTemporal.length} producto(s) agregado(s) al carrito`);
  };

  const cancelarSeleccion = () => {
    setCarritoTemporal([]);
    setShowProductModal(false);
    setSearchProduct('');
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

  const limpiarTodo = () => {
    setCarrito([]);
    setUsuarioSeleccionado(null);
    setCarritoTemporal([]);
    toast.success('Carrito y cliente limpiados');
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + (item.producto.precio_uni * item.cantidad), 0);
  };

  const calcularTotalTemporal = () => {
    return carritoTemporal.reduce((total, item) => total + (item.producto.precio_uni * item.cantidad), 0);
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

      await ExportUtils.generateSalePDF(ventaCreada, usuarioSeleccionado, carrito.map(item => ({
        ...detalles.find(d => d.id_producto === item.producto.id)!,
        producto: item.producto
      })));

      setCarrito([]);
      setUsuarioSeleccionado(null);
      
      const productosActualizados = await SupabaseService.getProductosVendibles();
      setProductos(productosActualizados);
      setFilteredProductos(productosActualizados);

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
          </div>

          {/* Carrito Principal */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Carrito de Compras ({carrito.length})
                </h3>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Agregar</span>
                  </button>
                  
                  <button
                    onClick={limpiarTodo}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <Eraser size={16} />
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {carrito.map(item => (
                  <div key={item.producto.id} className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.producto.nombre}</p>
                        <p className="text-sm text-gray-600">{item.producto.color}</p>
                        <p className="text-sm text-blue-600 font-semibold">S/ {item.producto.precio_uni.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => eliminarDelCarrito(item.producto.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-12 text-center font-medium">{item.cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        S/ {(item.producto.precio_uni * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {carrito.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    <ShoppingBag className="mx-auto h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-lg font-medium">Carrito vacío</p>
                    <p className="text-sm">Haz clic en "Agregar" para seleccionar productos</p>
                  </div>
                )}
              </div>
              
              {carrito.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      S/ {calcularTotal().toFixed(2)}
                    </span>
                  </div>
                  
                  <button
                    onClick={procesarVenta}
                    disabled={!usuarioSeleccionado || procesandoVenta}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-semibold"
                  >
                    {procesandoVenta ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="h-5 w-5" />
                        <span>Procesar Venta</span>
                      </>
                    )}
                  </button>
                </div>
              )}
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
              <span>Nuevo</span>
            </button>
          </div>
          
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
                const value = e.target.value.replace(/\D/g, '');
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
                const value = e.target.value.replace(/\D/g, '');
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

      {/* Modal de Productos Disponibles */}
      <Modal
        isOpen={showProductModal}
        onClose={cancelarSeleccion}
        title="Productos Disponibles"
        size="xl"
      >
        <div className="space-y-4">
          {/* Filtro de búsqueda */}
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre, color, estado o descripción..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>

          {/* Lista de productos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
            {filteredProductos.map(producto => (
              <div key={producto.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{producto.nombre}</h4>
                    <p className="text-sm text-gray-600">{producto.color}</p>
                    <p className="text-xs text-gray-500">{producto.estado}</p>
                    {producto.descripcion && (
                      <p className="text-xs text-gray-400 mt-1">{producto.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-blue-600">S/ {producto.precio_uni.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Stock: {producto.stock}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => agregarAlCarritoTemporal(producto)}
                  disabled={producto.stock <= 0}
                  className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {producto.stock <= 0 ? 'Sin Stock' : 'Seleccionar'}
                </button>
              </div>
            ))}
          </div>

          {filteredProductos.length === 0 && (
            <div className="text-center py-8">
              <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}

          {/* Vista previa de productos seleccionados */}
          {carritoTemporal.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Productos Seleccionados ({carritoTemporal.length})</h4>
              
              <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
                {carritoTemporal.map(item => (
                  <div key={item.producto.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.producto.nombre}</p>
                      <p className="text-xs text-gray-600">{item.producto.color}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => actualizarCantidadTemporal(item.producto.id, item.cantidad - 1)}
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidadTemporal(item.producto.id, item.cantidad + 1)}
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold">S/ {(item.producto.precio_uni * item.cantidad).toFixed(2)}</p>
                    </div>
                    
                    <button
                      onClick={() => eliminarDelCarritoTemporal(item.producto.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mb-4 p-3 bg-blue-50 rounded-lg">
                <span className="font-semibold text-gray-900">Total Seleccionado:</span>
                <span className="text-xl font-bold text-blue-600">
                  S/ {calcularTotalTemporal().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={cancelarSeleccion}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarAgregarProductos}
              disabled={carritoTemporal.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Agregar Productos al Carrito ({carritoTemporal.length})
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Ventas;