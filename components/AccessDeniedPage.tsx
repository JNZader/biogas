
import React from 'react';
import Page from './Page';
import { Card, CardContent } from './ui/Card';
import { LockClosedIcon } from '@heroicons/react/24/solid';

const AccessDeniedPage: React.FC = () => (
  <Page>
    <Card>
      <CardContent className="pt-6 text-center">
        <LockClosedIcon className="mx-auto h-12 w-12 text-error" />
        <h2 className="mt-4 text-xl font-bold text-error">Acceso Denegado</h2>
        <p className="mt-2 text-text-secondary">
          No tienes los permisos necesarios para ver esta página.
          <br />
          Por favor, contacta a un administrador si crees que esto es un error.
        </p>
      </CardContent>
    </Card>
  </Page>
);

export default AccessDeniedPage;
