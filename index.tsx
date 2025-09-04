


import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter, createRootRoute, createRoute, createHashHistory } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/query-core';

import App from './App';

// FIX: Removed .tsx extension from dynamic imports to fix module resolution errors in the browser.
const HomePage = lazy(() => import('./pages/HomePage'));
const GraphsPage = lazy(() => import('./pages/GraphsPage'));
const FeedingPage = lazy(() => import('./pages/FeedingPage'));
const MorePage = lazy(() => import('./pages/MorePage'));
const InputsPage = lazy(() => import('./pages/InputsPage'));
const GasQualityPage = lazy(() => import('./pages/GasQualityPage'));
const LaboratoryPage = lazy(() => import('./pages/LaboratoryPage'));
const PfQPage = lazy(() => import('./pages/PfQPage'));
const EnvironmentPage = lazy(() => import('./pages/EnvironmentPage'));
const EnergyRegistryPage = lazy(() => import('./pages/EnergyRegistryPage'));
const ChpControlPage = lazy(() => import('./pages/ChpControlPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'));
const SetupPage = lazy(() => import('./pages/SetupPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const AlarmsPage = lazy(() => import('./pages/AlarmsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));
const ErrorDetectivePage = lazy(() => import('./pages/ErrorDetectivePage'));


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient();

// Create a root route using the v1 API
const rootRoute = createRootRoute({
  component: App,
});

// Create routes using the v1 API
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage });
const forgotPasswordRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forgot-password', component: ForgotPasswordPage });
const updatePasswordRoute = createRoute({ getParentRoute: () => rootRoute, path: '/update-password', component: UpdatePasswordPage });

const graphsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/graphs', component: GraphsPage });
const feedingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/feeding', component: FeedingPage });
const inputsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/inputs', component: InputsPage });
const gasQualityRoute = createRoute({ getParentRoute: () => rootRoute, path: '/gas-quality', component: GasQualityPage });
const laboratoryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/laboratory', component: LaboratoryPage });
const pfqRoute = createRoute({ getParentRoute: () => rootRoute, path: '/pfq', component: PfQPage });
const environmentRoute = createRoute({ getParentRoute: () => rootRoute, path: '/environment', component: EnvironmentPage });
const energyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/energy', component: EnergyRegistryPage });
const chpRoute = createRoute({ getParentRoute: () => rootRoute, path: '/chp', component: ChpControlPage });
const maintenanceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/maintenance', component: MaintenancePage });
const stockRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stock', component: StockPage });
const moreRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more', component: MorePage });
const profileSettingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile-settings', component: ProfileSettingsPage });
const setupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: SetupPage });
const managementRoute = createRoute({ getParentRoute: () => rootRoute, path: '/management', component: ManagementPage });
const alarmsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/alarms', component: AlarmsPage });
const userManagementRoute = createRoute({ getParentRoute: () => rootRoute, path: '/user-management', component: UserManagementPage });
const changePasswordRoute = createRoute({ getParentRoute: () => rootRoute, path: '/change-password', component: ChangePasswordPage });
const errorDetectiveRoute = createRoute({ getParentRoute: () => rootRoute, path: '/error-detective', component: ErrorDetectivePage });

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  forgotPasswordRoute,
  updatePasswordRoute,
  graphsRoute,
  feedingRoute,
  inputsRoute,
  // FIX: Corrected typo from 'gasQualityPage' to 'gasQualityRoute'. The undefined variable was causing a downstream type error in `createRouter`.
  gasQualityRoute,
  laboratoryRoute,
  pfqRoute,
  environmentRoute,
  energyRoute,
  chpRoute,
  maintenanceRoute,
  stockRoute,
  moreRoute,
  profileSettingsRoute,
  setupRoute,
  managementRoute,
  alarmsRoute,
  userManagementRoute,
  changePasswordRoute,
  errorDetectiveRoute,
]);

// Create the router using the v1 API standard
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