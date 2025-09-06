import React, { useState, useRef, useEffect, useMemo } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import type { Database } from '../types/database';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { PlusCircleIcon, ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import QuickAddModal, { FormField as QuickFormField } from '../components/QuickAddModal.tsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useSortableData } from '../hooks/useSortableData';
import { SortableHeader } from '../components/ui/SortableHeader';


// --- Co-located Schemas and Types ---

// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const gasCompositionSchema = z.object({
    date: z.string().min(1, "La fecha es requerida."),
    time: z.string().min(1, "La hora es requerida."),
    equipo_id: z.string().min(1, "Debe seleccionar un equipo."),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    // FIX: Removed `required_error` from z.number() to fix TypeScript error.
    co2: z.number().nonnegative("El valor no puede ser negativo."),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    // FIX: Removed `required_error` from z.number() to fix TypeScript error.
    ch4: z.number().nonnegative("El valor no puede ser negativo."),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    // FIX: Removed `required_error` from z.number() to fix TypeScript error.
    o2: z.number().nonnegative("El valor no puede ser negativo."),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    // FIX: Removed `required_error` from z.number() to fix TypeScript error.
    h2s: z.number().nonnegative("El valor no puede ser negativo."),
});
type GasCompositionFormData = z.infer<typeof gasCompositionSchema>;

// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const additionalMeasurementsSchema = z.object({
    date: z.string().min(1, "La fecha es requerida."),
    time: z.string().min(1, "La hora es requerida."),
    equipo_id: z.string().min(1, "Debe seleccionar un equipo."),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    flow_scada: z.number().nonnegative("El valor no puede ser negativo.").optional(),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    // FIX: Removed `required_error` from z.number() to fix TypeScript error.
    flow_chp: z.number().nonnegative("El valor no puede ser negativo."),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    // FIX: Removed `required_error` from z.number() to fix TypeScript error.
    power: z.number().nonnegative("El valor no puede ser negativo."),
});
type AdditionalMeasurementsFormData = z.infer<typeof additionalMeasurementsSchema>;

type LecturaGas = Database['public']['Tables']['lecturas_gas']['Row'];
interface EnrichedGasReading extends LecturaGas {
    equipos?: { nombre_equipo: string } | null;
    usuarios?: { nombres: string } | null;
    consumo_m3_mw?: number | null;
    biogas_generado_m3_d?: number | null;
    biogas_generado_m3_h?: number | null;
    lhv_kwh_m3?: number | null;
    energia_entregada_chp_kw?: number | null;
    eficiencia_electrica_porcentaje?: number | null;
}

// --- Co-located API Logic ---
const fetchCompositionHistory = async () => {
    const { data, error } = await supabase.from('lecturas_gas')
        .select('*, equipos(nombre_equipo), usuarios!usuario_operador_id_fk(nombres)')
        .not('ch4_porcentaje', 'is', null)
        .order('fecha_hora', { ascending: false }).limit(15);
    if (error) throw error;
    return data;
};

const createGasComposition = async (formData: GasCompositionFormData, userId: number) => {
    const { error } = await supabase.from('lecturas_gas').insert({
        planta_id: 1,
        equipo_id_fk: Number(formData.equipo_id),
        usuario_operador_id_fk: userId,
        fecha_hora: `${formData.date} ${formData.time}:00`,
        ch4_porcentaje: formData.ch4,
        co2_porcentaje: formData.co2,
        o2_porcentaje: formData.o2,
        h2s_ppm: formData.h2s,
    });
    if (error) throw error;
    return { success: true };
};

const fetchMeasurementsHistory = async () => {
    const { data, error } = await supabase.from('lecturas_gas')
        .select('*, equipos(nombre_equipo), usuarios!usuario_operador_id_fk(nombres)')
        .not('potencia_exacta_kw', 'is', null)
        .order('fecha_hora', { ascending: false }).limit(15);
    if (error) throw error;
    return data;
};

const createAdditionalMeasurement = async (formData: AdditionalMeasurementsFormData, userId: number) => {
    const { data: energyData, error: energyError } = await supabase
        .from('energia')
        .select('generacion_electrica_total_kwh_dia')
        .eq('fecha', formData.date)
        .maybeSingle();
    if (energyError) throw new Error(`Error al buscar datos de energía: ${energyError.message}`);
    const generacion_electrica = energyData?.generacion_electrica_total_kwh_dia || 0;
    if (generacion_electrica === 0) {
        console.warn(`No hay datos de generación de energía para ${formData.date}. El biogás generado se calculará como 0.`);
    }

    const { data: gasData, error: gasError } = await supabase
        .from('lecturas_gas')
        .select('ch4_porcentaje')
        .eq('equipo_id_fk', Number(formData.equipo_id))
        .not('ch4_porcentaje', 'is', null)
        .lte('fecha_hora', `${formData.date} ${formData.time}:00`)
        .order('fecha_hora', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (gasError) throw new Error(`Error al buscar CH4: ${gasError.message}`);
    const ch4 = gasData?.ch4_porcentaje || 0;
    if (ch4 === 0) {
        throw new Error(`No se encontraron datos recientes de CH4 para este equipo. No se pueden calcular los datos de consumo del motor.`);
    }

    const power = formData.power;
    const flow_chp = formData.flow_chp;
    let consumo_m3_mw = 0;
    let energia_entregada_chp_kw = 0;
    let eficiencia_electrica_porcentaje = 0;

    if (power > 0) {
        consumo_m3_mw = (flow_chp * 3.6 / power) * 1000;
    }

    const biogas_generado_m3_d = (consumo_m3_mw * generacion_electrica) / 1000;
    const biogas_generado_m3_h = biogas_generado_m3_d / 24;
    const lhv_kwh_m3 = ch4 * (18.71 / 52.13 * 0.2778);
    energia_entregada_chp_kw = lhv_kwh_m3 * (flow_chp * 3.6);

    if (energia_entregada_chp_kw > 0) {
        eficiencia_electrica_porcentaje = (power / energia_entregada_chp_kw) * 100;
    }

    const insertData = {
        planta_id: 1,
        equipo_id_fk: Number(formData.equipo_id),
        usuario_operador_id_fk: userId,
        fecha_hora: `${formData.date} ${formData.time}:00`,
        caudal_masico_scada_kgh: formData.flow_scada || null,
        caudal_chp_ls: flow_chp,
        potencia_exacta_kw: power,
        consumo_m3_mw,
        biogas_generado_m3_d,
        biogas_generado_m3_h,
        lhv_kwh_m3,
        energia_entregada_chp_kw,
        eficiencia_electrica_porcentaje,
    };

    const { error: insertError } = await supabase.from('lecturas_gas').insert(insertData);
    if (insertError) throw insertError;

    return { success: true };
};


// --- Co-located Helper Components ---
const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${active
                ? 'border-b-2 border-primary text-primary bg-primary/10'
                : 'text-text-secondary hover:text-text-primary'
            }`}
    >
        {children}
    </button>
);

const ExportButton: React.FC<{ data: Record<string, any>[]; filename: string; disabled?: boolean; }> = ({ data, filename, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
        setIsOpen(false);
        if (format === 'csv') exportToCsv(`${filename}.csv`, data);
        else if (format === 'xlsx') exportToXlsx(filename, data);
        else if (format === 'pdf') exportToPdf(filename, data);
    };
    return (
        <div className="relative" ref={dropdownRef}>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={disabled}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" /> Exportar <ChevronDownIcon className={cn("h-4 w-4 ml-1 transition-transform", { "rotate-180": isOpen })} />
            </Button>
            <div className={cn("absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 z-10 transition-all duration-100 ease-out", isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none")}>
                <div className="py-1" role="menu" aria-orientation="vertical"><button onClick={() => handleExport('csv')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">CSV</button><button onClick={() => handleExport('xlsx')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">XLSX</button><button onClick={() => handleExport('pdf')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">PDF</button></div>
            </div>
        </div>
    );
};


// --- Feature Components ---

const GasComposition: React.FC<{ onQuickAdd: () => void }> = ({ onQuickAdd }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { equipos, loading: isEquiposLoading, error: equiposError } = useSupabaseData();
    const { data: history = [], isLoading: isHistoryLoading, error: historyError } = useQuery({ queryKey: ['compositionHistory'], queryFn: fetchCompositionHistory });
    const { publicProfile } = useAuth();
    
    const displayHistory = useMemo(() => history.map((item: EnrichedGasReading) => ({
        ...item,
        operador_nombre: item.usuarios?.nombres ?? 'N/A',
    })), [history]);

    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(displayHistory, { key: 'fecha_hora', direction: 'descending' });

    const form = useForm<GasCompositionFormData>({
        resolver: zodResolver(gasCompositionSchema),
        defaultValues: { date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), equipo_id: '', }
    });

    const mutation = useMutation({
        mutationFn: (formData: GasCompositionFormData) => {
            if (!publicProfile) throw new Error("No se ha podido identificar el usuario.");
            return createGasComposition(formData, publicProfile.id);
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Medición guardada con éxito.' });
            queryClient.invalidateQueries({ queryKey: ['compositionHistory'] });
            form.reset();
        },
        onError: (err: Error) => toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' })
    });

    const dataToExport = sortedHistory.map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        equipo: (item as EnrichedGasReading).equipos?.nombre_equipo,
        operador: item.operador_nombre,
        ch4_porcentaje: item.ch4_porcentaje,
        co2_porcentaje: item.co2_porcentaje,
        o2_porcentaje: item.o2_porcentaje,
        h2s_ppm: item.h2s_ppm,
    }));
    const commonTableClasses = { cell: "px-4 py-3 whitespace-nowrap text-sm" };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Registrar Composición de Gas</h2>
                    <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                        <FormField control={form.control} name="equipo_id" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Equipo Analizador</FormLabel><button type="button" onClick={onQuickAdd} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5" /></button></div><FormControl><Select {...field} disabled={isEquiposLoading}><option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione'}</option>{equipos.filter(e => e.categoria?.toLowerCase().includes('analizador')).map(e => (<option key={e.id} value={String(e.id)}>{e.nombre_equipo}</option>))}</Select></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="ch4" render={({ field }) => (<FormItem><FormLabel>CH₄ (%)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="co2" render={({ field }) => (<FormItem><FormLabel>CO₂ (%)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="o2" render={({ field }) => (<FormItem><FormLabel>O₂ (%)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="h2s" render={({ field }) => (<FormItem><FormLabel>H₂S (ppm)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /></div>
                        <Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Composición</Button>
                    </form></Form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold text-text-primary">Historial de Composición</h2><ExportButton data={dataToExport} filename="historial_composicion_gas" disabled={sortedHistory.length === 0} /></div>
                    {isHistoryLoading ? <p className="text-center text-text-secondary">Cargando...</p> : historyError ? <p className="text-center text-error">{(historyError as Error).message}</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-border"><thead className="bg-background"><tr><SortableHeader columnKey="fecha_hora" title="Fecha y Hora" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="ch4_porcentaje" title="CH₄ (%)" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="co2_porcentaje" title="CO₂ (%)" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="h2s_ppm" title="H₂S (ppm)" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="operador_nombre" title="Operador" sortConfig={sortConfig} onSort={requestSort} /></tr></thead><tbody className="bg-surface divide-y divide-border">{sortedHistory.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-text-secondary">No hay mediciones.</td></tr> : sortedHistory.map(item => (<tr key={item.id}><td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td><td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.ch4_porcentaje}</td><td className={commonTableClasses.cell}>{item.co2_porcentaje}</td><td className={commonTableClasses.cell}>{item.h2s_ppm}</td><td className={`${commonTableClasses.cell} text-text-secondary`}>{item.operador_nombre}</td></tr>))}</tbody></table></div>}
                </CardContent>
            </Card>
        </div>
    );
};

const AdditionalMeasurements: React.FC<{ onQuickAdd: () => void }> = ({ onQuickAdd }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { equipos, loading: isEquiposLoading, error: equiposError } = useSupabaseData();
    const { data: history = [], isLoading: isHistoryLoading, error: historyError } = useQuery({ queryKey: ['measurementsHistory'], queryFn: fetchMeasurementsHistory });
    const { publicProfile } = useAuth();

    const displayHistory = useMemo(() => history.map((item: EnrichedGasReading) => ({
        ...item,
        operador_nombre: item.usuarios?.nombres ?? 'N/A',
    })), [history]);

    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(displayHistory, { key: 'fecha_hora', direction: 'descending' });

    const form = useForm<AdditionalMeasurementsFormData>({
        resolver: zodResolver(additionalMeasurementsSchema),
        defaultValues: { date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), equipo_id: '' }
    });
    const mutation = useMutation({
        mutationFn: (formData: AdditionalMeasurementsFormData) => {
            if (!publicProfile) throw new Error("No se ha podido identificar el usuario.");
            return createAdditionalMeasurement(formData, publicProfile.id);
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Medición y cálculos guardados con éxito.' });
            queryClient.invalidateQueries({ queryKey: ['measurementsHistory'] });
            form.reset();
        },
        onError: (err: Error) => toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' })
    });
    const dataToExport = sortedHistory.map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        equipo: (item as EnrichedGasReading).equipos?.nombre_equipo,
        operador: item.operador_nombre,
        potencia_kw: item.potencia_exacta_kw,
        caudal_chp_ls: item.caudal_chp_ls,
        consumo_m3_mw: (item as EnrichedGasReading).consumo_m3_mw,
        biogas_generado_m3_d: (item as EnrichedGasReading).biogas_generado_m3_d,
        eficiencia_electrica: (item as EnrichedGasReading).eficiencia_electrica_porcentaje,
    }));
    const commonTableClasses = { cell: "px-4 py-3 whitespace-nowrap text-sm" };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Registrar Mediciones Adicionales y Consumo de Motor</h2>
                    <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                        <FormField control={form.control} name="equipo_id" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><FormLabel>Equipo (Motor CHP)</FormLabel><button type="button" onClick={onQuickAdd} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5" /></button></div><FormControl><Select {...field} disabled={isEquiposLoading}><option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione'}</option>{equipos.filter(e => e.categoria?.toLowerCase().includes('generador')).map(e => (<option key={e.id} value={String(e.id)}>{e.nombre_equipo}</option>))}</Select></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><FormField control={form.control} name="flow_scada" render={({ field }) => (<FormItem><FormLabel>Caudal Másico SCADA (kg/h)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="flow_chp" render={({ field }) => (<FormItem><FormLabel>Caudal CHP (l/s)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="power" render={({ field }) => (<FormItem><FormLabel>Potencia Exacta (kW)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} /></div>
                        <Button type="submit" variant="default" isLoading={mutation.isPending}>Calcular y Guardar</Button>
                    </form></Form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold text-text-primary">Historial y Datos de Consumo del Motor</h2><ExportButton data={dataToExport} filename="historial_consumo_motor" disabled={sortedHistory.length === 0} /></div>
                    {isHistoryLoading ? <p className="text-center text-text-secondary">Cargando...</p> : historyError ? <p className="text-center text-error">{(historyError as Error).message}</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-border"><thead className="bg-background"><tr><SortableHeader columnKey="fecha_hora" title="Fecha" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="consumo_m3_mw" title="Consumo (m³/MW)" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="biogas_generado_m3_d" title="Biogás Gen. (m³/d)" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="eficiencia_electrica_porcentaje" title="η Eléctrico (%)" sortConfig={sortConfig} onSort={requestSort} /><SortableHeader columnKey="operador_nombre" title="Operador" sortConfig={sortConfig} onSort={requestSort} /></tr></thead><tbody className="bg-surface divide-y divide-border">{sortedHistory.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-text-secondary">No hay mediciones.</td></tr> : sortedHistory.map(item => (<tr key={item.id}><td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td><td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.consumo_m3_mw?.toFixed(2) ?? 'N/A'}</td><td className={commonTableClasses.cell}>{item.biogas_generado_m3_d?.toFixed(2) ?? 'N/A'}</td><td className={commonTableClasses.cell}>{item.eficiencia_electrica_porcentaje?.toFixed(2) ?? 'N/A'}</td><td className={`${commonTableClasses.cell} text-text-secondary`}>{item.operador_nombre}</td></tr>))}</tbody></table></div>}
                </CardContent>
            </Card>
        </div>
    );
};


const GasQualityPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'composition' | 'measurements'>('composition');
    const { toast } = useToast();
    const { refreshData } = useSupabaseData();
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    const equipmentFormFields: QuickFormField[] = [
        { name: 'nombre_equipo', label: 'Nombre del Equipo', type: 'text', required: true },
        { name: 'categoria', label: 'Categoría', type: 'text', required: true, defaultValue: 'Analizador de Gas' },
        { name: 'codigo_equipo', label: 'Código / Tag', type: 'text' },
    ];

    return (
        <Page>
            <div className="mb-4 border-b border-border">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <TabButton active={activeTab === 'composition'} onClick={() => setActiveTab('composition')}>
                        Composición de Gas
                    </TabButton>
                    <TabButton active={activeTab === 'measurements'} onClick={() => setActiveTab('measurements')}>
                        Mediciones Adicionales
                    </TabButton>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'composition' ? <GasComposition onQuickAdd={() => setIsQuickAddOpen(true)} /> : <AdditionalMeasurements onQuickAdd={() => setIsQuickAddOpen(true)} />}
            </div>

            <QuickAddModal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                entityName="Equipo Analizador"
                tableName="equipos"
                formFields={equipmentFormFields}
                onSuccess={() => {
                    toast({ title: 'Éxito', description: 'Equipo añadido con éxito.' });
                    refreshData();
                }}
            />
        </Page>
    );
};

export default GasQualityPage;