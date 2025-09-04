import React from 'react';
import { Link } from '@tanstack/react-router';
import {
    HomeIcon, ChartBarIcon, BeakerIcon, DocumentPlusIcon, FireIcon, BoltIcon,
    AdjustmentsHorizontalIcon, BellAlertIcon, WrenchScrewdriverIcon, ArchiveBoxIcon,
    BuildingOfficeIcon, UsersIcon, Cog6ToothIcon, SunIcon, DocumentTextIcon, CpuChipIcon, ShieldCheckIcon, UserCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import the Button component to resolve the 'Cannot find name' error.
import { Button } from './ui/Button';


interface NavSectionProps {
    title: string;
    children: React.ReactNode;
}

const NavSection: React.FC<NavSectionProps> = ({ title, children }) => (
    <div>
        <h3 className="px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">{title}</h3>
        <div className="mt-2 space-y-1">
            {children}
        </div>
    </div>
);


const NavLink: React.FC<{ to: string; icon: React.FC<any>; label: string; }> = ({ to, icon: Icon, label }) => {
    return (
        <Link
            to={to}
            className="flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200"
            activeProps={{ className: 'bg-primary/10 text-primary' }}
            inactiveProps={{ className: 'text-text-secondary hover:bg-surface hover:text-text-primary' }}
        >
            <Icon className="h-5 w-5 mr-3" />
            <span>{label}</span>
        </Link>
    );
};


const Sidebar: React.FC = () => {
    const { publicProfile, signOut } = useAuth();
    const iconClass = "h-5 w-5 mr-3";

    return (
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-20 lg:w-64 bg-background border-r border-border">
            <div className="flex items-center h-16 px-6 border-b border-border">
                <ShieldCheckIcon className="h-8 w-8 text-primary" />
                <h1 className="ml-2 text-lg font-bold text-primary">BioGas Ops</h1>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                 <NavSection title="Operaciones">
                    <NavLink to="/" icon={HomeIcon} label="Dashboard" />
                    <NavLink to="/inputs" icon={DocumentPlusIcon} label="Ingresos" />
                    <NavLink to="/feeding" icon={CpuChipIcon} label="Alimentación" />
                 </NavSection>

                 <NavSection title="Monitoreo">
                    <NavLink to="/graphs" icon={ChartBarIcon} label="Gráficos" />
                    <NavLink to="/gas-quality" icon={FireIcon} label="Calidad Biogás" />
                    <NavLink to="/energy" icon={BoltIcon} label="Energía" />
                    <NavLink to="/chp" icon={AdjustmentsHorizontalIcon} label="Control CHP" />
                    <NavLink to="/pfq" icon={DocumentTextIcon} label="FOS/TAC" />
                    <NavLink to="/laboratory" icon={BeakerIcon} label="Laboratorio" />
                    <NavLink to="/environment" icon={SunIcon} label="Ambiente" />
                    <NavLink to="/alarms" icon={BellAlertIcon} label="Alarmas" />
                 </NavSection>

                <NavSection title="Gestión">
                    <NavLink to="/maintenance" icon={WrenchScrewdriverIcon} label="Mantenimiento" />
                    <NavLink to="/stock" icon={ArchiveBoxIcon} label="Stock" />
                    <NavLink to="/management" icon={BuildingOfficeIcon} label="Administración" />
                    <NavLink to="/user-management" icon={UsersIcon} label="Usuarios" />
                </NavSection>
            </nav>
             <div className="border-t border-border p-4">
                <Link
                    to="/profile-settings"
                    className="flex items-center w-full p-2 rounded-md text-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                >
                    <UserCircleIcon className="h-8 w-8 text-text-secondary mr-2" />
                    <div className="flex-1">
                        <p className="font-semibold text-text-primary">{publicProfile?.nombres || 'Usuario'}</p>
                        <p className="text-xs">Ver Perfil</p>
                    </div>
                </Link>
                 <Button variant="link" onClick={signOut} className="w-full justify-start text-sm text-error mt-2">
                    Cerrar Sesión
                </Button>
            </div>
        </aside>
    );
};

export default Sidebar;