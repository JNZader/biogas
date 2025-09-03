
import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';
// FIX: Updated package name from '@tanstack/router' to '@tanstack/react-router'.
import { Link } from '@tanstack/react-router';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="bg-surface shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <span className="text-sm text-text-secondary">BioGas Corp</span>
            <h1 className="text-xl font-bold text-primary">{title}</h1>
          </div>
          <Link 
            to="/profile-settings" 
            className="flex items-center space-x-2 p-2 rounded-md hover:bg-background transition-colors"
            aria-label="Ir a configuración de perfil de Juan Pérez"
          >
             <span className="text-sm text-text-secondary hidden sm:block">Juan Pérez</span>
            <UserCircleIcon className="h-8 w-8 text-text-secondary" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
