import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">{title}</h1>
        
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar size={16} />
            <span className="capitalize">{currentDate}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock size={16} />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;