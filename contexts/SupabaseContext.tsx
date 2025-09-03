
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import type { Database } from '../types/database';

// FIX: Added content to this file which was empty, causing "is not a module" errors.
// This context provides commonly used Supabase data to multiple pages.

type Sustrato = Database['public']['Tables']['sustratos']['Row'];
type Proveedor = Database['public']['Tables']['empresa']['Row'];
type Camion = Database['public']['Tables']['camiones']['Row'];
type LugarDescarga = Database['public']['Tables']['lugares_descarga']['Row'];
type Equipo = Database['public']['Tables']['equipos']['Row'];
type TipoMantenimiento = Database['public']['Tables']['tipos_mantenimiento']['Row'];

interface SupabaseDataContextType {
    sustratos: Sustrato[];
    proveedores: Proveedor[];
    camiones: Camion[];
    lugaresDescarga: LugarDescarga[];
    equipos: Equipo[];
    tiposMantenimiento: TipoMantenimiento[];
    loading: boolean;
    error: string | null;
    refreshData: () => void;
}

const SupabaseDataContext = createContext<SupabaseDataContextType | undefined>(undefined);

export const SupabaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sustratos, setSustratos] = useState<Sustrato[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [camiones, setCamiones] = useState<Camion[]>([]);
    const [lugaresDescarga, setLugaresDescarga] = useState<LugarDescarga[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [tiposMantenimiento, setTiposMantenimiento] = useState<TipoMantenimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                sustratosData,
                proveedoresData,
                camionesData,
                lugaresDescargaData,
                equiposData,
                tiposMantenimientoData,
            ] = await Promise.all([
                api.fetchSustratos(),
                api.fetchProveedores(),
                api.fetchCamiones(),
                api.fetchLugaresDescarga(),
                api.fetchEquipos(),
                api.fetchTiposMantenimiento(),
            ]);

            setSustratos(sustratosData);
            setProveedores(proveedoresData);
            setCamiones(camionesData);
            setLugaresDescarga(lugaresDescargaData);
            setEquipos(equiposData);
            setTiposMantenimiento(tiposMantenimientoData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const value = {
        sustratos,
        proveedores,
        camiones,
        lugaresDescarga,
        equipos,
        tiposMantenimiento,
        loading,
        error,
        refreshData: fetchData,
    };

    return (
        <SupabaseDataContext.Provider value={value}>
            {children}
        </SupabaseDataContext.Provider>
    );
};

export const useSupabaseData = () => {
    const context = useContext(SupabaseDataContext);
    if (context === undefined) {
        throw new Error('useSupabaseData must be used within a SupabaseDataProvider');
    }
    return context;
};
