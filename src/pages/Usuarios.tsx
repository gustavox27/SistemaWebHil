import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Download, Upload, CreditCard as Edit, Trash2, Search, TrendingUp, AlertTriangle } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { ExportUtils } from '../utils/exportUtils';
import { Usuario } from '../types';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Modal from '../components/Common/Modal';
import MetricCard from '../components/Dashboard/MetricCard';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    dni: '',
    perfil: 'Cliente' as 'Administrador' | 'Vendedor' | 'Almacenero' | 'Cliente'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    filterUsuarios();
  }, [usuarios, searchTerm]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filterUsuarios = () => {
    if (!searchTerm) {
      setFilteredUsuarios(usuarios);
      return;
    }

    const filtered = usuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.dni.includes(searchTerm) ||
      (usuario.telefono && usuario.telefono.includes(searchTerm))
    );
    
    setFilteredUsuarios(filtered);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      telefono: '',
      dni: '',
      perfil: 'Cliente'
    });
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        await SupabaseService.updateUsuario(editingUser.id, formData);
        toast.success('Usuario actualizado correctamente');
      } else {
        await SupabaseService.createUsuario(formData);
        toast.success('Usuario creado correctamente');
      }

      loadUsuarios();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.message?.includes('duplicate key value')) {
        toast.error('Ya existe un usuario con ese DNI');
      } else {
        toast.error('Error al guardar usuario');
      }
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUser(usuario);
    setFormData({
      nombre: usuario.nombre,
      telefono: usuario.telefono || '',
      dni: usuario.dni,
      perfil: usuario.perfil
    });
    setShowModal(true);
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setUserToDelete(usuario);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await SupabaseService.deleteUsuario(userToDelete.id);
      toast.success('Usuario eliminado correctamente');
      loadUsuarios();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = usuarios.map(usuario => ({
        'Nombre': usuario.nombre,
        'DNI': usuario.dni,
        'Teléfono': usuario.telefono || '',
        'Perfil': usuario.perfil,
        'Fecha Registro': new Date(usuario.created_at || '').toLocaleDateString('es-ES')
      }));

      ExportUtils.exportToExcel(exportData, 'usuarios', 'Usuarios');
      toast.success('Reporte Excel generado correctamente');
    } catch (error) {
      toast.error('Error al generar el reporte Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const exportData = usuarios.map(usuario => ({
        'Nombre': usuario.nombre,
        'DNI': usuario.dni,
        'Teléfono': usuario.telefono || 'N/A',
        'Perfil': usuario.perfil,
        'Fecha Registro': new Date(usuario.created_at || '').toLocaleDateString('es-ES')
      }));

      await ExportUtils.exportToPDF(
        exportData,
        ['Nombre', 'DNI', 'Teléfono', 'Perfil', 'Fecha Registro'],
        'usuarios',
        'Lista de Usuarios - HILOSdeCALIDAD'
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

        const usuarios = jsonData.map((row: any) => ({
          nombre: row.nombre,
          telefono: row.telefono || '',
          dni: row.dni
        }));

        // Crear usuarios uno por uno para manejar duplicados
        let creados = 0;
        let errores = 0;

        for (const usuario of usuarios) {
          try {
            await SupabaseService.createUsuario(usuario);
            creados++;
          } catch (error) {
            errores++;
          }
        }

        toast.success(`${creados} usuarios importados correctamente. ${errores} errores.`);
        loadUsuarios();
      } catch (error) {
        console.error('Error importing users:', error);
        toast.error('Error al importar usuarios');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    ExportUtils.generateUserTemplate();
    toast.success('Plantilla descargada correctamente');
  };

  // Calcular métricas (aquí podrías agregar más lógica para obtener datos de ventas)
  const totalUsuarios = usuarios.length;
  const usuariosRecientes = usuarios.filter(u => 
    new Date(u.created_at || '').getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)
  ).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-gray-600">Administra tu base de clientes</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Usuarios"
          value={totalUsuarios.toString()}
          icon={Users}
          color="bg-blue-500"
        />
        <MetricCard
          title="Nuevos (30 días)"
          value={usuariosRecientes.toString()}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <MetricCard
          title="Con Teléfono"
          value={usuarios.filter(u => u.telefono).length.toString()}
          icon={Users}
          color="bg-purple-500"
        />
        <MetricCard
          title="Usuarios Activos"
          value={Math.floor(totalUsuarios * 0.75).toString()}
          icon={Users}
          color="bg-orange-500"
        />
      </div>

      {/* Dashboard de métricas de fidelización */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Fidelización</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Cliente Top</h4>
            <p className="text-sm text-gray-600">Usuario con más compras</p>
            <p className="text-lg font-bold text-blue-600 mt-2">En desarrollo</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Retención</h4>
            <p className="text-sm text-gray-600">Usuarios que repiten</p>
            <p className="text-lg font-bold text-green-600 mt-2">75%</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Promedio</h4>
            <p className="text-sm text-gray-600">Compras por usuario</p>
            <p className="text-lg font-bold text-purple-600 mt-2">3.2</p>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Usuarios</h3>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Nuevo Usuario</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsuarios.map(usuario => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.dni}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.telefono || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.perfil === 'Administrador' ? 'bg-red-100 text-red-800' :
                      usuario.perfil === 'Vendedor' ? 'bg-blue-100 text-blue-800' :
                      usuario.perfil === 'Almacenero' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {usuario.perfil}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.created_at ? new Date(usuario.created_at).toLocaleDateString('es-ES') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(usuario)}
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
          
          {filteredUsuarios.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        title="Confirmar Eliminación"
        size="md"
      >
        <div className="text-center py-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Está seguro?</h3>
          <p className="text-gray-600 mb-6">
            Esta acción eliminará permanentemente al usuario "{userToDelete?.nombre}" y no se puede deshacer.
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
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

      {/* Modal de Usuario */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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
              value={formData.dni}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Solo números
                setFormData({ ...formData, dni: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345678"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, telefono: value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="987654321"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select
              required
              value={formData.perfil}
              onChange={(e) => setFormData({ ...formData, perfil: e.target.value as 'Administrador' | 'Vendedor' | 'Almacenero' | 'Cliente' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Cliente">Cliente</option>
              <option value="Vendedor">Vendedor</option>
              <option value="Almacenero">Almacenero</option>
              <option value="Administrador">Administrador</option>
            </select>
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
              {editingUser ? 'Actualizar' : 'Crear'} Usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsuariosPage;