/**
 * @file This is the root component of the application.
 * It sets up the main layout, including the header and bottom navigation,
 * which are conditionally rendered based on the current route. It also initializes
 * global providers like Auth, SupabaseData, and ErrorBoundary, and handles
 * dynamic page title updates.
 */

import React, { useEffect, Suspense } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/Toaster';
import { useThemeStore } from '@/stores/themeStore';
import { SupabaseDataProvider } from '@/contexts/SupabaseContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import Sidebar from '@/components/Sidebar';

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
  '/error-detective': 'Error Detective',
};

/**
 * Determines the page title based on the current URL pathname.
 * @param {string} pathname - The current route's pathname.
 * @returns {string} The corresponding page title or a default title.
 */
const getPageTitle = (pathname: string) => pathTitleMap[pathname] || 'BioGas Ops';

/**
 * The main application component that wraps all pages.
 * It manages the overall page structure, conditional rendering of navigation elements,
 * and initialization of context providers and global state.
 */
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
    <AuthProvider>
      <SupabaseDataProvider>
        <ErrorBoundary>
          <div className="flex h-screen font-sans text-text-primary bg-background">
            {showNav && <Sidebar />}
            <div className={cn("flex-1 flex flex-col w-full", { "lg:ml-64": showNav })}>
                {showNav && <Header title={pageTitle} />}
                <main className={cn("flex-grow overflow-y-auto", { "pb-16 lg:pb-0": showNav })}>
                  <Suspense fallback={<Spinner />}>
                    <Outlet />
                  </Suspense>
                </main>
                {showNav && <BottomNav />}
                <Toaster />
                <ReactQueryDevtools initialIsOpen={false} />
            </div>
          </div>
        </ErrorBoundary>
      </SupabaseDataProvider>
    </AuthProvider>
  );
};

export default App;