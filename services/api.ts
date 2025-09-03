
import { supabase } from './supabaseClient';
import type { Database } from '../types/database';

// Tipos para simplificar
type SustratoInsert = Database['public']['Tables']['sustratos']['Insert'];
type EmpresaInsert = Database['public']['Tables']['empresa']['Insert'];
type CamionInsert = Database['public']['Tables']['camiones']['Insert'];
type LugarDescargaInsert = Database['public']['Tables']['lugares_descarga']['Insert'];
type EquipoInsert = Database['public']['Tables']['equipos']['Insert'];

// --- QUERIES ---

export const fetchDashboardData = async () => {
    const [kpiResults, chartRes] = await Promise.all([
        Promise.all([
            supabase.from('energia').select('generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').order('fecha', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('analisis_fos_tac').select('relacion_fos_tac').order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('lecturas_gas').select('ch4_porcentaje').order('fecha_hora', { ascending: false }).limit(1).maybeSingle()
        ]),
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').gte('fecha', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('fecha', { ascending: true })
    ]);

    const kpiErrors: string[] = kpiResults.map((res, i) => res.error ? `KPI ${i}: ${res.error.message}` : '').filter(Boolean);
    if (chartRes.error) kpiErrors.push(`Chart: ${chartRes.error.message}`);
    if (kpiErrors.length > 0) throw new Error(kpiErrors.join('; '));

    const [energiaRes, fosTacRes, gasRes] = kpiResults;
    const kpiData = {
        generacion: ((energiaRes.data?.generacion_electrica_total_kwh_dia || 0) / 1000).toFixed(1),
        biogas: (energiaRes.data?.flujo_biogas_kg_dia || 0).toLocaleString('es-AR'),
        fosTac: (fosTacRes.data?.relacion_fos_tac || 0).toFixed(2),
        ch4: (gasRes.data?.ch4_porcentaje || 0).toFixed(1)
    };
    const chartData = (chartRes.data || []).map(d => ({
        name: new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
        'Biogás (kg)': d.flujo_biogas_kg_dia || 0,
        'Electricidad (kWh)': d.generacion_electrica_total_kwh_dia || 0
    }));

    return { kpiData, chartData };
};

export const fetchGraphData = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [fosTacRes, gasRes, substrateRes] = await Promise.all([
        supabase.from('analisis_fos_tac').select('fecha_hora, fos_mg_l, tac_mg_l, relacion_fos_tac').not('relacion_fos_tac', 'is', null).order('fecha_hora', { ascending: true }).limit(10),
        supabase.from('lecturas_gas').select('ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm').order('fecha_hora', { ascending: false }).limit(1).single(),
        supabase.from('detalle_ingreso_sustrato').select('cantidad_kg, sustratos ( nombre )').gte('created_at', sevenDaysAgo.toISOString())
    ]);

    if (fosTacRes.error) throw new Error(`FOS/TAC: ${fosTacRes.error.message}`);
    if (gasRes.error && gasRes.error.code !== 'PGRST116') throw new Error(`Gas: ${gasRes.error.message}`);
    if (substrateRes.error) throw new Error(`Substrate: ${substrateRes.error.message}`);

    return { fosTacData: fosTacRes.data, gasData: gasRes.data, substrateData: substrateRes.data };
};

export const fetchAlimentacionHistory = async () => {
    const { data, error } = await supabase
        .from('alimentacion_biodigestor')
        .select('*, equipo_origen:equipos!alimentacion_biodigestor_equipo_origen_id_fkey(nombre_equipo), equipo_destino:equipos!alimentacion_biodigestor_equipo_destino_id_fkey(nombre_equipo)')
        .order('fecha_hora', { ascending: false }).limit(10);
    if (error) throw error;
    return data;
};

export const fetchGasQualityHistory = async () => {
    const { data, error } = await supabase.from('lecturas_gas').select('*, equipos(nombre_equipo)').order('fecha_hora', { ascending: false }).limit(15);
    if(error) throw error;
    return data;
};

export const fetchFosTacHistory = async () => {
    const { data, error } = await supabase.from('analisis_fos_tac').select('*, equipos(nombre_equipo)').order('fecha_hora', { ascending: false }).limit(15);
    if(error) throw error;
    return data;
};

export const fetchAditivosHistory = async () => {
    const { data, error } = await supabase.from('aditivos_biodigestor').select('*, equipos(nombre_equipo)').order('fecha_hora', { ascending: false }).limit(15);
    if (error) throw error;
    return data;
};

export const fetchChpHistory = async () => {
    const { data, error } = await supabase.from('cambios_potencia_chp').select('*').order('fecha_hora', { ascending: false }).limit(15);
    if (error) throw error;
    return data;
}

export const fetchEnergyHistory = async () => {
    const { data, error } = await supabase.from('energia').select('*').order('fecha', { ascending: false }).limit(15);
    if (error) throw error;
    return data;
}

export const fetchLabHistory = async () => {
    const { data, error } = await supabase.from('analisis_laboratorio').select('*, tipos_muestra ( nombre_tipo_muestra )').order('fecha_hora_registro', { ascending: false }).limit(15);
    if (error) throw error;
    return data;
}

export const fetchEnvironmentChartData = async () => {
    const { data, error } = await supabase.from('monitoreos_ambientales_detalle').select('*, monitoreos_ambientales ( fecha_monitoreo )').limit(500);
    if (error) throw error;
    return data;
};

export const fetchMantenimientoTasks = async () => {
    const { data, error } = await supabase.from('mantenimiento_eventos').select('*, equipos ( nombre_equipo )').is('fecha_fin', null).order('fecha_planificada', { ascending: true }).limit(20);
    if (error) throw error;
    return data;
};

export const fetchChecklistData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [itemsRes, recordsRes] = await Promise.all([
        supabase.from('checklist_items').select('*').order('numero_item'),
        supabase.from('checklist_registros').select('id, checklist_item_id').gte('fecha_verificacion', today.toISOString()).lt('fecha_verificacion', tomorrow.toISOString())
    ]);

    if (itemsRes.error) throw new Error(`Error fetching items: ${itemsRes.error.message}`);
    if (recordsRes.error) throw new Error(`Error fetching records: ${recordsRes.error.message}`);
    
    return { items: itemsRes.data, records: recordsRes.data };
};

export const fetchStock = async () => {
    const { data, error } = await supabase.from('repuestos').select('*').order('nombre_repuesto');
    if (error) throw error;
    return data;
};

// --- General Purpose Queries ---
export const fetchEquipos = async () => {
    const { data, error } = await supabase.from('equipos').select('*').order('nombre_equipo');
    if (error) throw error;
    return data;
};
export const fetchSustratos = async () => {
    const { data, error } = await supabase.from('sustratos').select('*').order('nombre');
    if (error) throw error;
    return data;
};
export const fetchProveedores = async () => {
    const { data, error } = await supabase.from('empresa').select('*').eq('tipo_empresa', 'proveedor').order('nombre');
    if (error) throw error;
    return data;
};
export const fetchLugaresDescarga = async () => {
    const { data, error } = await supabase.from('lugares_descarga').select('*').order('nombre');
    if (error) throw error;
    return data;
};
export const fetchCamiones = async () => {
    const { data, error } = await supabase.from('camiones').select('*').order('patente');
    if (error) throw error;
    return data;
};
export const fetchTiposMantenimiento = async () => {
    const { data, error } = await supabase.from('tipos_mantenimiento').select('*').order('nombre_tipo');
    if (error) throw error;
    return data;
};
export const fetchRemitos = async () => {
    const { data, error } = await supabase.from('ingresos_viaje_camion').select('*').order('fecha_hora_ingreso', { ascending: false }).limit(50);
    if (error) throw error;
    return data;
};
export const fetchTiposMuestra = async () => {
    const { data, error } = await supabase.from('tipos_muestra').select('*');
    if (error) throw error;
    return data;
};


// --- MUTATIONS ---

export const createIngresoSustrato = async (formData: any) => {
    const { data: viajeData, error: viajeError } = await supabase.from('ingresos_viaje_camion')
        .insert({
            planta_id: 1, usuario_operador_id: 1, fecha_hora_ingreso: new Date().toISOString(),
            camion_id: Number(formData.camion_id),
            numero_remito_general: formData.remito.toString(),
            peso_neto_kg: Number(formData.quantity),
        }).select().single();
    if (viajeError) throw viajeError;

    const { error: detalleError } = await supabase.from('detalle_ingreso_sustrato')
        .insert({
            id_viaje_ingreso_fk: viajeData.id,
            sustrato_id: Number(formData.substrate),
            proveedor_empresa_id: Number(formData.provider),
            lugar_descarga_id: Number(formData.location),
            cantidad_kg: Number(formData.quantity),
        });
    if (detalleError) throw detalleError;
    return { success: true };
};

export const createAlimentacion = async (formData: any) => {
    const { error } = await supabase.from('alimentacion_biodigestor').insert({
        planta_id: 1, usuario_operador_id: 1, fecha_hora: new Date().toISOString(),
        equipo_origen_id: Number(formData.source),
        equipo_destino_id: Number(formData.destination),
        cantidad: Number(formData.quantity),
        unidad: formData.unit.toString(),
        observaciones: formData.observations.toString() || null,
    });
    if (error) throw error;
    return { success: true };
};

export const createGasReading = async (formData: any) => {
    const { error } = await supabase.from('lecturas_gas').insert({
        equipo_id_fk: Number(formData.equipo_id),
        usuario_operador_id_fk: 1,
        fecha_hora: `${formData.date} ${formData.time}:00`,
        ch4_porcentaje: Number(formData.ch4),
        co2_porcentaje: Number(formData.co2),
        o2_porcentaje: Number(formData.o2),
        h2s_ppm: Number(formData.h2s),
        caudal_masico_scada_kgh: formData.flow_scada ? Number(formData.flow_scada) : null,
        caudal_chp_ls: formData.flow_chp ? Number(formData.flow_chp) : null,
        potencia_exacta_kw: formData.power ? Number(formData.power) : null,
    });
    if (error) throw error;
    return { success: true };
};

export const createFosTac = async (formData: any) => {
    const { error } = await supabase.from('analisis_fos_tac').insert({
        equipo_id: Number(formData.equipment),
        usuario_operador_id: 1,
        fecha_hora: `${formData.date}T${new Date().toTimeString().slice(0,8)}`,
        ph: formData.ph ? Number(formData.ph) : null,
        volumen_1_ml: Number(formData.vol1),
        volumen_2_ml: Number(formData.vol2),
    });
    if (error) throw error;
    return { success: true };
};

export const createAditivo = async (formData: any) => {
    const { error } = await supabase.from('aditivos_biodigestor').insert({
        fecha_hora: `${formData.additive_date}T${new Date().toTimeString().slice(0,8)}`,
        tipo_aditivo: formData.additive.toString(),
        cantidad_kg: Number(formData.additive_quantity),
        equipo_id: Number(formData.additive_bio),
        usuario_operador_id: 1,
    });
    if(error) throw error;
    return { success: true };
};

export const createChpChange = async (formData: any) => {
    const { error } = await supabase.from('cambios_potencia_chp').insert({
        planta_id: 1, usuario_operador_id: 1,
        fecha_hora: `${formData.date}T${formData.time}:00`,
        potencia_inicial_kw: Number(formData.initial_power),
        potencia_programada_kw: Number(formData.programmed_power),
        motivo_cambio: formData.reason.toString(),
        observaciones: formData.observations ? formData.observations.toString() : null,
    });
    if (error) throw error;
    return { success: true };
};

export const createEnergyRecord = async (formData: any) => {
    const { error } = await supabase.from('energia').insert({
        planta_id: 1,
        fecha: formData.date.toString(),
        generacion_electrica_total_kwh_dia: Number(formData.total_gen) || null,
        despacho_spot_smec_kwh_dia: Number(formData.spot_dispatch) || null,
        totalizador_smec_kwh: Number(formData.smec_total) || null,
        totalizador_chp_mwh: Number(formData.chp_total) || null,
        horas_funcionamiento_motor_chp_dia: Number(formData.motor_hours) || null,
        tiempo_funcionamiento_antorcha_s_dia: Number(formData.torch_time) || null,
        flujo_biogas_kg_dia: Number(formData.biogas_flow) || null,
    });
    if (error) throw error;
    return { success: true };
};

export const createLabAnalysis = async (formData: any) => {
    const { data: analysisData, error: analysisError } = await supabase.from('analisis_laboratorio')
        .insert({
            planta_id: 1, usuario_analista_id: 1,
            fecha_hora_registro: new Date().toISOString(),
            fecha_hora_muestra: `${formData.date}T${formData.time}:00`,
            numero_remito_asociado: formData.remito.toString(),
            tipo_muestra_id: Number(formData.sampleType),
            peso_muestra_g: formData.sampleWeight ? Number(formData.sampleWeight) : null,
            tiempo_analisis_segundos: formData.analysisTime ? Number(formData.analysisTime) : null,
            temperatura_muestra_c: formData.sampleTemp ? Number(formData.sampleTemp) : null,
            observaciones: formData.observations.toString() || null,
        }).select().single();
    if (analysisError) throw analysisError;

    const parameters = [
        { parametro: 'pH', valor: formData.ph, unidad: null },
        { parametro: 'Sólidos Totales', valor: formData.totalSolids, unidad: '%' },
    ];
    const detailInserts = parameters.filter(p => p.valor).map(p => ({
        analisis_laboratorio_id: analysisData.id,
        parametro: p.parametro,
        valor: Number(p.valor),
        unidad: p.unidad,
    }));

    if (detailInserts.length > 0) {
        const { error: detailError } = await supabase.from('analisis_laboratorio_detalle').insert(detailInserts);
        if (detailError) throw detailError;
    }
    return { success: true };
};

export const createMonitoreoAmbiental = async ({ mainData, details }: { mainData: any, details: any[] }) => {
    const { data: monitoreoData, error: monitoreoError } = await supabase.from('monitoreos_ambientales')
        .insert({
            planta_id: 1, usuario_operador_id: 1,
            fecha_monitoreo: mainData.date.toString(),
            tipo_monitoreo: mainData.monitoringType.toString(),
            observaciones: mainData.observations.toString() || null,
        }).select().single();
    if (monitoreoError) throw monitoreoError;

    if (details.length > 0) {
        const detailsToInsert = details.map(({ tempId, ...rest }) => ({
            ...rest,
            monitoreo_id: monitoreoData.id,
        }));
        const { error: detailError } = await supabase.from('monitoreos_ambientales_detalle').insert(detailsToInsert);
        if (detailError) throw detailError;
    }
    return { success: true };
};

export const createMaintenanceTask = async (taskData: any) => {
    const { error } = await supabase.from('mantenimiento_eventos').insert(taskData);
    if (error) throw error;
    return { success: true };
};

export const updateMaintenanceTask = async ({ id, isCompleted }: {id: number, isCompleted: boolean}) => {
    const { error } = await supabase.from('mantenimiento_eventos').update({ fecha_fin: isCompleted ? new Date().toISOString() : null }).eq('id', id);
    if(error) throw error;
    return { success: true };
};

export const verifyChecklistItem = async (itemId: number) => {
    const { error } = await supabase.from('checklist_registros').insert({
        checklist_item_id: itemId,
        usuario_operador_id: 1, 
        fecha_verificacion: new Date().toISOString(),
        estado_verificacion: 'OK',
    });
    if (error) throw error;
    return { success: true };
};

export const createStockItem = async (itemData: any) => {
    const { error } = await supabase.from('repuestos').insert({ ...itemData, planta_id: 1 });
    if (error) throw error;
    return { success: true };
};

export const updateStockItem = async ({ id, ...itemData }: any) => {
    const { error } = await supabase.from('repuestos').update(itemData).eq('id', id);
    if (error) throw error;
    return { success: true };
};

export const deleteStockItem = async (id: number) => {
    const { error } = await supabase.from('repuestos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
};

// --- Management Page Mutations ---
// FIX: Changed tableName type from 'string' to a specific key of Database tables to satisfy Supabase client's type requirements.
export const createEntity = async ({ tableName, data }: { tableName: keyof Database['public']['Tables']; data: any }) => {
    const { error } = await supabase.from(tableName).insert(data as any);
    if (error) throw error;
    return { success: true };
};

// FIX: Changed tableName type from 'string' to a specific key of Database tables to satisfy Supabase client's type requirements.
export const updateEntity = async ({ tableName, data, id }: { tableName: keyof Database['public']['Tables']; data: any; id: number }) => {
    const { error } = await supabase.from(tableName).update(data as any).eq('id', id);
    if (error) throw error;
    return { success: true };
};

// FIX: Changed tableName type from 'string' to a specific key of Database tables to satisfy Supabase client's type requirements.
export const deleteEntity = async ({ tableName, id }: { tableName: keyof Database['public']['Tables']; id: number }) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
};
