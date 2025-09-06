import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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
        const isBiodigester = type === 'Biodigestor';
        return {
            id: i + 1,
            nombre_equipo: `${type} #${i + 1}`,
            categoria: type,
            codigo_equipo: `${type.substring(0,1)}-00${i+1}`,
            planta_id: 1,
            especificaciones_tecnicas: {
                area: areas[i % areas.length],
                capacityValue: isBiodigester ? '5000' : (Math.random() * 1000).toFixed(0),
                capacityUnit: isBiodigester ? 'm³' : 'kW',
                ...(isBiodigester && { diameter: 25, height: 10 })
            },
        };
    }),
    energia: Array.from({ length: 90 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (89 - i));
        return {
            id: i + 1,
            fecha: date.toISOString().split('T')[0],
            generacion_electrica_total_kwh_dia: 11000 + Math.floor(Math.random() * 3000),
            flujo_biogas_kg_dia: 7500 + Math.floor(Math.random() * 2000),
            horas_funcionamiento_motor_chp_dia: 20 + Math.random() * 4,
            autoconsumo_porcentaje: 8 + Math.random() * 10,
        };
    }),
    analisis_fos_tac: Array.from({ length: 45 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (i*2)); // Every other day for ~90 days
        const tac = 3500 + Math.random() * 2000;
        const ratio = 0.2 + Math.random() * 0.25;
        const fos = tac * ratio;
        return {
            id: i + 1,
            fecha_hora: date.toISOString(),
            fos_mg_l: fos,
            tac_mg_l: tac,
            relacion_fos_tac: ratio,
            equipo_id: 1, // Biodigestor #1
            ph: 7.8 + Math.random() * 0.4 - 0.2,
        };
    }),
    pfq: Array.from({ length: 10 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
            id: i + 1,
            fecha_hora_medicion: date.toISOString(),
            equipo_id_fk: 1, // Biodigestor #1
            temperatura_c: 38.5 + Math.random() * 2 - 1,
            nivel_m: 7.5 + Math.random() * 1 - 0.5,
            planta_id: 1,
            usuario_operador_id_fk: 1,
        };
    }),
    lecturas_gas: Array.from({ length: 180 }, (_, i) => { // 2 readings a day for 90 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(i / 2));
        date.setHours(date.getHours() - (i % 12));
        return {
            id: i + 1,
            fecha_hora: date.toISOString(),
            ch4_porcentaje: 53 + Math.random() * 8,
            co2_porcentaje: 38 + Math.random() * 8,
            o2_porcentaje: 0.1 + Math.random() * 0.5,
            h2s_ppm: 30 + Math.random() * 200,
            potencia_exacta_kw: 470 + Math.random() * 60,
            equipo_id_fk: 1, // Changed to Biodigestor #1 to match GraphsPage query
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
    detalle_ingreso_sustrato: Array.from({ length: 120 }, (_, i) => ({ // ~4 entries a day for 30 days
        id: i + 1,
        sustrato_id: (i % 4) + 1,
        cantidad_kg: 5000 + Math.random() * 15000,
        created_at: new Date(new Date().setDate(new Date().getDate() - Math.floor(i / 4))).toISOString(),
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
    monitoreos_ambientales: [
        { id: 1, fecha_monitoreo: '2025-09-06', tipo_monitoreo: 'Emisiones', observaciones: 'Condiciones normales de operación, viento del SO a 15 km/h.', planta_id: 1, usuario_operador_id: 1 },
        { id: 2, fecha_monitoreo: '2025-09-05', tipo_monitoreo: 'Calidad de Agua', observaciones: 'Muestra tomada del efluente principal.', planta_id: 1, usuario_operador_id: 1 },
        { id: 3, fecha_monitoreo: '2025-09-04', tipo_monitoreo: 'Ruido Perimetral', observaciones: 'Medición en el límite sur de la planta.', planta_id: 1, usuario_operador_id: 1 },
    ],
    monitoreos_ambientales_detalle: [
        { id: 1, monitoreo_id: 1, parametro_medido: 'NOx', valor: 15.2, unidad_medida: 'ppm', limite_normativo: 50 },
        { id: 2, monitoreo_id: 1, parametro_medido: 'PM2.5', valor: 22.5, unidad_medida: 'µg/m³', limite_normativo: 50 },
        { id: 3, monitoreo_id: 1, parametro_medido: 'CO', valor: 5.1, unidad_medida: 'ppm', limite_normativo: 10 },
        { id: 4, monitoreo_id: 2, parametro_medido: 'pH', valor: 7.8, unidad_medida: '', limite_normativo: 9 },
        { id: 5, monitoreo_id: 2, parametro_medido: 'DBO5', valor: 180, unidad_medida: 'mg/L', limite_normativo: 250 },
        { id: 6, monitoreo_id: 2, parametro_medido: 'DQO', valor: 350, unidad_medida: 'mg/L', limite_normativo: 500 },
        { id: 7, monitoreo_id: 3, parametro_medido: 'Ruido Diurno', valor: 55, unidad_medida: 'dB', limite_normativo: 65 },
    ],
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
        { id: 1, nombre_repuesto: 'Bujía Motor CHP', codigo_sku: 'CHP-SP-001', stock_actual: 12, stock_minimo: 4, stock_maximo: 16, proveedor_principal_empresa_id: 3, planta_id: 1 },
        { id: 2, nombre_repuesto: 'Aceite Motor (200L)', codigo_sku: 'CHP-OIL-200', stock_actual: 2, stock_minimo: 1, stock_maximo: 3, proveedor_principal_empresa_id: 3, planta_id: 1 },
        { id: 3, nombre_repuesto: 'Sello Mecánico Bomba P-002', codigo_sku: 'PMP-SEAL-002', stock_actual: 1, stock_minimo: 2, stock_maximo: 4, proveedor_principal_empresa_id: 1, planta_id: 1 },
    ],
  };

  const mockQueryBuilder = (tableName: string, data: any[]) => {
    let queryResult = [...data];
    let single = false;
    let maybeSingle = false;
    let selectStr = '*';

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
        if (tableName === 'monitoreos_ambientales' && selectStr.includes('monitoreos_ambientales_detalle')) {
             const detalles = mockDatabase['monitoreos_ambientales_detalle'];
             return result.map(m => ({
                 ...m,
                 monitoreos_ambientales_detalle: detalles.filter(d => d.monitoreo_id === m.id) || [],
             }));
        }
        // Add more mock join handlers as needed for other parts of the app
        return result;
    }

    const execute = async () => {
        const joinedResult = applyJoins(queryResult);
        // FIX: Replaced corrupted/incomplete logic with a full implementation that correctly handles single() and maybeSingle() based on Supabase API behavior.
        if ((single || maybeSingle) && joinedResult.length > 1) {
            return { data: null, error: { message: 'Query returned more than one row', code: 'PGRST116' } };
        }
        if (single && joinedResult.length !== 1) {
            return { data: null, error: { message: `Query returned ${joinedResult.length} rows, but single() was called.`, code: 'PGRST116' } };
        }
        if (maybeSingle) {
            return { data: joinedResult[0] || null, error: null };
        }
        if (single) {
            return { data: joinedResult[0], error: null };
        }
        return { data: joinedResult, error: null };
    };

    const builder = {
        select: (str: string) => {
            selectStr = str;
            return builder;
        },
        insert: (newData: any) => {
            const items = Array.isArray(newData) ? newData : [newData];
            const insertedItems: any[] = [];
            
            items.forEach(item => {
                const newId = Math.max(...data.map(d => d.id || 0), 0) + 1;
                const newItem = { ...item, id: newId, created_at: new Date().toISOString() };
                data.push(newItem);
                insertedItems.push(newItem);
            });
            
            // Create a chainable object that supports .select().single()
            const result: any = {
                data: insertedItems,
                error: null,
                select: () => {
                    const selectResult: any = {
                        data: insertedItems,
                        error: null,
                        single: () => {
                            return Promise.resolve({
                                data: insertedItems.length === 1 ? insertedItems[0] : null,
                                error: insertedItems.length !== 1 ? { message: 'Expected single row' } : null
                            });
                        },
                        then: (onfulfilled: any, onrejected: any) => {
                            return Promise.resolve({ data: insertedItems, error: null }).then(onfulfilled, onrejected);
                        }
                    };
                    return selectResult;
                },
                single: () => {
                    return Promise.resolve({
                        data: insertedItems.length === 1 ? insertedItems[0] : null,
                        error: insertedItems.length !== 1 ? { message: 'Expected single row' } : null
                    });
                },
                then: (onfulfilled: any, onrejected: any) => {
                    return Promise.resolve({ data: insertedItems, error: null }).then(onfulfilled, onrejected);
                }
            };
            
            return result;
        },
        update: (newData: any) => {
            const p = new Promise(resolve => {
                queryResult.forEach(itemToUpdate => {
                    const index = data.findIndex(item => item.id === itemToUpdate.id);
                    if (index > -1) {
                        data[index] = { ...data[index], ...newData, updated_at: new Date().toISOString() };
                    }
                });
                resolve({ data: null, error: null });
            });
            return { then: (onfulfilled: any, onrejected: any) => p.then(onfulfilled, onrejected) };
        },
        delete: () => {
             const p = new Promise(resolve => {
                queryResult.forEach(itemToDelete => {
                    const index = data.findIndex(item => item.id === itemToDelete.id);
                    if (index > -1) {
                        data.splice(index, 1);
                    }
                });
                resolve({ data: null, error: null });
             });
             return { then: (onfulfilled: any, onrejected: any) => p.then(onfulfilled, onrejected) };
        },
        eq: (column: string, value: any) => {
            queryResult = queryResult.filter(row => row[column] === value);
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
        lte: (column: string, value: any) => {
            queryResult = queryResult.filter(row => row[column] <= value);
            return builder;
        },
        not: (column: string, operator: string, value: any) => {
            if (operator === 'is') {
                queryResult = queryResult.filter(row => row[column] !== value);
            }
            return builder;
        },
        is: (column: string, value: any) => {
            queryResult = queryResult.filter(row => row[column] === value);
            return builder;
        },
        order: (column: string, { ascending } = { ascending: true }) => {
            queryResult.sort((a, b) => {
                if (a[column] < b[column]) return ascending ? -1 : 1;
                if (a[column] > b[column]) return ascending ? 1 : -1;
                return 0;
            });
            return builder;
        },
        limit: (num: number) => {
            queryResult = queryResult.slice(0, num);
            return builder;
        },
        single: () => {
            single = true;
            return { then: (onfulfilled: any, onrejected: any) => execute().then(onfulfilled, onrejected) };
        },
        maybeSingle: () => {
            maybeSingle = true;
            return { then: (onfulfilled: any, onrejected: any) => execute().then(onfulfilled, onrejected) };
        },
        then: (onfulfilled: any, onrejected: any) => {
            return execute().then(onfulfilled, onrejected);
        },
    };
    return builder;
  };

  supabase = {
    from: (tableName: string) => mockQueryBuilder(tableName, mockDatabase[tableName] || []),
    auth: {
      getSession: () => {
        const mockSession = {
          user: { id: 'mock-user-uuid-12345', email: 'juan.perez@example.com' },
          access_token: 'mock-token',
          token_type: 'bearer',
        };
        return Promise.resolve({ data: { session: mockSession as any }, error: null });
      },
      onAuthStateChange: (callback) => {
        // Immediately call the callback with a mock session to simulate a logged-in user
        const mockSession = {
            user: { id: 'mock-user-uuid-12345', email: 'juan.perez@example.com' },
            access_token: 'mock-token',
            token_type: 'bearer',
        };
        callback('INITIAL_SESSION', mockSession as any);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => Promise.resolve({ error: null }),
      signInWithPassword: ({ email, password }) => {
        if (email === 'juan.perez@example.com' && password === 'password') {
            const mockUser = { id: 'mock-user-uuid-12345', email: 'juan.perez@example.com' };
            const mockSession = { user: mockUser, access_token: 'mock-token', token_type: 'bearer' };
            return Promise.resolve({ data: { user: mockUser as any, session: mockSession as any }, error: null });
        }
        return Promise.resolve({ data: { user: null, session: null }, error: { message: 'Invalid credentials' } });
      },
      updateUser: (data) => Promise.resolve({ data: { user: {id: 'mock-user-uuid-12345', email: 'juan.perez@example.com', ...data} as any }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null })
    },
  } as any;
}