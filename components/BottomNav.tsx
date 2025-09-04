import React from 'react';
// FIX: Updated package name from '@tanstack/router' to '@tanstack/react-router'.
import { Link } from '@tanstack/react-router';
import { HomeIcon, ChartBarIcon, BeakerIcon, DocumentPlusIcon, Bars3Icon } from '@heroicons/react/24/solid';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center w-full transition-colors duration-200"
      activeProps={{ className: 'text-primary' }}
      inactiveProps={{ className: 'text-text-secondary' }}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
};

const BottomNav: React.FC = () => {
  const iconClass = "h-6 w-6 mb-1";
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border shadow-t-lg flex justify-around items-center z-10">
      <NavItem to="/" label="Inicio" icon={<HomeIcon className={iconClass} aria-hidden="true" />} />
      <NavItem to="/graphs" label="Gráficos" icon={<ChartBarIcon className={iconClass} aria-hidden="true" />} />
      <NavItem to="/feeding" label="Alimentación" icon={<BeakerIcon className={iconClass} aria-hidden="true" />} />
      <NavItem to="/inputs" label="Ingresos" icon={<DocumentPlusIcon className={iconClass} aria-hidden="true" />} />
      <NavItem to="/more" label="Más" icon={<Bars3Icon className={iconClass} aria-hidden="true" />} />
    </nav>
  );
};

export default BottomNav;