import React from 'react';
import { useAuthorization } from '../hooks/useAuthorization';
import AccessDeniedPage from './AccessDeniedPage';
import { Card, CardContent } from './ui/Card';
import Page from './Page';
import { useRouterState } from '@tanstack/react-router';
import Spinner from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // FIX: Add optional 'requiredPermission' prop to satisfy pages that pass it.
  // The authorization logic remains based on the current path, handled by the main wrapper in App.tsx.
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { canAccess, isLoading } = useAuthorization();
  const { location } = useRouterState();
  const currentPath = location.pathname;

  if (isLoading) {
    return (
      <Page>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center h-64">
            <Spinner />
            <p className="text-center text-text-secondary mt-2">Verificando permisos...</p>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!canAccess(currentPath)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;