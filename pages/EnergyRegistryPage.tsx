import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';

type EnergiaRecord = Database['public']['Tables']['energia']['Row'];

// --- Co-located Zod Schema ---
// FIX: Replaced z.coerce.number with z.number since the form's onChange handler already performs the coercion, fixing type inference issues.
const energySchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  total_gen: z.number().nonnegative({ message: "Debe ser un número no negativo." }).optional(),
  spot_dispatch: z.number().nonnegative({ message: "Debe ser un número no negativo." }).optional(),
  smec_total: z.number().nonnegative({ message: "Debe ser un número no negativo." }).optional(),
  chp_total: z.number().nonnegative({ message: "Debe ser un número no negativo." }).optional(),
  motor_hours: z.number().nonnegative({ message: "Debe ser un número no negativo." }).max(24, { message: "No puede exceder 24 horas." }).optional(),
  torch_time: z.number().nonnegative({ message: "Debe ser un número no negativo." }).optional(),
  biogas_flow: z.number().nonnegative({ message: "Debe ser un número no negativo." }).optional(),
});

type EnergyFormData = z.infer<typeof energySchema>;

const EnergyRegistryPage: React.FC = () => {
    const [history, setHistory] = useState<EnergiaRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('energia')
                .select('*')
                .order('fecha', { ascending: false })
                .limit(15);

            if (error) throw error;
            setHistory(data || []);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const form = useForm<EnergyFormData>({
        resolver: zodResolver(energySchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            total_gen: undefined,
            spot_dispatch: undefined,
            smec_total: undefined,
            chp_total: undefined,
            motor_hours: undefined,
            torch_time: undefined,
            biogas_flow: undefined,
        },
    });

    const mutation = useMutation({
        mutationFn: async (formData: EnergyFormData) => {
            const insertData = {
                planta_id: 1, // Hardcoded for demo
                fecha: formData.date.toString(),
                generacion_electrica_total_kwh_dia: formData.total_gen || null,
                despacho_spot_smec_kwh_dia: formData.spot_dispatch || null,
                totalizador_smec_kwh: formData.smec_total || null,
                totalizador_chp_mwh: formData.chp_total || null,
                horas_funcionamiento_motor_chp_dia: formData.motor_hours || null,
                tiempo_funcionamiento_antorcha_s_dia: formData.torch_time || null,
                flujo_biogas_kg_dia: formData.biogas_flow || null,
            };
            const { error } = await supabase.from('energia').insert(insertData);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Registro diario guardado con éxito!' });
            form.reset({
                 date: new Date().toISOString().split('T')[0],
                 total_gen: undefined,
                 spot_dispatch: undefined,
                 smec_total: undefined,
                 chp_total: undefined,
                 motor_hours: undefined,
                 torch_time: undefined,
                 biogas_flow: undefined,
            });
            fetchHistory();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar el registro: ${err.message}`, variant: 'destructive' });
        }
    });

    function onSubmit(data: EnergyFormData) {
        mutation.mutate(data);
    }
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-1">Registro Diario de Energía</h2>
                    <p className="text-sm text-text-secondary mb-4">Información generada y tomada de la red (SMEC).</p>
                    
                    <Form {...form}>
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <FormField
                                    control={form.control}
                                    name="total_gen"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Generación Eléctrica Total (kWh/d)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="spot_dispatch"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Despacho SPOT (SMEC) (kWh/d)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="smec_total"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Totalizador SMEC (kWh)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="chp_total"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Totalizador CHP (MWh)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="motor_hours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Horas Funcionamiento Motor (hrs)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="torch_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tiempo Funcionamiento Antorcha (seg)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="biogas_flow"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Flujo de Biogás (kg)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="pt-4">
                                <Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Registro Diario</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Registros Recientes</h3>
                   {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                   ) : historyError ? (
                      <p className="text-center text-red-500">{historyError}</p>
                   ) : history.length === 0 ? (
                      <p className="text-center text-text-secondary py-4">No hay registros de energía todavía.</p>
                   ) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <th className={commonTableClasses.head}>Fecha</th>
                                       <th className={commonTableClasses.head}>Gen. Eléctrica (kWh)</th>
                                       <th className={`${commonTableClasses.head} hidden sm:table-cell`}>Biogás (kg)</th>
                                       <th className={`${commonTableClasses.head} hidden md:table-cell`}>Horas Motor</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {history.map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>
                                             {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-AR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                          </td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>
                                              {item.generacion_electrica_total_kwh_dia?.toLocaleString('es-AR') ?? 'N/A'}
                                          </td>
                                          <td className={`${commonTableClasses.cell} text-text-primary hidden sm:table-cell`}>
                                              {item.flujo_biogas_kg_dia?.toLocaleString('es-AR') ?? 'N/A'}
                                          </td>
                                          <td className={`${commonTableClasses.cell} text-text-primary hidden md:table-cell`}>
                                              {item.horas_funcionamiento_motor_chp_dia ?? 'N/A'}
                                          </td>
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