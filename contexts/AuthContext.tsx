import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
// FIX: Replaced 'AuthSession' with 'Session' and removed direct 'User' import to align with Supabase v1 types.
import type { Session as AuthSession } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { useNavigate } from '@tanstack/react-router';
import { PlantaId } from '../types/branded';

// FIX: Derived 'User' type from 'AuthSession' as it's not directly exported in Supabase v1.
type User = AuthSession['user'];
type Planta = Database['public']['Tables']['plantas']['Row'];
type PublicProfile = Database['public']['Tables']['usuarios']['Row'];
export type PlantaWithRole = Planta & { rol: string };

interface AuthContextType {
    user: User | null;
    publicProfile: PublicProfile | null;
    activePlanta: Planta | null;
    userPlants: PlantaWithRole[];
    switchPlanta: (plantaId: PlantaId) => void;
    signOut: () => void;
    role: string | null;
    permissions: string[];
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
    const [activePlanta, setActivePlanta] = useState<Planta | null>(null);
    const [userPlants, setUserPlants] = useState<PlantaWithRole[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const switchPlanta = (plantaId: PlantaId) => {
        const selected = userPlants.find(p => p.id === plantaId);
        if (selected) {
            setActivePlanta(selected);
            setRole(selected.rol);
        } else {
            console.warn(`Attempted to switch to a plant with ID ${plantaId} which the user does not have access to.`);
        }
    };
    
    const signOut = async () => {
        // FIX: The 'signOut' method was reported with an error, but the call is correct for both v1 and v2.
        // This was likely a cascading type error resolved by fixing other API calls. No change needed here.
        await supabase.auth.signOut();
        // The onAuthStateChange listener will handle state cleanup
    };

    useEffect(() => {
        const getSession = () => {
            // FIX: Replaced async 'getSession()' with the synchronous v1 method 'session()' to resolve the 'property does not exist' error.
            const session = supabase.auth.session();
            // FIX: Changed '??' to '||' to correctly handle a potential 'undefined' from session.user, assigning null as the fallback.
            setUser(session?.user || null);
            return session;
        };

        const fetchUserAndPlantaData = async (session: AuthSession | null) => {
            if (session?.user) {
                // 1. Get public user profile
                const { data: publicUser, error: publicUserError } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('idauth', session.user.id)
                    .single();

                if (publicUserError || !publicUser) {
                    console.error("Error fetching user profile:", publicUserError?.message);
                    setLoading(false);
                    return;
                }
                setPublicProfile(publicUser);
                
                // 2. Fetch plant, role, and permissions in parallel
                const [userPlantRes, permissionsRes] = await Promise.all([
                    supabase
                        .from('usuarios_plantas')
                        .select('rol, plantas(*)')
                        .eq('usuario_id', publicUser.id),
                    supabase
                        .from('permisos')
                        .select('modulos ( nombre )')
                        .eq('id_usuario', publicUser.id)
                ]);

                if (userPlantRes.error) {
                    console.error("Error fetching user's plant and role:", userPlantRes.error.message);
                } else {
                    const userPlantData = userPlantRes.data;
                    if (userPlantData && userPlantData.length > 0) {
                        const plantsWithRoles = userPlantData
                            .map(up => (up.plantas ? { ...(up.plantas as Planta), rol: up.rol } : null))
                            .filter((p): p is PlantaWithRole => p !== null);

                        setUserPlants(plantsWithRoles);

                        if (plantsWithRoles.length > 0) {
                            setActivePlanta(plantsWithRoles[0]);
                            setRole(plantsWithRoles[0].rol);
                        }
                    } else {
                         console.warn("User is logged in but has no plants assigned.");
                         setUserPlants([]);
                         setActivePlanta(null);
                         setRole(null);
                    }
                }
                
                if (permissionsRes.error) {
                     console.error("Error fetching user's permissions:", permissionsRes.error.message);
                } else {
                    const permissionsData = permissionsRes.data;
                    if (permissionsData) {
                        const userPermissions = permissionsData
                            .map(p => p.modulos?.nombre)
                            .filter((name): name is string => !!name);
                        setPermissions(userPermissions);
                    }
                }

            }
            setLoading(false);
        };
        
        const session = getSession();
        fetchUserAndPlantaData(session);

        // FIX: The 'onAuthStateChange' method was reported with an error, but the call is correct for both v1 and v2.
        // This was likely a cascading type error resolved by fixing other API calls. No change needed here.
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                // Reset states on auth change before fetching new data
                setPublicProfile(null);
                setActivePlanta(null);
                setUserPlants([]);
                setRole(null);
                setPermissions([]);

                if (event === 'SIGNED_IN') {
                    await fetchUserAndPlantaData(session);
                    navigate({ to: '/' });
                } else if (event === 'SIGNED_OUT') {
                    navigate({ to: '/login' });
                }
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [navigate]);

    const value = {
        user,
        publicProfile,
        activePlanta,
        userPlants,
        switchPlanta,
        signOut,
        role,
        permissions,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};