import React, { useState, useRef, useEffect } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
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
import { exportToCsv, exportToPdf } from '../lib/utils';
import { cn } from '../lib/utils';

// --- Co-located Zod Schema ---
const gasReadingSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  time: z.string().min(1, "La hora es requerida."),
  equipo_id: z.string().min(1, "Debe seleccionar un equipo."),
  co2: z.number().nonnegative("Debe ser un valor no negativo."),
  ch4: z.number().nonnegative("Debe ser un valor no negativo."),
  o2: z.number().nonnegative("Debe ser un valor no negativo."),
  h2s: z.number().nonnegative("Debe ser un valor no negativo."),
  flow_scada: z.number().nonnegative("Debe ser un valor no negativo.").optional(),
  flow_chp: z.number().nonnegative("Debe ser un valor no negativo.").optional(),
  power: z.number().nonnegative("Debe ser un valor no negativo.").optional(),
});
type GasReadingFormData = z.infer<typeof gasReadingSchema>;


// --- Co-located API Logic ---
const fetchGasQualityHistory = async () => {
    const { data, error } = await supabase.from('lecturas_gas').select('*, equipos(nombre_equipo)').order('fecha_hora', { ascending: false }).limit(15);
    if(error) throw error;
    return data;
};

const createGasReading = async (formData: GasReadingFormData) => {
    const { error } = await supabase.from('lecturas_gas').insert({
        planta_id: 1, // Hardcoded for demo
        equipo_id_fk: Number(formData.equipo_id),
        usuario_operador_id_fk: 1, // Hardcoded for demo
        fecha_hora: `${formData.date} ${formData.time}:00`,
        ch4_porcentaje: formData.ch4,
        co2_porcentaje: formData.co2,
        o2_porcentaje: formData.o2,
        h2s_ppm: formData.h2s,
        caudal_masico_scada_kgh: formData.flow_scada || null,
        caudal_chp_ls: formData.flow_chp || null,
        potencia_exacta_kw: formData.power || null,
    });
    if (error) throw error;
    return { success: true };
};

// --- Co-located Export Component ---
const ExportButton: React.FC<{ data: Record<string, any>[]; filename: string; disabled?: boolean; }> = ({ data, filename, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = (format: 'csv' | 'xls' | 'pdf') => {
        setIsOpen(false);
        if (format === 'csv' || format === 'xls') {
            exportToCsv(`${filename}.${format}`, data);
        } else if (format === 'pdf') {
            exportToPdf(filename, data);
        }
    };

    return (
        <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={disabled}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDownIcon className={cn("h-4 w-4 ml-1 transition-transform", { "rotate-180": isOpen })} />
            </Button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 z-10 animate-toast-in origin-top">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <button onClick={() => handleExport('csv')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                            Exportar como CSV
                        </button>
                        <button onClick={() => handleExport('xls')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                            Exportar como XLS
                        </button>
                        <button onClick={() => handleExport('pdf')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                            Exportar como PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Feature Components ---
type LecturaGas = Database['public']['Tables']['lecturas_gas']['Row'];
interface GasReadingHistoryItem extends LecturaGas {
    equipos?: { nombre_equipo: string } | null;
}

const GasQualityPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    
    const { equipos, loading: isEquiposLoading, error: equiposError, refreshData } = useSupabaseData();
    const { data: history = [], isLoading: isHistoryLoading, error: historyError } = useQuery({ 
        queryKey: ['gasQualityHistory'], 
        queryFn: fetchGasQualityHistory 
    });

    const form = useForm<GasReadingFormData>({
        resolver: zodResolver(gasReadingSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            equipo_id: '',
            co2: undefined,
            ch4: undefined,
            o2: undefined,
            h2s: undefined,
            flow_scada: undefined,
            flow_chp: undefined,
            power: undefined,
        }
    });

    const mutation = useMutation({
        mutationFn: createGasReading,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Medición guardada con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['gasQualityHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' });
        }
    });
    
    const onSubmit = (data: GasReadingFormData) => {
        mutation.mutate(data);
    };

    const dataToExport = history.map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        equipo: (item as GasReadingHistoryItem).equipos?.nombre_equipo,
        ch4_porcentaje: item.ch4_porcentaje,
        co2_porcentaje: item.co2_porcentaje,
        o2_porcentaje: item.o2_porcentaje,
        h2s_ppm: item.h2s_ppm,
        potencia_kw: item.potencia_exacta_kw ?? 'N/A',
        caudal_scada_kgh: item.caudal_masico_scada_kgh ?? 'N/A',
        caudal_chp_ls: item.caudal_chp_ls ?? 'N/A',
    }));

    const equipmentFormFields: QuickFormField[] = [
        { name: 'nombre_equipo', label: 'Nombre del Equipo', type: 'text', required: true },
        { name: 'categoria', label: 'Categoría', type: 'text', required: true, defaultValue: 'Analizador de Gas' },
        { name: 'codigo_equipo', label: 'Código / Tag', type: 'text' },
    ];


    if (equiposError) {
        return (
            <Page>
                <Card>
                    <CardContent className="pt-6">
                        <h2 className="text-lg font-semibold text-error mb-2">Error de Carga</h2>
                        <p className="text-text-secondary">No se pudo cargar la lista de equipos.</p>
                        <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{equiposError}</pre>
                    </CardContent>
                </Card>
            </Page>
        );
    }
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1">Registrar Calidad de Gas</h2>
                  <p className="text-sm text-text-secondary mb-4">Cargar los valores del analizador de gas de la planta.</p>
                  
                  <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="time" render={({ field }) => (
                                <FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        
                        <FormField control={form.control} name="equipo_id" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel>Equipo Analizador</FormLabel>
                                  <button type="button" onClick={() => setIsQuickAddOpen(true)} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5" /></button>
                                </div>
                                <FormControl>
                                  <Select {...field} disabled={isEquiposLoading}>
                                    <option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione un equipo'}</option>
                                    {equipos.filter(e => e.categoria?.toLowerCase().includes('analizador')).map(e => (
                                        <option key={e.id} value={String(e.id)}>{e.nombre_equipo}</option>
                                    ))}
                                  </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <fieldset className="border-t border-border pt-4">
                            <legend className="text-base font-semibold text-text-primary mb-2">Composición del Gas</legend>
                            <div className="grid grid-cols-2 gap-4">
                               <FormField control={form.control} name="co2" render={({ field }) => (
                                   <FormItem><FormLabel>CO₂ (%)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                               )} />
                               <FormField control={form.control} name="ch4" render={({ field }) => (
                                   <FormItem><FormLabel>CH₄ (%)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                               )} />
                               <FormField control={form.control} name="o2" render={({ field }) => (
                                   <FormItem><FormLabel>O₂ (%)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                               )} />
                               <FormField control={form.control} name="h2s" render={({ field }) => (
                                   <FormItem><FormLabel>H₂S (ppm)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                               )} />
                            </div>
                        </fieldset>
                        
                        <fieldset className="border-t border-border pt-4">
                            <legend className="text-base font-semibold text-text-primary mb-2">Mediciones Adicionales</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="flow_scada" render={({ field }) => (
                                   <FormItem><FormLabel>Caudal Másico SCADA (kg/h)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="flow_chp" render={({ field }) => (
                                   <FormItem><FormLabel>Caudal CHP (l/s)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="power" render={({ field }) => (
                                   <FormItem><FormLabel>Potencia Exacta (kW)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </fieldset>
                        
                        <div className="pt-4">
                            <Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Medición</Button>
                        </div>
                    </form>
                  </Form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                   <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Historial de Mediciones Recientes</h2>
                        <ExportButton data={dataToExport} filename="historial_calidad_gas" disabled={history.length === 0} />
                   </div>
                   {isHistoryLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                   ) : historyError ? (
                      <p className="text-center text-error">{historyError.message}</p>
                   ) : history.length === 0 ? (
                      <p className="text-center text-text-secondary py-4">No hay mediciones registradas todavía.</p>
                   ) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <th className={commonTableClasses.head}>Fecha y Hora</th>
                                       <th className={commonTableClasses.head}>Equipo</th>
                                       <th className={commonTableClasses.head}>CH₄ (%)</th>
                                       <th className={commonTableClasses.head}>CO₂ (%)</th>
                                       <th className={commonTableClasses.head}>H₂S (ppm)</th>
                                       <th className={commonTableClasses.head}>Potencia (kW)</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {history.map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{(item as GasReadingHistoryItem).equipos?.nombre_equipo}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.ch4_porcentaje}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.co2_porcentaje}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.h2s_ppm}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.potencia_exacta_kw ?? 'N/A'}</td>
                                      </tr>
                                  ))}
                               </tbody>
                          </table>
                      </div>
                   )}
                </CardContent>
            </Card>

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