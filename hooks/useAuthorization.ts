import { useAuth } from '../contexts/AuthContext.tsx';

/**
 * Custom hook for handling authorization logic.
 * It provides simple helper functions to check user roles and permissions.
 */
export const useAuthorization = () => {
    const { role, permissions, loading } = useAuth();

    /**
     * Checks if the current user has at least one of the required roles.
     * @param requiredRole A single role string or an array of role strings.
     * @returns `true` if the user has the role, `false` otherwise.
     */
    const hasRole = (requiredRole: string | string[]): boolean => {
        if (loading || !role) return false;
        
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        return requiredRoles.includes(role);
    };

    /**
     * Checks if the current user has permission to access a specific route path.
     * @param path The route path to check for (e.g., '/maintenance').
     * @returns `true` if the user has the permission, `false` otherwise.
     */
    const canAccess = (path: string): boolean => {
        if (loading || !permissions) return false;
        
        // Super Admins can access everything
        if (role === 'Super Admin') return true;

        return permissions.includes(path);
    };
    
    return {
        role,
        permissions,
        hasRole,
        canAccess,
        isLoading: loading
    };
};
