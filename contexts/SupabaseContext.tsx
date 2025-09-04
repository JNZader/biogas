/**
 * @file This file provides a React Context for fetching and caching shared data from Supabase.
 * It centralizes data loading for common entities like equipment, suppliers, and substrates,
 * making them available throughout the application via a custom hook `useSupabaseData`.
 * This approach reduces redundant data fetching and simplifies data access in components.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { useAuth } from './AuthContext.tsx';

// --- Co-located API Logic for Shared Data ---
// These functions now implicitly depend on RLS policies being active
const fetchSustratos = async () => {
    const { data, error } = await supabase.from('sustratos').select('*').order('nombre');
    if (error) throw error;
    return data;
};
const fetchProveedores = async () => {
    const { data, error } = await supabase.from('empresa').select('*').eq('tipo_empresa', 'proveedor').order('nombre');
    if (error) throw error;
    return data;
};
const fetchTransportistas = async () => {
    const { data, error } = await supabase.from('empresa').select('*').eq('tipo_empresa', 'transportista').order('nombre');
    if (error) throw error;
    return data;
};
const fetchCamiones = async () => {
    const { data, error } = await supabase.from('camiones').select('*').order('patente');
    if (error) throw error;
    return data;
};
const fetchLugaresDescarga = async () => {
    const { data, error } = await supabase.from('lugares_descarga').select('*').order('nombre');
    if (error) throw error;
    return data;
};
const fetchEquipos = async () => {
    const { data, error } = await supabase.from('equipos').select('*').order('nombre_equipo');
    if (error) throw error;
    return data;
};
const fetchTiposMantenimiento = async () => {
    const { data, error } = await supabase.from('tipos_mantenimiento').select('*').order('nombre_tipo');
    if (error) throw error;
    return data;
};
const fetchSubsistemas = async () => {
    const { data, error } = await supabase.from('subsistemas').select('*').order('nombre_subsistema');
    if (error) throw error;
    return data;
};
const fetchModulos = async () => {
    const { data, error } = await supabase.from('modulos').select('*').order('nombre');
    if (error) throw error;
    return data;
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
    const { user, activePlanta, loading: authLoading } = useAuth();
    const [sustratos, setSustratos] = useState<Sustrato[]>([]);
    const [proveedores, setProveedores] = useState<Empresa[]>([]);
    const [transportistas, setTransportistas] = useState<Empresa[]>([]);
    const [camiones, setCamiones] = useState<Camion[]>([]);
    const [lugaresDescarga, setLugaresDescarga] = useState<LugarDescarga[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [tiposMantenimiento, setTiposMantenimiento] = useState<TipoMantenimiento[]>([]);
    const [subsistemas, setSubsistemas] = useState<Subsistema[]>([]);
    const [modulos, setModulos] = useState<Modulo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!activePlanta) {
            setLoading(false);
            return;
        };

        setLoading(true);
        setError(null);
        try {
            // With RLS in place, we don't need to add .eq('planta_id', activePlanta.id) to every query.
            // Supabase will handle the filtering on the backend based on the authenticated user.
            // This simplifies the frontend code significantly.
            const [
                sustratosData,
                proveedoresData,
                camionesData,
                lugaresDescargaData,
                equiposData,
                tiposMantenimientoData,
                transportistasData,
                subsistemasData,
                modulosData,
            ] = await Promise.all([
                fetchSustratos(),
                fetchProveedores(),
                fetchCamiones(),
                fetchLugaresDescarga(),
                fetchEquipos(),
                fetchTiposMantenimiento(),
                fetchTransportistas(),
                fetchSubsistemas(),
                fetchModulos(),
            ]);

            setSustratos(sustratosData);
            setProveedores(proveedoresData);
            setCamiones(camionesData);
            setLugaresDescarga(lugaresDescargaData);
            setEquipos(equiposData);
            setTiposMantenimiento(tiposMantenimientoData);
            setTransportistas(transportistasData);
            setSubsistemas(subsistemasData);
            setModulos(modulosData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activePlanta]);

    useEffect(() => {
        if (!authLoading) {
             fetchData();
        }
    }, [fetchData, authLoading]);

    const value = {
        sustratos,
        proveedores,
        transportistas,
        camiones,
        lugaresDescarga,
        equipos,
        tiposMantenimiento,
        subsistemas,
        modulos,
        loading: loading || authLoading,
        error,
        refreshData: fetchData,
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
