import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import Page from '../components/Page';
import { ChevronRightIcon, UserCircleIcon, Cog6ToothIcon, ChevronDownIcon, UsersIcon } from '@heroicons/react/24/solid';
import { 
    FireIcon, BeakerIcon, DocumentTextIcon, SunIcon, WrenchScrewdriverIcon, 
    ArchiveBoxIcon, CpuChipIcon, BoltIcon, AdjustmentsHorizontalIcon, ChartBarIcon, 
    BuildingOfficeIcon, DocumentPlusIcon, BellAlertIcon, Cog8ToothIcon
} from '@heroicons/react/24/outline';
import { create } from 'zustand';
import { useAuthorization } from '../hooks/useAuthorization';

// --- Co-located State Management ---
interface MorePageState {
    openSections: Record<string, boolean>;
    toggleSection: (title: string) => void;
}

const useMorePageStore = create<MorePageState>((set) => ({
    openSections: {
        'Operaciones Diarias': true,
        'Análisis y Reportes': false,
        'Gestión del Sistema': false,
    },
    toggleSection: (title) => set((state) => ({
        openSections: {
            ...state.openSections,
            [title]: !state.openSections[title],
        }
    })),
}));


// --- Feature Components ---
interface MenuItem {
    to: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}

const MenuLink: React.FC<MenuItem> = ({ to, icon, title, subtitle }) => (
    <Link to={to} className="flex items-center p-3 bg-surface rounded-lg hover:bg-background transition-colors duration-200 ml-4 border-l-2 border-primary/20">
        <div className="p-2 bg-primary/10 rounded-lg mr-4 text-primary">
            {icon}
        </div>
        <div className="flex-grow">
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary">{subtitle}</p>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
    </Link>
);

const AccordionSection: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    isOpen: boolean;
    onToggle: () => void;
}> = ({ title, children, isOpen, onToggle }) => {
    return (
        <div className="bg-surface rounded-lg shadow-sm">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 text-left font-semibold text-text-primary"
                aria-expanded={isOpen}
            >
                {title}
                <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 pt-0 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};


const MorePage: React.FC = () => {
    const { openSections, toggleSection } = useMorePageStore();
    const { canAccess, role } = useAuthorization();
    const iconClass = "h-6 w-6";

    const allMenuItems = useMemo(() => ({
        dailyOps: [
            { to: '/inputs', icon: <DocumentPlusIcon className={iconClass}/>, title: 'Ingreso de Sustratos', subtitle: 'Registrar la entrada de camiones' },
            { to: '/feeding', icon: <CpuChipIcon className={iconClass}/>, title: 'Alimentación', subtitle: 'Registrar y optimizar la dieta' },
            { to: '/gas-quality', icon: <FireIcon className={iconClass}/>, title: 'Calidad de Biogás', subtitle: 'Registrar mediciones diarias' },
            { to: '/energy', icon: <BoltIcon className={iconClass}/>, title: 'Registro de Energía', subtitle: 'Generación y consumo' },
            { to: '/chp', icon: <AdjustmentsHorizontalIcon className={iconClass}/>, title: 'Control CHP', subtitle: 'Gestión de potencia del motor' },
        ],
        analysis: [
            { to: '/graphs', icon: <ChartBarIcon className={iconClass}/>, title: 'Gráficos y Tendencias', subtitle: 'Visualizar todas las métricas' },
            { to: '/alarms', icon: <BellAlertIcon className={iconClass}/>, title: 'Alarmas', subtitle: 'Historial de eventos y alarmas' },
            { to: '/laboratory', icon: <BeakerIcon className={iconClass}/>, title: 'Laboratorio', subtitle: 'Análisis de sustratos y digestato' },
            { to: '/pfq', icon: <DocumentTextIcon className={iconClass}/>, title: 'Parámetros Físico-Químicos', subtitle: 'Control de estabilidad (FOS/TAC)' },
            { to: '/environment', icon: <SunIcon className={iconClass}/>, title: 'Ambiente', subtitle: 'Monitoreos y cumplimiento' },
        ],
        management: [
            { to: '/maintenance', icon: <WrenchScrewdriverIcon className={iconClass}/>, title: 'Mantenimiento', subtitle: 'Tareas y checklists de equipos' },
            { to: '/stock', icon: <ArchiveBoxIcon className={iconClass}/>, title: 'Stock de Repuestos', subtitle: 'Inventario de repuestos' },
            { to: '/management', icon: <BuildingOfficeIcon className={iconClass}/>, title: 'Administración', subtitle: 'Gestionar sustratos, proveedores, etc.' },
            { to: '/user-management', icon: <UsersIcon className={iconClass}/>, title: 'Gestión de Usuarios', subtitle: 'Invitar y administrar usuarios' },
            { to: '/setup', icon: <Cog6ToothIcon className={iconClass}/>, title: 'Configuración de Planta', subtitle: 'Configurar parámetros de la planta' },
            { to: '/error-detective', icon: <Cog8ToothIcon className={iconClass}/>, title: 'AI Error Detective', subtitle: 'Analizar errores del sistema' },
        ],
    }), [iconClass]);
    
    const visibleSections = useMemo(() => [
        { title: 'Operaciones Diarias', items: allMenuItems.dailyOps.filter(item => canAccess(item.to)) },
        { title: 'Análisis y Reportes', items: allMenuItems.analysis.filter(item => canAccess(item.to)) },
        { title: 'Gestión del Sistema', items: allMenuItems.management.filter(item => canAccess(item.to)) },
    ].filter(section => section.items.length > 0), [canAccess, allMenuItems]);


    return (
        <Page>
            <div className="flex items-center p-4 bg-surface rounded-lg shadow-sm mb-6">
                <UserCircleIcon className="h-16 w-16 text-border mr-4"/>
                <div className="flex-grow">
                    <h2 className="text-xl font-bold text-text-primary">Juan Pérez</h2>
                    <p className="text-text-secondary">{role || 'Operador de Planta'}</p>
                </div>
                <Link to="/profile-settings" className="p-2 rounded-full hover:bg-background">
                    <Cog6ToothIcon className="h-6 w-6 text-text-secondary"/>
                </Link>
            </div>

            <div className="space-y-4">
                {visibleSections.map(section => (
                    <AccordionSection 
                        key={section.title}
                        title={section.title} 
                        isOpen={openSections[section.title]}
                        onToggle={() => toggleSection(section.title)}
                    >
                        {section.items.map(item => <MenuLink key={item.title} {...item} />)}
                    </AccordionSection>
                ))}
            </div>
        </Page>
    );
};

export default MorePage;
