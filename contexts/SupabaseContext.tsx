/**
 * @file This file provides a React Context for fetching and caching shared data from Supabase.
 * It centralizes data loading for common entities like equipment, suppliers, and substrates,
 * making them available throughout the application via a custom hook `useSupabaseData`.
 * This approach reduces redundant data fetching and simplifies data access in components.
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { useAuth } from './AuthContext.tsx';

// --- Co-located API Logic for Shared Data ---
// These functions now implicitly depend on RLS policies being active
const fetchSustratos = async () => {
    const { data, error } = await supabase.from('sustratos').select('*').order('nombre');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchProveedores = async () => {
    const { data, error } = await supabase.from('empresa').select('*').eq('tipo_empresa', 'proveedor').order('nombre');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchTransportistas = async () => {
    const { data, error } = await supabase.from('empresa').select('*').eq('tipo_empresa', 'transportista').order('nombre');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchCamiones = async () => {
    const { data, error } = await supabase.from('camiones').select('*').order('patente');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchLugaresDescarga = async () => {
    const { data, error } = await supabase.from('lugares_descarga').select('*').order('nombre');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchEquipos = async () => {
    const { data, error } = await supabase.from('equipos').select('*').order('nombre_equipo');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchTiposMantenimiento = async () => {
    const { data, error } = await supabase.from('tipos_mantenimiento').select('*').order('nombre_tipo');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchSubsistemas = async () => {
    const { data, error } = await supabase.from('subsistemas').select('*').order('nombre_subsistema');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};
const fetchModulos = async () => {
    const { data, error } = await supabase.from('modulos').select('*').order('nombre');
    if (error) throw error;
    // FIX: Ensure an array is always returned to match the expected Promise<T[]> type.
    return data || [];
};

// --- Context Definition ---
type Sustrato = Database['public']['Tables']['sustratos']['Row'];
type Empresa = Database['public']['Tables']['empresa']['Row'];
type Camion = Database['public']['Tables']['camiones']['Row'];
type LugarDescarga = Database['public']['Tables']['lugares_descarga']['Row'];
type Equipo = Database['public']['Tables']['equipos']['Row'];
type TipoMantenimiento = Database['public']['Tables']['tipos_mantenimiento']['Row'];
type Subsistema = Database['public']['Tables']['subsistemas']['Row'];
type Modulo = Database['public']['Tables']['modulos']['Row'];

interface SupabaseDataContextType {
    sustratos: Sustrato[];
    proveedores: Empresa[];
    transportistas: Empresa[];
    camiones: Camion[];
    lugaresDescarga: LugarDescarga[];
    equipos: Equipo[];
    tiposMantenimiento: TipoMantenimiento[];
    subsistemas: Subsistema[];
    modulos: Modulo[];
    loading: boolean;
    error: string | null;
    refreshData: () => void;
}

const SupabaseDataContext = createContext<SupabaseDataContextType | undefined>(undefined);

/**
 * Provides shared Supabase data to all child components.
 * It fetches data once when the active plant is identified and makes it available via the `useSupabaseData` hook.
 * It also exposes a `refreshData` function to manually re-fetch all data.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be rendered within the provider.
 */
export const SupabaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activePlanta, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();
    const isEnabled = !!activePlanta; // Enable queries only when a plant is active

    const useSharedQuery = <T,>(key: string, fetcher: () => Promise<T[]>) => {
        // FIX: Add explicit type arguments to useQuery to ensure type safety.
        return useQuery<T[], Error>({
            queryKey: [key, activePlanta?.id],
            queryFn: fetcher,
            enabled: isEnabled,
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
        });
    };

    // FIX: Added explicit generic types to each useSharedQuery call to ensure data is correctly typed and not inferred as `unknown[]`.
    const { data: sustratos = [], isLoading: sustratosLoading, error: sustratosError } = useSharedQuery<Sustrato>('sustratos', fetchSustratos);
    const { data: proveedores = [], isLoading: proveedoresLoading, error: proveedoresError } = useSharedQuery<Empresa>('proveedores', fetchProveedores);
    const { data: transportistas = [], isLoading: transportistasLoading, error: transportistasError } = useSharedQuery<Empresa>('transportistas', fetchTransportistas);
    const { data: camiones = [], isLoading: camionesLoading, error: camionesError } = useSharedQuery<Camion>('camiones', fetchCamiones);
    const { data: lugaresDescarga = [], isLoading: lugaresDescargaLoading, error: lugaresDescargaError } = useSharedQuery<LugarDescarga>('lugaresDescarga', fetchLugaresDescarga);
    const { data: equipos = [], isLoading: equiposLoading, error: equiposError } = useSharedQuery<Equipo>('equipos', fetchEquipos);
    const { data: tiposMantenimiento = [], isLoading: tiposMantenimientoLoading, error: tiposMantenimientoError } = useSharedQuery<TipoMantenimiento>('tiposMantenimiento', fetchTiposMantenimiento);
    const { data: subsistemas = [], isLoading: subsistemasLoading, error: subsistemasError } = useSharedQuery<Subsistema>('subsistemas', fetchSubsistemas);
    const { data: modulos = [], isLoading: modulosLoading, error: modulosError } = useSharedQuery<Modulo>('modulos', fetchModulos);

    const loading = authLoading || sustratosLoading || proveedoresLoading || transportistasLoading || camionesLoading || lugaresDescargaLoading || equiposLoading || tiposMantenimientoLoading || subsistemasLoading || modulosLoading;
    const error = [sustratosError, proveedoresError, transportistasError, camionesError, lugaresDescargaError, equiposError, tiposMantenimientoError, subsistemasError, modulosError]
        .filter(Boolean)
        .map(e => (e as Error).message)
        .join('; ');

    const refreshData = useCallback(() => {
        queryClient.invalidateQueries();
    }, [queryClient]);

    const value: SupabaseDataContextType = {
        sustratos,
        proveedores,
        transportistas,
        camiones,
        lugaresDescarga,
        equipos,
        tiposMantenimiento,
        subsistemas,
        modulos,
        loading,
        error: error || null,
        refreshData,
    };

    return (
        <SupabaseDataContext.Provider value={value}>
            {children}
        </SupabaseDataContext.Provider>
    );
};

/**
 * Custom hook to access the shared Supabase data from the context.
 * Must be used within a `SupabaseDataProvider`.
 * @returns {SupabaseDataContextType} The context value, including data arrays, loading state, and error state.
 */
export const useSupabaseData = () => {
    const context = useContext(SupabaseDataContext);
    if (context === undefined) {
        throw new Error('useSupabaseData must be used within a SupabaseDataProvider');
    }
    return context;
};