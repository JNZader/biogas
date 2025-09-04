
import React from 'react';
import { useAuthorization } from '../hooks/useAuthorization';
import AccessDeniedPage from './AccessDeniedPage';
import { Card, CardContent } from './ui/Card';
import Page from './Page';

interface ProtectedRouteProps {
  requiredPermission: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission, children }) => {
  const { canAccess, isLoading } = useAuthorization();

  if (isLoading) {
    return (
      <Page>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-text-secondary">Verificando permisos...</p>
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!canAccess(requiredPermission)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
