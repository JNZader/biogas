import React, { useEffect } from 'react';
// FIX: Updated package name from '@tanstack/router' to '@tanstack/react-router'.
import { Outlet, useRouterState } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { useThemeStore } from './stores/themeStore';
import { SupabaseDataProvider } from './contexts/SupabaseContext';
import { AuthProvider } from './contexts/AuthContext.tsx';
// FIX: Import 'cn' utility function to resolve 'Cannot find name 'cn'' error.
import { cn } from './lib/utils';

const pathTitleMap: { [key: string]: string } = {
  '/': 'Dashboard',
  '/login': 'Iniciar Sesión',
  '/forgot-password': 'Recuperar Contraseña',
  '/update-password': 'Actualizar Contraseña',
  '/graphs': 'Gráficos',
  '/feeding': 'Alimentación',
  '/inputs': 'Ingresos',
  '/gas-quality': 'Calidad de Biogás',
  '/laboratory': 'Laboratorio',
  '/pfq': 'FOS/TAC y Aditivos',
  '/environment': 'Monitoreo Ambiental',
  '/energy': 'Registro de Energía',
  '/chp': 'Control CHP',
  '/maintenance': 'Mantenimiento',
  '/stock': 'Stock de Repuestos',
  '/more': 'Más Opciones',
  '/profile-settings': 'Configuración de Perfil',
  '/setup': 'Configuración Inicial',
  '/management': 'Administración',
  '/alarms': 'Alarmas',
  '/user-management': 'Gestión de Usuarios',
  '/change-password': 'Cambiar Contraseña',
};

const getPageTitle = (pathname: string) => pathTitleMap[pathname] || 'BioGas Ops';

const App: React.FC = () => {
  // This initializes the theme from the store as soon as the app loads
  useThemeStore(); 
  const { location } = useRouterState();
  const pageTitle = getPageTitle(location.pathname);
  const authRoutes = ['/login', '/forgot-password', '/update-password'];
  const showNav = !authRoutes.includes(location.pathname);

  useEffect(() => {
    document.title = `${pageTitle} | BioGas Plant Operations`;
  }, [pageTitle]);

  return (
    // FIX: Wrapped application with SupabaseDataProvider to provide context data.
    <AuthProvider>
      <SupabaseDataProvider>
        <ErrorBoundary>
          <div className="flex flex-col h-screen font-sans text-text-primary bg-background">
            {showNav && <Header title={pageTitle} />}
            <main className={cn("flex-grow overflow-y-auto", { "pb-20": showNav })}>
              <Outlet />
            </main>
            {showNav && <BottomNav />}
            <Toaster />
            <ReactQueryDevtools initialIsOpen={false} />
          </div>
        </ErrorBoundary>
      </SupabaseDataProvider>
    </AuthProvider>
  );
};

export default App;
