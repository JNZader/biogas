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
        { id: 1, nombres: 'Juan Pérez', correo: 'juan.perez@example.com', tipouser: 'Super Admin', idauth: 'mock-user-uuid-12345' },
        { id: 2, nombres: 'Ana Gómez', correo: 'ana.gomez@example.com', tipouser: 'Admin', idauth: 'mock-user-uuid-67890' },
        { id: 3, nombres: 'Carlos Ruiz', correo: 'carlos.ruiz@example.com', tipouser: 'Operador', idauth: 'mock-user-uuid-abcde' },
    ],
    usuarios_plantas: [
        { id: 1, usuario_id: 1, planta_id: 1, rol: 'Super Admin' },
        { id: 2, usuario_id: 2, planta_id: 1, rol: 'Admin' },
        { id: 3, usuario_id: 3, planta_id: 1, rol: 'Operador' },
    ],
    modulos: [
        { id: 1, nombre: 'dashboard', descripcion: 'Acceso al dashboard principal' },
        { id: 11, nombre: 'mantenimiento', descripcion: 'Gestión de mantenimiento' },
        { id: 12, nombre: 'stock', descripcion: 'Gestión de stock de repuestos' },
        { id: 13, nombre: 'administracion', descripcion: 'Administración del sistema' },
        { id: 14, nombre: 'user_management', descripcion: 'Gestión de usuarios y permisos' },
        { id: 15, nombre: 'setup', descripcion: 'Configuración inicial de la planta' },
    ],
    permisos: [
        // Juan Pérez (Super Admin) has all permissions
        ...[1, 11, 12, 13, 14, 15].map(idmodulo => ({ id_usuario: 1, idmodulo })),
        // Ana Gómez (Admin) has some management permissions
        { id_usuario: 2, idmodulo: 1 },  // dashboard
        { id_usuario: 2, idmodulo: 11 }, // mantenimiento
        { id_usuario: 2, idmodulo: 12 }, // stock
        // Carlos Ruiz (Operator) has no management permissions
        { id_usuario: 3, idmodulo: 1 }, // dashboard
    ].map((p, i) => ({ ...p, id: i + 1 })),
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
            },
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
            equipo_id: 1, // Biodigestor #1
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
            equipo_id_fk: 6, // Analizador de Gas #6
        };
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
            equipo_destino: { nombre_equipo: 'Biodigestor #1' },
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
        created_at: new Date(new Date().setDate(new Date().getDate() - i)).toISOString(),
        id_viaje_ingreso_fk: i + 1,
        sustratos: { nombre: ['Estiércol Bovino', 'Silaje de Maíz', 'Glicerina Cruda', 'Residuos Frigorífico'][i % 4] },
        ingresos_viaje_camion: { numero_remito_general: `R-00${i+1}` },
    })),
    empresa: [ // For proveedores
        { id: 1, nombre: 'Agropecuaria Don Tito', cuit: '30-11111111-1', tipo_empresa: 'proveedor' },
        { id: 2, nombre: 'Frigorífico La Pampa', cuit: '30-22222222-2', tipo_empresa: 'proveedor' },
        { id: 3, nombre: 'BioEnergy Solutions S.A.', cuit: '30-33333333-3', tipo_empresa: 'proveedor' },
        { id: 4, nombre: 'Transporte Veloz', cuit: '30-44444444-4', tipo_empresa: 'transportista' },
        { id: 5, nombre: 'Logística Sur', cuit: '30-55555555-5', tipo_empresa: 'transportista' },
    ],
    camiones: [
        { id: 1, patente: 'AD 123 BC', marca: 'Scania', modelo: 'R450', transportista_empresa_id: 4 },
        { id: 2, patente: 'AE 456 FG', marca: 'Volvo', modelo: 'FH 500', transportista_empresa_id: 5 },
        { id: 3, patente: 'AF 789 HI', marca: 'Mercedes-Benz', modelo: 'Actros', transportista_empresa_id: 4 },
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
    tipos_alarma: [
        { id: 1, nombre_alarma: 'Falla de Agitador' },
        { id: 2, nombre_alarma: 'Bajo Nivel de Gas' },
        { id: 3, nombre_alarma: 'Alta Temperatura CHP' },
        { id: 4, nombre_alarma: 'Presión Anormal Digestor' },
    ],
    alarmas: Array.from({ length: 20 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(i / 2));
        date.setHours(date.getHours() - (i % 24));
        const resuelta = Math.random() > 0.3;
        const severities = ['info', 'warning', 'critical'];
        return {
            id: i + 1,
            fecha_hora_activacion: date.toISOString(),
            tipo_alarma_id: (i % 4) + 1,
            severidad: severities[i % 3],
            resuelta: resuelta,
            fecha_hora_resolucion: resuelta ? new Date(date.getTime() + 15 * 60000).toISOString() : null,
            descripcion_alarma_ocurrida: `Detalle de la alarma #${i+1}.`,
            tipos_alarma: { nombre_alarma: ['Falla de Agitador', 'Bajo Nivel de Gas', 'Alta Temperatura CHP', 'Presión Anormal Digestor'][i % 4] },
            planta_id: 1,
        };
    }),
    subsistemas: [
        { id: 1, nombre_subsistema: 'Generación (CHP)', area_id: 5, orden_visualizacion: 2 },
        { id: 2, nombre_subsistema: 'Digestión', area_id: 3, orden_visualizacion: 1 },
        { id: 3, nombre_subsistema: 'Pre-tratamiento', area_id: 2, orden_visualizacion: 3 },
        { id: 4, nombre_subsistema: 'Tratamiento de Gas', area_id: 5, orden_visualizacion: 4 },
        { id: 5, nombre_subsistema: 'Recepción y Almacenamiento', area_id: 1, orden_visualizacion: 5 },
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
    repuestos: [
        { id: 1, nombre_repuesto: 'Bujía Motor CHP', codigo_sku: 'CHP-SP-001', stock_actual: 12, stock_minimo: 4, stock_maximo: 16, proveedor_principal_empresa_id: 3 },
        { id: 2, nombre_repuesto: 'Aceite Motor (200L)', codigo_sku: 'CHP-OIL-200', stock_actual: 2, stock_minimo: 1, stock_maximo: 3, proveedor_principal_empresa_id: 3 },
        { id: 3, nombre_repuesto: 'Sello Mecánico Bomba P-002', codigo_sku: 'PMP-SEAL-002', stock_actual: 1, stock_minimo: 2, stock_maximo: 4, proveedor_principal_empresa_id: 1 },
    ],
  };

  const mockQueryBuilder = (tableName: string, data: any[]) => {
    let queryResult = [...data];
    let single = false;
    let maybeSingle = false;
    let selectStr = '*';

    // FIX: Add mock join logic for relational queries
    const applyJoins = (result: any[]) => {
        if (!selectStr || !selectStr.includes('(')) return result;

        if (tableName === 'permisos' && selectStr.includes('modulos')) {
            const modulos = mockDatabase['modulos'];
            return result.map(permiso => ({
                ...permiso, // keep original fields
                modulos: modulos.find(m => m.id === permiso.idmodulo) || null,
            }));
        }
        if (tableName === 'usuarios_plantas' && selectStr.includes('plantas')) {
             const plantas = mockDatabase['plantas'];
             return result.map(up => ({
                 ...up,
                 plantas: plantas.find(p => p.id === up.planta_id) || null,
             }));
        }
        if (tableName === 'usuarios_plantas' && selectStr.includes('usuarios')) {
             const usuarios = mockDatabase['usuarios'];
             return result.map(up => ({
                 ...up,
                 usuarios: usuarios.find(u => u.id === up.usuario_id) || null,
             }));
        }
        // Add more mock join handlers as needed for other parts of the app
        return result;
    }

    const execute = async () => {
        const joinedResult = applyJoins(queryResult);
        if (maybeSingle && joinedResult.length === 0) {
            return { data: null, error: null };
        }
        if (single) {
            if (joinedResult.length > 1) {
                return { data: null, error: { message: 'More than one row returned', code: 'PGRST116' } };
            }
            if (joinedResult.length === 0) {
                return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
            }
            return { data: joinedResult[0], error: null };
        }
        return { data: joinedResult, error: null };
    };

    const builder = {
        select: (str: string = '*') => {
          selectStr = str;
          return builder;
        },
        insert: (newData: any) => {
            const items = Array.isArray(newData) ? newData : [newData];
            items.forEach(item => {
                const newId = (mockDatabase[tableName]?.length ?? 0) + 1;
                mockDatabase[tableName].push({ id: newId, ...item });
            });
            // Simplified: insert doesn't usually chain to select in mock
            return {
                select: () => ({
                    single: async () => ({ data: items[0], error: null }),
                }),
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
        },
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
  
  // FIX: Add a mock implementation for `supabase.auth` to prevent runtime errors when environment variables are not set.
  const mockUser = {
      id: 'mock-user-uuid-12345',
      email: 'juan.perez@example.com',
  };
  
  let mockSession: { user: any, access_token: string } | null = {
      user: mockUser,
      access_token: 'mock-token',
  };

  let onAuthStateChangeCallback: (event: string, session: typeof mockSession | null) => void;

  supabase = {
    from: mockFrom,
    auth: {
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        // FIX: Corrected the mock function signature for `onAuthStateChange` to properly handle the callback, preventing a runtime error.
        onAuthStateChange: (callback: (event: string, session: typeof mockSession | null) => void) => {
            onAuthStateChangeCallback = callback;
            callback('INITIAL_SESSION', mockSession);
            return {
                data: {
                    subscription: {
                        unsubscribe: () => {},
                    },
                },
            };
        },
        signInWithPassword: async ({ email }: { email: string }) => {
            const userProfile = mockDatabase.usuarios.find(u => u.correo === email);
            if (!userProfile) {
                return { data: null, error: { message: "Invalid login credentials" } };
            }
            mockSession = { user: { id: userProfile.idauth, email: userProfile.correo }, access_token: `mock-token-${userProfile.idauth}` };
            onAuthStateChangeCallback('SIGNED_IN', mockSession);
            return { data: { session: mockSession, user: mockSession.user }, error: null };
        },
        signOut: async () => {
            mockSession = null;
            onAuthStateChangeCallback('SIGNED_OUT', null);
            return { error: null };
        },
        resetPasswordForEmail: async (email: string) => {
            console.log(`[MOCK] Password reset email sent to ${email}. Redirect URL would be http://localhost:PORT/#/update-password`);
            return { data: {}, error: null };
        },
        updateUser: async ({ password }: { password?: string }) => {
            if (password) {
                 console.log("[MOCK] User password updated successfully.");
            }
            return { data: { user: mockSession?.user }, error: null };
        },
    },
  } as any;
}