
import React, { useEffect } from 'react';
// FIX: Updated package name from '@tanstack/router' to '@tanstack/react-router'.
import { Outlet, useRouterState } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationContainer } from './components/NotificationContainer';
import { useThemeStore } from './stores/themeStore';
import { SupabaseDataProvider } from './contexts/SupabaseContext';

const pathTitleMap: { [key: string]: string } = {
  '/': 'Dashboard',
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
};

const getPageTitle = (pathname: string) => pathTitleMap[pathname] || 'BioGas Ops';

const App: React.FC = () => {
  // This initializes the theme from the store as soon as the app loads
  useThemeStore(); 
  const { location } = useRouterState();
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    document.title = `${pageTitle} | BioGas Plant Operations`;
  }, [pageTitle]);

  return (
    // FIX: Wrapped application with SupabaseDataProvider to provide context data.
    <SupabaseDataProvider>
      <div className="flex flex-col h-screen font-sans text-text-primary bg-background">
        <Header title={pageTitle} />
        <main className="flex-grow overflow-y-auto pb-20">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <BottomNav />
        <NotificationContainer />
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </SupabaseDataProvider>
  );
};

export default App;
