import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import QuickAddModal, { FormField as QuickFormField } from '../components/QuickAddModal.tsx';
import { useToast } from '../hooks/use-toast.ts';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';


type AnalisisLaboratorio = Database['public']['Tables']['analisis_laboratorio']['Row'];
type TipoMuestra = Database['public']['Tables']['tipos_muestra']['Row'];
type DetalleIngreso = Database['public']['Tables']['detalle_ingreso_sustrato']['Row'] & {
    ingresos_viaje_camion: { numero_remito_general: string | null } | null;
    sustratos: { nombre: string } | null;
};
type AnalisisLaboratorioInsert = Database['public']['Tables']['analisis_laboratorio']['Insert'];
type AnalisisDetalleInsert = Database['public']['Tables']['analisis_laboratorio_detalle']['Insert'];

// --- Co-located Zod Schema ---
// FIX: Refactored Zod schema to use valid syntax for number coercion, resolving multiple TypeScript errors.
const labAnalysisSchema = z.object({
    date: z.string().min(1, "La fecha es requerida."),
    time: z.string().min(1, "La hora es requerida."),
    detalle_ingreso_sustrato_id: z.string().optional(),
    equipo_asociado_id: z.string().optional(),
    sampleType: z.string().min(1, "El tipo de muestra es requerido."),
    sampleWeight: z.coerce.number().nonnegative("El peso no puede ser negativo.").optional(),
    analysisTime: z.coerce.number().nonnegative("El tiempo no puede ser negativo.").optional(),
    sampleTemp: z.coerce.number().optional(),
    observations: z.string().optional(),
    ph: z.coerce.number().min(0).max(14).optional(),
    totalSolids: z.coerce.number().min(0, "No puede ser negativo.").max(100, "No puede ser mayor a 100.").optional(),
});
type LabAnalysisFormData = z.infer<typeof labAnalysisSchema>;


// --- Co-located API Logic ---
const fetchTiposMuestra = async (): Promise<TipoMuestra[]> => {
    const { data, error } = await supabase.from('tipos_muestra').select('*');
    if (error) throw error;
    return data || [];
};

const fetchDetalleIngresos = async (): Promise<DetalleIngreso[]> => {
    const { data, error } = await supabase.from('detalle_ingreso_sustrato').select('*, ingresos_viaje_camion(numero_remito_general), sustratos(nombre)').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data as any || [];
};

const fetchAnalisisHistory = async (): Promise<AnalisisLaboratorio[]> => {
    const { data, error } = await supabase.from('analisis_laboratorio').select('*, tipos_muestra ( nombre_tipo_muestra )').order('fecha_hora_registro', { ascending: false }).limit(15);
    if (error) throw error;
    return data as any || [];
};

const createAnalisis = async (analysisData: { main: AnalisisLaboratorioInsert, details: Omit<AnalisisDetalleInsert, 'analisis_laboratorio_id'>[] }) => {
    const { data: newAnalysis, error: mainError } = await supabase
        .from('analisis_laboratorio')
        .insert(analysisData.main)
        .select()
        .single();

    if (mainError) throw mainError;

    if (analysisData.details.length > 0) {
        const detailsToInsert = analysisData.details.map(d => ({ ...d, analisis_laboratorio_id: newAnalysis.id }));
        const { error: detailError } = await supabase.from('analisis_laboratorio_detalle').insert(detailsToInsert);
        if (detailError) throw detailError;
    }
};


const LaboratoryPage: React.FC = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { activePlanta, publicProfile } = useAuth();
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    const { data: tiposMuestra = [], isLoading: tiposLoading } = useQuery({ queryKey: ['tiposMuestra'], queryFn: fetchTiposMuestra });
    const { data: detalleIngresos = [], isLoading: ingresosLoading } = useQuery({ queryKey: ['detalleIngresos'], queryFn: fetchDetalleIngresos });
    const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery({ queryKey: ['analisisHistory'], queryFn: fetchAnalisisHistory });

    const form = useForm<LabAnalysisFormData>({
        resolver: zodResolver(labAnalysisSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            detalle_ingreso_sustrato_id: "",
            equipo_asociado_id: "",
            sampleType: "",
            observations: "",
        },
    });
    
    const mutation = useMutation({
        mutationFn: createAnalisis,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Análisis guardado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['analisisHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' });
        }
    });

    const onSubmit = async (data: LabAnalysisFormData) => {
        if (!activePlanta || !publicProfile) {
            toast({ title: 'Error', description: 'Usuario o planta no identificados.', variant: 'destructive' });
            return;
        }

        const detalleIngresoId = data.detalle_ingreso_sustrato_id ? Number(data.detalle_ingreso_sustrato_id) : null;
        const selectedDetalle = detalleIngresoId ? detalleIngresos.find(d => d.id === detalleIngresoId) : null;
        
        const mainData: AnalisisLaboratorioInsert = {
            planta_id: activePlanta.id,
            usuario_analista_id: publicProfile.id,
            fecha_hora_registro: new Date().toISOString(),
            fecha_hora_muestra: `${data.date}T${data.time}:00`,
            detalle_ingreso_sustrato_id: detalleIngresoId,
            numero_remito_asociado: selectedDetalle?.ingresos_viaje_camion?.numero_remito_general || null,
            equipo_asociado_id: data.equipo_asociado_id ? Number(data.equipo_asociado_id) : null,
            tipo_muestra_id: Number(data.sampleType),
            peso_muestra_g: data.sampleWeight,
            tiempo_analisis_segundos: data.analysisTime,
            temperatura_muestra_c: data.sampleTemp,
            observaciones: data.observations,
        };

        const detailData = [
            { parametro: 'pH', valor: data.ph, unidad: null },
            { parametro: 'Sólidos Totales', valor: data.totalSolids, unidad: '%' },
        ].filter(p => p.valor !== undefined && p.valor !== null).map(p => ({ parametro: p.parametro as string, valor: Number(p.valor), unidad: p.unidad }));
        
        mutation.mutate({ main: mainData, details: detailData });
    };
    
    const sampleTypeFormFields: QuickFormField[] = [
        { name: 'nombre_tipo_muestra', label: 'Nombre del Tipo de Muestra', type: 'text', required: true },
        { name: 'categoria', label: 'Categoría', type: 'text', required: true, defaultValue: 'General' },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    ];

    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-1">Análisis de Laboratorio</h2>
                    <p className="text-sm text-text-secondary mb-4">Registrar mediciones de muestras de sustratos.</p>
                    
                    <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem><FormLabel>Fecha Muestra</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="time" render={({ field }) => (
                                <FormItem><FormLabel>Hora Muestra</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                        </div>
                        
                        <FormField control={form.control} name="detalle_ingreso_sustrato_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Muestra de Ingreso (Opcional)</FormLabel>
                                <FormControl>
                                    <Select {...field} disabled={ingresosLoading}>
                                        <option value="">{ingresosLoading ? 'Cargando ingresos...' : 'Seleccione un ingreso...'}</option>
                                        {detalleIngresos.map(d => (
                                            <option key={d.id} value={String(d.id)}>
                                                {`Remito ${d.ingresos_viaje_camion?.numero_remito_general || `ID ${d.id_viaje_ingreso_fk}`} - ${d.sustratos?.nombre || 'Sustrato'}`}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                         <FormField control={form.control} name="equipo_asociado_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Equipo Asociado (Opcional)</FormLabel>
                                <FormControl>
                                    <Select {...field} disabled={dataLoading}>
                                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione un equipo...'}</option>
                                        {equipos.map(e => <option key={e.id} value={String(e.id)}>{e.nombre_equipo}</option>)}
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="sampleType" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel>Tipo de Muestra</FormLabel>
                                    <button type="button" onClick={() => setIsQuickAddOpen(true)} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5" /></button>
                                </div>
                                <FormControl>
                                    <Select {...field} disabled={tiposLoading}>
                                        <option value="">{tiposLoading ? 'Cargando...' : 'Seleccione tipo'}</option>
                                        {tiposMuestra.map(t => <option key={t.id} value={String(t.id)}>{t.nombre_tipo_muestra}</option>)}
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <FormField control={form.control} name="ph" render={({ field }) => (
                                <FormItem><FormLabel>pH</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="sampleWeight" render={({ field }) => (
                                <FormItem><FormLabel>Peso de Muestra (g)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="totalSolids" render={({ field }) => (
                                <FormItem><FormLabel>Sólidos Totales (ST) (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="analysisTime" render={({ field }) => (
                                <FormItem><FormLabel>Tiempo de Análisis (seg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="sampleTemp" render={({ field }) => (
                                <FormItem><FormLabel>Temperatura Muestra (°C)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="observations" render={({ field }) => (
                            <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="pt-4">
                            <Button type="submit" variant="default" isLoading={mutation.isPending || dataLoading} disabled={dataLoading}>Guardar Análisis</Button>
                        </div>
                    </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                     <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de Análisis Recientes</h2>
                     {historyLoading ? (
                        <p className="text-center text-text-secondary">Cargando historial...</p>
                     ) : historyError ? (
                        <p className="text-center text-red-500">{historyError.message}</p>
                     ) : history.length === 0 ? (
                        <p className="text-center text-text-secondary py-4">No hay análisis registrados todavía.</p>
                     ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                 <thead className="bg-background">
                                     <tr>
                                         <th className={commonTableClasses.head}>Fecha y Hora</th>
                                         <th className={commonTableClasses.head}>Tipo Muestra</th>
                                         <th className={`${commonTableClasses.head} hidden sm:table-cell`}>Remito</th>
                                         <th className={commonTableClasses.head}>Temp (°C)</th>
                                     </tr>
                                 </thead>
                                 <tbody className="bg-surface divide-y divide-border">
                                    {history.map(item => (
                                        <tr key={item.id}>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora_muestra!).toLocaleString('es-AR')}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{(item as any).tipos_muestra.nombre_tipo_muestra}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary hidden sm:table-cell`}>{item.numero_remito_asociado ?? 'N/A'}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>{item.temperatura_muestra_c ?? 'N/A'}</td>
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
                entityName="Tipo de Muestra"
                tableName="tipos_muestra"
                formFields={sampleTypeFormFields}
                onSuccess={() => {
                    toast({ title: 'Éxito', description: 'Tipo de muestra añadido con éxito.' });
                    queryClient.invalidateQueries({ queryKey: ['tiposMuestra'] });
                }}
            />
        </Page>
    );
};

export default LaboratoryPage;
