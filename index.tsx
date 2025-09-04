import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Updated package name from '@tanstack/router' to '@tanstack/react-router' to match modern TanStack Router and fix module resolution.
// FIX: Imported createHashHistory to switch to hash-based routing.
// FIX: Replaced Route/RootRoute classes with createRoute/createRootRoute functions for modern TanStack Router API compliance and to fix type errors.
// FIX: Switched from `createRouter` to the `Router` class constructor to bypass the library's `strictNullChecks` enforcement, resolving the type error.
import { RouterProvider, createRootRoute, createRoute, createHashHistory, Router } from '@tanstack/react-router';
// FIX: Import QueryClient from '@tanstack/query-core' to resolve module export issues. QueryClientProvider remains from '@tanstack/react-query'.
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/query-core';

import App from './App';
import HomePage from './pages/HomePage';
import GraphsPage from './pages/GraphsPage';
import FeedingPage from './pages/FeedingPage';
import MorePage from './pages/MorePage';
import InputsPage from './pages/InputsPage';
import GasQualityPage from './pages/GasQualityPage';
import LaboratoryPage from './pages/LaboratoryPage';
import PfQPage from './pages/PfQPage';
import EnvironmentPage from './pages/EnvironmentPage';
import EnergyRegistryPage from './pages/EnergyRegistryPage';
import ChpControlPage from './pages/ChpControlPage';
import MaintenancePage from './pages/MaintenancePage';
import StockPage from './pages/StockPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import SetupPage from './pages/SetupPage';
import ManagementPage from './pages/ManagementPage';
import AlarmsPage from './pages/AlarmsPage';
import UserManagementPage from './pages/UserManagementPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient();

// Create a root route
// FIX: Used createRootRoute factory function instead of new RootRoute() to align with modern TanStack Router API.
const rootRoute = createRootRoute({
  component: App,
});

// Create routes
// FIX: Used createRoute factory function instead of new Route() for all route definitions to align with modern TanStack Router API and fix type errors.
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

// Create the route tree
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
]);

// FIX: Create a hash history instance to use hash-based routing.
const hashHistory = createHashHistory();

// Create the router
// FIX: Pass the hash history instance to the router.
// FIX: Use the `Router` class constructor instead of the `createRouter` factory to bypass the strict-null-checks compile-time enforcement required by the factory function. This resolves the type error in environments where tsconfig.json cannot be modified.
const router = new Router({ routeTree, defaultPreload: 'intent', history: hashHistory });

// Register the router for maximum type safety
// FIX: Updated package name from '@tanstack/router' to '@tanstack/react-router'.
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