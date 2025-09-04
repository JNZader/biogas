

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
// FIX: Use named import for Button from the new UI component path.
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-md bg-surface p-8 rounded-xl shadow-lg">
                <ExclamationTriangleIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-text-primary mb-2">Oops! Algo salió mal.</h1>
                <p className="text-text-secondary mb-6">
                    Se ha producido un error inesperado en la aplicación. Por favor, recarga la página para continuar.
                </p>
                {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
                <Button 
                    variant="default" 
                    onClick={() => window.location.reload()}
                    className="w-auto px-6"
                >
                    Recargar Página
                </Button>

                {this.state.error && (
                    <details className="mt-6 text-left bg-gray-100 p-3 rounded-md text-xs">
                        <summary className="cursor-pointer font-medium text-text-secondary">Detalles del Error</summary>
                        <pre className="mt-2 text-red-700 whitespace-pre-wrap overflow-auto" style={{maxHeight: '200px'}}>
                            {this.state.error.toString()}
                            <br /><br />
                            {this.state.error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;