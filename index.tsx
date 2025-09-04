import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter, createRootRoute, createRoute, createHashHistory } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/query-core';

import App from '@/App';

// FIX: Added absolute paths to fix module resolution errors in the browser.
const HomePage = lazy(() => import('@/pages/HomePage'));
const GraphsPage = lazy(() => import('@/pages/GraphsPage'));
const FeedingPage = lazy(() => import('@/pages/FeedingPage'));
const MorePage = lazy(() => import('@/pages/MorePage'));
const InputsPage = lazy(() => import('@/pages/InputsPage'));
const GasQualityPage = lazy(() => import('@/pages/GasQualityPage'));
const LaboratoryPage = lazy(() => import('@/pages/LaboratoryPage'));
const PfQPage = lazy(() => import('@/pages/PfQPage'));
const EnvironmentPage = lazy(() => import('@/pages/EnvironmentPage'));
const EnergyRegistryPage = lazy(() => import('@/pages/EnergyRegistryPage'));
const ChpControlPage = lazy(() => import('@/pages/ChpControlPage'));
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage'));
const StockPage = lazy(() => import('@/pages/StockPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/ProfileSettingsPage'));
const SetupPage = lazy(() => import('@/pages/SetupPage'));
const ManagementPage = lazy(() => import('@/pages/ManagementPage'));
const AlarmsPage = lazy(() => import('@/pages/AlarmsPage'));
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'));
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage'));
const ErrorDetectivePage = lazy(() => import('@/pages/ErrorDetectivePage'));


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient();

// Create a root route using the v1 API
const rootRoute = createRootRoute({
  component: App,
});

// FIX: The cryptic "strictNullChecks" error from TanStack Router often points to an invalid route tree.
// By extracting the route tree into a constant with `as const`, we prevent TypeScript from widening the
// complex generic type before it's passed to `createRouter`, resolving the inference issue.
const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/forgot-password', component: ForgotPasswordPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/update-password', component: UpdatePasswordPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/graphs', component: GraphsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/feeding', component: FeedingPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/inputs', component: InputsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/gas-quality', component: GasQualityPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/laboratory', component: LaboratoryPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/pfq', component: PfQPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/environment', component: EnvironmentPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/energy', component: EnergyRegistryPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/chp', component: ChpControlPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/maintenance', component: MaintenancePage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/stock', component: StockPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/more', component: MorePage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/profile-settings', component: ProfileSettingsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: SetupPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/management', component: ManagementPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/alarms', component: AlarmsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/user-management', component: UserManagementPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/change-password', component: ChangePasswordPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/error-detective', component: ErrorDetectivePage }),
]);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

// Register the router for maximum type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
