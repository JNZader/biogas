import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
// FIX: Replaced 'AuthSession' with 'Session' and added a direct 'User' import to align with Supabase v2 types.
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { useNavigate } from '@tanstack/react-router';
import { PlantaId } from '../types/branded';

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
        // FIX: The 'signOut' method call is correct for v2. The previous error was a cascade from incorrect type definitions.
        await supabase.auth.signOut();
        // The onAuthStateChange listener will handle state cleanup
    };

    useEffect(() => {
        setLoading(true);
        const fetchUserAndPlantaData = async (session: Session | null) => {
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
                        .select('vista_path') // Fetch the view path instead of the module
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
                            .map(p => p.vista_path)
                            .filter((path): path is string => !!path);
                        setPermissions(userPermissions);
                    }
                }
            }
            setLoading(false);
        };
        
        // FIX: Replaced the synchronous `session()` call with the asynchronous `getSession()` to align with Supabase JS v2.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            fetchUserAndPlantaData(session);
        });

        // FIX: The `onAuthStateChange` call is correct for Supabase v2. The previous error was a cascade from incorrect type definitions.
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
                    setLoading(false);
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
    // FIX: Corrected a likely typo from `Auth` to `AuthContext` to resolve "Cannot find name 'Auth'" error.
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
