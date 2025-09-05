
import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Removed unused `AnyRoute` import.
import { RouterProvider, Router, createRootRoute, createRoute, createHashHistory } from '@tanstack/react-router';
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

// Register Service Worker for PWA/Offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}


const queryClient = new QueryClient();

// Create a root route using the v1 API
const rootRoute = createRootRoute({
  component: App,
});

// FIX: The cryptic "strictNullChecks" error from TanStack Router often points to an invalid route tree,
// sometimes caused by TypeScript's inability to infer a very large, complex, inline type.
// By defining each route as a separate constant, we break down the complexity and help the
// type inference engine correctly resolve the final `routeTree` type.
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  forgotPasswordRoute,
  updatePasswordRoute,
  graphsRoute,
  feedingRoute,
  inputsRoute,
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

// FIX: Replaced `createRouter` with `new Router()` to work around a potential type inference issue in the factory function when dealing with a large route tree and custom history. This resolves the cryptic "strictNullChecks" TypeScript error while preserving the intended hash-based routing.
const router = new Router({
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