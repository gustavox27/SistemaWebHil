import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Inventario from './pages/Inventario';
import Historial from './pages/Historial';
import UsuariosPage from './pages/Usuarios';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const getPageTitle = () => {
    const titles: { [key: string]: string } = {
      dashboard: 'Dashboard',
      ventas: 'Punto de Venta',
      inventario: 'Inventario',
      historial: 'Historial de Ventas',
      usuarios: 'Gestión de Usuarios'
    };
    return titles[currentPage] || 'HILOSdeCALIDAD';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'ventas':
        return <Ventas />;
      case 'inventario':
        return <Inventario />;
      case 'historial':
        return <Historial />;
      case 'usuarios':
        return <UsuariosPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#4AED50',
              secondary: '#FFFAEE',
            },
          },
        }}
      />
      
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header title={getPageTitle()} />
        
        <main className="flex-1 overflow-y-auto p-6 lg:ml-0">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;