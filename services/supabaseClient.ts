
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// FIX: Export the 'supabase' client instance. It was declared but not exported, causing import errors across the application.
export let supabase: SupabaseClient<Database>;

if (supabaseUrl && supabaseAnonKey) {
  // If the environment variables are provided, create a real client.
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
  // If the environment variables are missing, log a warning and create a mock client.
  console.warn(
    "Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are not set. " +
    "Using a mock database for demonstration purposes. " +
    "Changes will not be persisted."
  );

  // --- MOCK DATABASE STORE ---
  const mockDatabase: { [key: string]: any[] } = {
    plantas: [
        { id: 1, nombre_planta: 'Planta de Biogás "El Progreso"', ubicacion: 'Ruta 5, km 123, Provincia', configuracion: { capacity: '5000', digester_type: 'CSTR (Mezcla Completa)' } },
    ],
    usuarios: [
        { id: 1, nombres: 'Juan Pérez', tipouser: 'Operador' }
    ],
    equipos: Array.from({ length: 12 }, (_, i) => {
        const types = ['Biodigestor', 'Bomba', 'Agitador', 'Generador (CHP)', 'Soplador', 'Analizador de Gas', 'Tolva', 'Silo'];
        const areas = ['Recepción', 'Pre-tratamiento', 'Digestión', 'Post-tratamiento', 'Generación de Energía'];
        const type = types[i % types.length];
        return {
            id: i + 1,
            nombre_equipo: `${type} #${i + 1}`,
            categoria: type,
            codigo_equipo: `${type.substring(0,1)}-00${i+1}`,
            planta_id: 1,
            especificaciones_tecnicas: {
                area: areas[i % areas.length],
                capacityValue: (Math.random() * 1000).toFixed(0),
                capacityUnit: type === 'Biodigestor' ? 'm³' : 'kW',
            }
        };
    }),
    energia: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
            id: i + 1,
            fecha: date.toISOString().split('T')[0],
            generacion_electrica_total_kwh_dia: 12000 + Math.floor(Math.random() * 2000),
            flujo_biogas_kg_dia: 8000 + Math.floor(Math.random() * 1500),
            horas_funcionamiento_motor_chp_dia: 22 + Math.random() * 2,
        };
    }),
    analisis_fos_tac: Array.from({ length: 15 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const tac = 4000 + Math.random() * 1000;
        const ratio = 0.25 + Math.random() * 0.2;
        const fos = tac * ratio;
        return {
            id: i + 1,
            fecha_hora: date.toISOString(),
            fos_mg_l: fos,
            tac_mg_l: tac,
            relacion_fos_tac: ratio,
            equipo_id: 1 // Biodigestor #1
        };
    }),
    lecturas_gas: Array.from({ length: 15 }, (_, i) => {
        const date = new Date();
        date.setHours(date.getHours() - i*2);
        return {
            id: i + 1,
            fecha_hora: date.toISOString(),
            ch4_porcentaje: 55 + Math.random() * 5,
            co2_porcentaje: 40 + Math.random() * 5,
            o2_porcentaje: 0.1 + Math.random() * 0.5,
            h2s_ppm: 50 + Math.random() * 150,
            potencia_exacta_kw: 480 + Math.random() * 40,
            equipo_id_fk: 6 // Analizador de Gas #6
        }
    }),
    alimentacion_biodigestor: Array.from({ length: 10 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(date.getHours() - Math.floor(Math.random() * 10));
        const sourceId = 7; // Tolva #7
        return {
            id: i + 1,
            fecha_hora: date.toISOString(),
            equipo_origen_id: sourceId,
            equipo_destino_id: 1, // Biodigestor #1
            cantidad: (4500 + Math.random() * 1000).toFixed(0),
            unidad: 'kg',
            observaciones: 'Alimentación de rutina',
            planta_id: 1,
            usuario_operador_id: 1,
            equipo_origen: { nombre_equipo: `Tolva #${sourceId}` },
            equipo_destino: { nombre_equipo: 'Biodigestor #1' }
        };
    }),
    sustratos: [
        { id: 1, nombre: 'Estiércol Bovino', categoria: 'Ganadería' },
        { id: 2, nombre: 'Silaje de Maíz', categoria: 'Agrícola' },
        { id: 3, nombre: 'Glicerina Cruda', categoria: 'Industrial' },
        { id: 4, nombre: 'Residuos Frigorífico', categoria: 'Industrial' },
    ],
    detalle_ingreso_sustrato: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        sustrato_id: (i % 4) + 1,
        cantidad_kg: 5000 + Math.random() * 15000,
        created_at: new Date().toISOString(),
        sustratos: { nombre: ['Estiércol Bovino', 'Silaje de Maíz', 'Glicerina Cruda', 'Residuos Frigorífico'][i % 4] }
    })),
    empresa: [ // For proveedores
        { id: 1, nombre: 'Agropecuaria Don Tito', cuit: '30-11111111-1', tipo_empresa: 'proveedor' },
        { id: 2, nombre: 'Frigorífico La Pampa', cuit: '30-22222222-2', tipo_empresa: 'proveedor' },
        { id: 3, nombre: 'BioEnergy Solutions S.A.', cuit: '30-33333333-3', tipo_empresa: 'proveedor' },
    ],
    camiones: [
        { id: 1, patente: 'AD 123 BC', marca: 'Scania', modelo: 'R450' },
        { id: 2, patente: 'AE 456 FG', marca: 'Volvo', modelo: 'FH 500' },
        { id: 3, patente: 'AF 789 HI', marca: 'Mercedes-Benz', modelo: 'Actros' },
    ],
    lugares_descarga: [
        { id: 1, nombre: 'Playa de Descarga 1', tipo: 'Playa' },
        { id: 2, nombre: 'Tolva de Sólidos', tipo: 'Tolva' },
        { id: 3, nombre: 'Tanque de Líquidos', tipo: 'Tanque' },
    ],
    tipos_mantenimiento: [
        { id: 1, nombre_tipo: 'Preventivo' },
        { id: 2, nombre_tipo: 'Correctivo' },
        { id: 3, nombre_tipo: 'Predictivo' },
    ],
    checklist_items: [
        // --- SUBSISTEMA: GENERACIÓN (CHP) ---
        { id: 1, numero_item: '1.1', subsistema_id: 1, descripcion_item: 'Verificar nivel de aceite del carter del CHP', tipo_condicion: 'OK/Observado' },
        { id: 2, numero_item: '1.2', subsistema_id: 1, descripcion_item: 'Verificar nivel de refrigerante del CHP', tipo_condicion: 'OK/Observado' },
        { id: 3, numero_item: '1.3', subsistema_id: 1, descripcion_item: 'Inspeccionar visualmente por fugas de aceite o agua en CHP', tipo_condicion: 'OK/Fuga' },
        { id: 4, numero_item: '1.4', subsistema_id: 1, descripcion_item: 'Revisar presión de gas en la entrada del motor', tipo_condicion: 'Valor Numérico', unidad_medida: 'mbar' },
        { id: 5, numero_item: '1.5', subsistema_id: 1, descripcion_item: 'Limpiar rejillas de ventilación del contenedor del CHP', tipo_condicion: 'OK/Limpio' },

        // --- SUBSISTEMA: DIGESTIÓN ---
        { id: 6, numero_item: '2.1', subsistema_id: 2, descripcion_item: 'Verificar funcionamiento de agitador del Biodigestor #1', tipo_condicion: 'OK/Ruido Anormal' },
        { id: 7, numero_item: '2.2', subsistema_id: 2, descripcion_item: 'Inspeccionar manómetros de presión del Biodigestor #1', tipo_condicion: 'OK/Observado' },
        { id: 8, numero_item: '2.3', subsistema_id: 2, descripcion_item: 'Revisar temperatura del Biodigestor #1', tipo_condicion: 'Valor Numérico', unidad_medida: '°C' },

        // --- SUBSISTEMA: PRE-TRATAMIENTO ---
        { id: 9, numero_item: '3.1', subsistema_id: 3, descripcion_item: 'Verificar estado de la bomba de alimentación P-002 (fugas, ruido)', tipo_condicion: 'OK/Falla' },
        { id: 10, numero_item: '3.2', subsistema_id: 3, descripcion_item: 'Limpiar filtro de la bomba de recirculación P-003', tipo_condicion: 'OK/Limpio' },
    ],
     // Add any other tables that might be needed for the mock
    ingresos_viaje_camion: [],
    aditivos_biodigestor: [],
    monitoreos_ambientales: [],
    monitoreos_ambientales_detalle: [],
    tipos_muestra: [
        {id: 1, nombre_tipo_muestra: 'Sustrato Sólido'},
        {id: 2, nombre_tipo_muestra: 'Sustrato Líquido'},
        {id: 3, nombre_tipo_muestra: 'Digestato'},
    ],
    analisis_laboratorio: [],
    analisis_laboratorio_detalle: [],
    cambios_potencia_chp: [],
    mantenimiento_eventos: [],
    checklist_registros: [],
    repuestos: [],
  };

  const mockQueryBuilder = (tableName: string, data: any[]) => {
    let queryResult = [...data];
    let single = false;
    let maybeSingle = false;

    const execute = async () => {
        if (maybeSingle && queryResult.length === 0) {
            return { data: null, error: null };
        }
        if (single) {
            if (queryResult.length > 1) {
                return { data: null, error: { message: 'More than one row returned', code: 'PGRST116' } };
            }
            if (queryResult.length === 0) {
                return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
            }
            return { data: queryResult[0], error: null };
        }
        return { data: queryResult, error: null };
    };

    const builder = {
        select: () => builder,
        insert: (newData: any) => {
            const items = Array.isArray(newData) ? newData : [newData];
            items.forEach(item => {
                const newId = (mockDatabase[tableName]?.length ?? 0) + 1;
                mockDatabase[tableName].push({ id: newId, ...item });
            });
            // Simplified: insert doesn't usually chain to select in mock
            return {
                select: () => ({
                    single: async () => ({ data: items[0], error: null })
                })
            };
        },
        update: (updatedData: any) => {
            // Update not implemented for mock
            return builder;
        },
        delete: () => {
             // Delete not implemented for mock
            return builder;
        },
        eq: (column: string, value: any) => {
            queryResult = queryResult.filter(row => row[column] === value);
            return builder;
        },
        is: (column: string, value: any) => {
            if (value === null) {
                queryResult = queryResult.filter(row => row[column] === null || row[column] === undefined);
            }
            return builder;
        },
        not: (column: string, operator: string, value: any) => {
            if(operator === 'is' && value === null) {
                queryResult = queryResult.filter(row => row[column] !== null && row[column] !== undefined);
            }
            return builder;
        },
        gte: (column: string, value: any) => {
            queryResult = queryResult.filter(row => row[column] >= value);
            return builder;
        },
        lt: (column: string, value: any) => {
            queryResult = queryResult.filter(row => row[column] < value);
            return builder;
        },
        order: (column: string, { ascending = true }: { ascending?: boolean } = {}) => {
            queryResult.sort((a, b) => {
                if (a[column] < b[column]) return ascending ? -1 : 1;
                if (a[column] > b[column]) return ascending ? 1 : -1;
                return 0;
            });
            return builder;
        },
        limit: (count: number) => {
            queryResult = queryResult.slice(0, count);
            return builder;
        },
        single: () => {
            single = true;
            return execute();
        },
        maybeSingle: () => {
            maybeSingle = true;
            return execute();
        },
        then: (callback: any) => {
            return execute().then(callback);
        }
    };
    return builder;
  };

  const mockFrom = (tableName: string) => {
    if (!mockDatabase[tableName]) {
        console.error(`Mock table "${tableName}" does not exist.`);
        return mockQueryBuilder(tableName, []);
    }
    return mockQueryBuilder(tableName, mockDatabase[tableName]);
  };
  
  supabase = {
    from: mockFrom,
    // ... other mock methods might be needed, but this is a start
  } as any;
}
