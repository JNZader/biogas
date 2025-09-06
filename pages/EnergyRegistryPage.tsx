import React, { useState, useRef, useEffect, useMemo } from 'react';
import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { useAuth } from '../contexts/AuthContext';
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { cn } from '../lib/utils';
import { useSortableData } from '../hooks/useSortableData';
import { SortableHeader } from '../components/ui/SortableHeader';

type EnergiaRecord = Database['public']['Tables']['energia']['Row'];
const PLAN_COMPROMISO_MWH_DIA = 28.8;

// --- Co-located Zod Schema ---
// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const energySchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  total_gen: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo."),
  spot_dispatch: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo."),
  total_dispatch_smec: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo."),
  smec_total: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo."),
  chp_total: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo."),
  motor_hours: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo.").max(24, "No puede exceder 24 horas."),
  torch_time: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo.").optional(),
  biogas_flow: z.number({invalid_type_error: "Debe ser un número."}).nonnegative("Debe ser un número no negativo."),
}).refine(data => !data.total_dispatch_smec || data.total_dispatch_smec >= (data.spot_dispatch || 0), {
    message: "El despacho total no puede ser menor que el despacho SPOT.",
    path: ["total_dispatch_smec"],
});
type EnergyFormData = z.infer<typeof energySchema>;

// --- Co-located API Logic ---
const fetchEnergyHistory = async (plantaId: number): Promise<EnergiaRecord[]> => {
    const { data, error } = await supabase
        .from('energia')
        .select('*')
        .eq('planta_id', plantaId)
        .order('fecha', { ascending: false })
        .limit(30);
    if (error) throw error;
    return data || [];
};

const saveAndCalculateEnergyRecord = async (formData: EnergyFormData, plantaId: number) => {
    // 1. Fetch previous day's record to use its totalizers
    const currentDate = new Date(formData.date + 'T12:00:00Z'); // Use noon to avoid timezone issues
    const previousDate = new Date(currentDate);
    previousDate.setDate(currentDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split('T')[0];

    const { data: previousDayRecord, error: fetchError } = await supabase
        .from('energia')
        .select('*')
        .eq('planta_id', plantaId)
        .eq('fecha', previousDateStr)
        .maybeSingle();

    if (fetchError) throw new Error(`Error al buscar datos del día anterior: ${fetchError.message}`);

    // 2. Calculate values for the CURRENT day's record
    const despacho_ren2_kwh_dia = formData.total_dispatch_smec - formData.spot_dispatch;
    const totalizador_biogas_kg = (formData.biogas_flow || 0) + (previousDayRecord?.totalizador_biogas_kg || 0);
    const disponibilidad_motor_hs_dia = (formData.motor_hours / 24) * 100;

    // 3. Prepare new record for INSERTION
    const recordToInsert = {
        planta_id: plantaId,
        fecha: formData.date,
        generacion_electrica_total_kwh_dia: formData.total_gen,
        despacho_spot_smec_kwh_dia: formData.spot_dispatch,
        totalizador_smec_kwh: formData.smec_total,
        totalizador_chp_mwh: formData.chp_total,
        horas_funcionamiento_motor_chp_dia: formData.motor_hours,
        tiempo_funcionamiento_antorcha_s_dia: formData.torch_time || null,
        flujo_biogas_kg_dia: formData.biogas_flow,
        despacho_ren2_kwh_dia,
        totalizador_biogas_kg,
        disponibilidad_motor_hs_dia,
    };

    const { error: insertError } = await supabase.from('energia').insert(recordToInsert);
    if (insertError) throw new Error(`Error al insertar nuevo registro: ${insertError.message}`);

    // 4. If a previous day record exists, calculate and UPDATE it
    if (previousDayRecord) {
        const consumo_mwh = (formData.chp_total - (previousDayRecord.totalizador_chp_mwh || 0)) - ((formData.smec_total - (previousDayRecord.totalizador_smec_kwh || 0)) / 1000);
        const gen_e_total_previo = previousDayRecord.generacion_electrica_total_kwh_dia || 0;
        const autoconsumo_porcentaje = gen_e_total_previo > 0 ? ((consumo_mwh * 1000) / gen_e_total_previo) * 100 : 0;
        
        const { error: updateError } = await supabase
            .from('energia')
            .update({ consumo_mwh, autoconsumo_porcentaje })
            .eq('id', previousDayRecord.id);

        if (updateError) {
            // This is a non-critical error, log it and inform the user
            console.warn(`Failed to update previous day's calculated fields: ${updateError.message}`);
            throw new Error('El registro se guardó, pero no se pudieron actualizar los cálculos del día anterior.');
        }
    }
    return { success: true };
};

// --- Co-located Components ---
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

const KpiCard: React.FC<{ title: string; value: string; unit?: string }> = ({ title, value, unit }) => (
    <Card>
        <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
            <p className="text-2xl font-bold text-primary">
                {value}
                {unit && <span className="text-base font-normal text-text-secondary ml-1">{unit}</span>}
            </p>
        </CardContent>
    </Card>
);

const EnergyRegistryPage: React.FC = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { activePlanta } = useAuth();
    
    const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery({
        queryKey: ['energyHistory', activePlanta?.id],
        queryFn: () => fetchEnergyHistory(activePlanta!.id),
        enabled: !!activePlanta,
    });
    
    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(history, { key: 'fecha', direction: 'descending' });

    const form = useForm<EnergyFormData>({
        resolver: zodResolver(energySchema),
        defaultValues: { date: new Date().toISOString().split('T')[0] },
    });

    const mutation = useMutation({
        mutationFn: (formData: EnergyFormData) => saveAndCalculateEnergyRecord(formData, activePlanta!.id),
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Registro diario guardado y cálculos actualizados.' });
            form.reset({ date: new Date().toISOString().split('T')[0] });
            queryClient.invalidateQueries({ queryKey: ['energyHistory'] });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' });
        }
    });

    const onSubmit = (formData: EnergyFormData) => {
        if (!activePlanta) {
            toast({ title: 'Error', description: 'Planta no seleccionada.', variant: 'destructive' });
            return;
        }
        mutation.mutate(formData);
    };
    
    const latestRecord = useMemo(() => sortedHistory.length > 0 ? sortedHistory[0] : null, [sortedHistory]);
    
    const dataToExport = sortedHistory.map(item => ({
        fecha: new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-AR'),
        generacion_electrica_total_kwh_dia: item.generacion_electrica_total_kwh_dia,
        despacho_ren2_kwh_dia: item.despacho_ren2_kwh_dia,
        despacho_comprometido_porcentaje: item.despacho_ren2_kwh_dia ? `${(((item.despacho_ren2_kwh_dia / 1000) / PLAN_COMPROMISO_MWH_DIA) * 100).toFixed(1)}%` : 'N/A',
        flujo_biogas_kg_dia: item.flujo_biogas_kg_dia,
        totalizador_biogas_kg: item.totalizador_biogas_kg,
        horas_motor_chp: item.horas_funcionamiento_motor_chp_dia,
        disponibilidad_motor_porcentaje: item.disponibilidad_motor_hs_dia ? `${item.disponibilidad_motor_hs_dia.toFixed(1)}%` : 'N/A',
        consumo_mwh: item.consumo_mwh,
        consumo_promedio_mwh: item.consumo_mwh ? (item.consumo_mwh / 24).toFixed(3) : 'N/A',
        autoconsumo_porcentaje: item.autoconsumo_porcentaje ? `${item.autoconsumo_porcentaje.toFixed(1)}%` : 'N/A',
    }));

    const commonTableClasses = { cell: "px-4 py-3 whitespace-nowrap text-sm" };

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-1">Registro Diario de Energía</h2>
                    <p className="text-sm text-text-secondary mb-4">Información generada y tomada de la red (SMEC).</p>
                    <Form {...form}>
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <FormField control={form.control} name="total_gen" render={({ field }) => (<FormItem><FormLabel>Generación Eléctrica Total (kWh/d)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="biogas_flow" render={({ field }) => (<FormItem><FormLabel>Flujo de Biogás (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="total_dispatch_smec" render={({ field }) => (<FormItem><FormLabel>Despacho total según SMEC (kWh/d)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="spot_dispatch" render={({ field }) => (<FormItem><FormLabel>Despacho SPOT (SMEC) (kWh/d)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="smec_total" render={({ field }) => (<FormItem><FormLabel>Totalizador SMEC (kWh)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="chp_total" render={({ field }) => (<FormItem><FormLabel>Totalizador CHP (MWh)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="motor_hours" render={({ field }) => (<FormItem><FormLabel>Horas Funcionamiento Motor (hrs)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="torch_time" render={({ field }) => (<FormItem><FormLabel>Tiempo Funcionamiento Antorcha (seg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="pt-4"><Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Registro Diario</Button></div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="Último Consumo" value={latestRecord?.consumo_mwh?.toFixed(3) ?? '--'} unit="MWh" />
                <KpiCard title="Último Autoconsumo" value={latestRecord?.autoconsumo_porcentaje?.toFixed(1) ?? '--'} unit="%" />
                <KpiCard title="Disponibilidad Motor" value={latestRecord?.disponibilidad_motor_hs_dia?.toFixed(1) ?? '--'} unit="%" />
            </div>

            <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Historial de Registros Recientes</h3>
                        <ExportButton data={dataToExport} filename="historial_energia" disabled={sortedHistory.length === 0} />
                  </div>
                   {historyLoading ? (<p className="text-center text-text-secondary">Cargando historial...</p>) : 
                   historyError ? (<p className="text-center text-red-500">{historyError.message}</p>) : 
                   sortedHistory.length === 0 ? (<p className="text-center text-text-secondary py-4">No hay registros de energía.</p>) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <SortableHeader columnKey="fecha" title="Fecha" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="generacion_electrica_total_kwh_dia" title="Gen. Eléctrica (kWh)" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="despacho_ren2_kwh_dia" title="Despacho REN2 (kWh)" sortConfig={sortConfig} onSort={requestSort} />
                                       <th className={commonTableClasses.cell.replace('whitespace-nowrap', '') + ' text-xs font-medium text-text-secondary uppercase tracking-wider'}>% Despacho Comp.</th>
                                       <SortableHeader columnKey="consumo_mwh" title="Consumo (MWh)" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="autoconsumo_porcentaje" title="Autoconsumo (%)" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="disponibilidad_motor_hs_dia" title="Disponibilidad Motor (%)" sortConfig={sortConfig} onSort={requestSort} />
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {sortedHistory.map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.generacion_electrica_total_kwh_dia?.toLocaleString('es-AR') ?? 'N/A'}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.despacho_ren2_kwh_dia?.toLocaleString('es-AR') ?? 'N/A'}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.despacho_ren2_kwh_dia ? `${(((item.despacho_ren2_kwh_dia / 1000) / PLAN_COMPROMISO_MWH_DIA) * 100).toFixed(1)}%` : 'N/A'}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.consumo_mwh?.toFixed(3) ?? 'N/A'}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.autoconsumo_porcentaje?.toFixed(1) ?? 'N/A'}%</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.disponibilidad_motor_hs_dia?.toFixed(1) ?? 'N/A'}%</td>
                                      </tr>
                                  ))}
                               </tbody>
                          </table>
                      </div>
                   )}
                </CardContent>
            </Card>
        </Page>
    );
};

export default EnergyRegistryPage;
