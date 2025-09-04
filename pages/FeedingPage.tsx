import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAIFeedingPrediction } from '../services/geminiService';
import type { SubstrateAnalysis } from '../services/geminiService';
import { useToast } from '../hooks/use-toast';
import type { Database } from '../types/database';
import { supabase } from '../services/supabaseClient';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import QuickAddModal, { FormField as QuickFormField } from '../components/QuickAddModal.tsx';


// --- Co-located Zod Schemas ---
// FIX: Replaced z.coerce.number with z.number since coercion is handled in the component's onChange event, resolving type inference issues with react-hook-form.
// FIX: Replaced z.number().min(0) with z.number().nonnegative() for improved schema clarity and to prevent negative values.
const analysisSchema = z.object({
  lipids: z.number().nonnegative("Debe ser un número no negativo.").max(100, "No puede exceder 100%"),
  proteins: z.number().nonnegative("Debe ser un número no negativo.").max(100, "No puede exceder 100%"),
  carbs: z.number().nonnegative("Debe ser un número no negativo.").max(100, "No puede exceder 100%"),
  totalSolids: z.number().nonnegative("Debe ser un número no negativo.").max(100, "No puede exceder 100%"),
  volatileSolids: z.number().nonnegative("Debe ser un número no negativo.").max(100, "No puede exceder 100%"),
});

// FIX: Replaced z.coerce.number with z.number since coercion is handled in the component's onChange event, resolving type inference issues.
const logFeedingSchema = z.object({
    source: z.string().min(1, "Debe seleccionar un origen."),
    destination: z.string().min(1, "Debe seleccionar un destino."),
    quantity: z.number()
          .positive({ message: "La cantidad debe ser mayor a cero." }),
    unit: z.enum(['kg', 'm³']),
    observations: z.string().optional(),
});


// --- Co-located API Logic ---
const fetchAlimentacionHistory = async () => {
    const { data, error } = await supabase
        .from('alimentacion_biodigestor')
        .select('*, equipo_origen:equipos!alimentacion_biodigestor_equipo_origen_id_fkey(nombre_equipo), equipo_destino:equipos!alimentacion_biodigestor_equipo_destino_id_fkey(nombre_equipo)')
        .order('fecha_hora', { ascending: false }).limit(10);
    if (error) throw error;
    return data;
};

const createAlimentacion = async (formData: z.infer<typeof logFeedingSchema>) => {
    const { error } = await supabase.from('alimentacion_biodigestor').insert({
        planta_id: 1, usuario_operador_id: 1, fecha_hora: new Date().toISOString(),
        equipo_origen_id: Number(formData.source),
        equipo_destino_id: Number(formData.destination),
        cantidad: formData.quantity,
        unidad: formData.unit,
        observaciones: formData.observations || null,
    });
    if (error) throw error;
    return { success: true };
};


// --- Feature Components ---
type AlimentacionRecord = Database['public']['Tables']['alimentacion_biodigestor']['Row'];
interface EnrichedAlimentacionRecord extends AlimentacionRecord {
    equipo_origen?: { nombre_equipo: string } | null;
    equipo_destino?: { nombre_equipo: string } | null;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${
      active
        ? 'border-b-2 border-primary text-primary bg-primary/10'
        : 'text-text-secondary hover:text-text-primary'
    }`}
  >
    {children}
  </button>
);

const AIPrediction: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const form = useForm<z.infer<typeof analysisSchema>>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      lipids: 15,
      proteins: 20,
      carbs: 50,
      totalSolids: 25,
      volatileSolids: 80,
    },
  });

  const onSubmit = async (data: z.infer<typeof analysisSchema>) => {
    setIsLoading(true);
    setError('');
    setResult('');
    try {
      const prediction = await getAIFeedingPrediction(data);
      setResult(prediction);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Análisis de Sustrato para Predicción</h2>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {Object.keys(form.getValues()).map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={key as keyof z.infer<typeof analysisSchema>}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{key.replace(/([A-Z])/g, ' $1')} (%)</FormLabel>
                    <FormControl>
                      {/* FIX: Added an onChange handler to explicitly convert the input value to a number, ensuring type consistency with the Zod schema. */}
                      <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit" isLoading={isLoading}>Obtener Recomendación de IA</Button>
            </form>
        </Form>
        {error && <div className="mt-4 text-error bg-error-bg p-3 rounded-md">{error}</div>}
        {result && (
          <div className="mt-6 p-4 bg-background rounded-lg">
            <h3 className="text-md font-semibold text-text-primary mb-2">Recomendación Generada</h3>
            <div className="prose prose-sm max-w-none text-text-primary" dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br />') }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LogFeeding: React.FC = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    const { equipos, loading: isEquiposLoading, error: equiposError, refreshData } = useSupabaseData();
    const { data: history = [], isLoading: isHistoryLoading } = useQuery({ queryKey: ['alimentacionHistory'], queryFn: fetchAlimentacionHistory });

    const form = useForm<z.infer<typeof logFeedingSchema>>({
        resolver: zodResolver(logFeedingSchema),
        defaultValues: {
            source: "",
            destination: "",
            quantity: undefined,
            unit: "kg",
            observations: "",
        },
    });

    const mutation = useMutation({
        mutationFn: createAlimentacion,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Registro guardado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['alimentacionHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' });
        }
    });

    const { sources, destinations } = useMemo(() => {
        const sources = equipos.filter(e => e.categoria && ['Bomba', 'Silo', 'Tanque', 'Playa de Descarga', 'Buffer', 'Hidrolizador'].includes(e.categoria)) || [];
        const destinations = equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor')) || [];
        return { sources, destinations };
    }, [equipos]);
    
    const equipmentFormFields: QuickFormField[] = [
        { name: 'nombre_equipo', label: 'Nombre del Equipo', type: 'text', required: true },
        { name: 'categoria', label: 'Categoría', type: 'text', required: true },
        { name: 'codigo_equipo', label: 'Código / Tag', type: 'text' },
    ];

    function onSubmit(data: z.infer<typeof logFeedingSchema>) {
        mutation.mutate(data);
    }

    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    if (equiposError) {
        return <Card><p className="text-error">{equiposError}</p></Card>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Registrar Alimentación Realizada</h2>
                  <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Fuente</FormLabel>
                                            <button type="button" onClick={() => setIsQuickAddOpen(true)} className="text-primary hover:opacity-80 transition-opacity">
                                                <PlusCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <FormControl>
                                            <Select {...field} disabled={isEquiposLoading}>
                                                <option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione origen'}</option>
                                                {sources.map(s => <option key={s.id} value={String(s.id)}>{s.nombre_equipo}</option>)}
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="destination"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Destino (Biodigestor)</FormLabel>
                                            <button type="button" onClick={() => setIsQuickAddOpen(true)} className="text-primary hover:opacity-80 transition-opacity">
                                                <PlusCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <FormControl>
                                            <Select {...field} disabled={isEquiposLoading}>
                                                <option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione destino'}</option>
                                                {destinations.map(d => <option key={d.id} value={String(d.id)}>{d.nombre_equipo}</option>)}
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div>
                            <FormLabel>Cantidad</FormLabel>
                            <div className="flex items-start mt-2">
                                <FormField
                                    control={form.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem className="w-2/3 flex-grow space-y-0">
                                            <FormControl>
                                                {/* FIX: Added an onChange handler to explicitly convert the input value to a number for type consistency. */}
                                                <Input type="number" step="any" {...field} value={field.value ?? ''} className="rounded-r-none" placeholder="e.g., 5000" onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                            </FormControl>
                                            <FormMessage className="mt-2" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem className="w-1/3 space-y-0">
                                            <FormControl>
                                                <Select {...field} className="rounded-l-none">
                                                    <option value="kg">kg</option>
                                                    <option value="m³">m³</option>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="mt-2"/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="observations"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observaciones (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      <Button type="submit" variant="secondary" isLoading={mutation.isPending || isEquiposLoading} disabled={isEquiposLoading}>Guardar Registro</Button>
                  </form>
                  </Form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Alimentación Reciente</h3>
                    {isHistoryLoading ? <p className="text-center text-text-secondary">Cargando historial...</p> : (
                         <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                 <thead className="bg-background">
                                     <tr>
                                         <th className={commonTableClasses.head}>Fecha</th>
                                         <th className={commonTableClasses.head}>Origen</th>
                                         <th className={commonTableClasses.head}>Destino</th>
                                         <th className={`${commonTableClasses.head} text-right`}>Cantidad</th>
                                     </tr>
                                 </thead>
                                 <tbody className="bg-surface divide-y divide-border">
                                    {history.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-text-secondary">No hay registros de alimentación.</td></tr>
                                    ) : history.map(item => (
                                        <tr key={item.id}>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora!).toLocaleString('es-AR')}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>{(item as EnrichedAlimentacionRecord).equipo_origen?.nombre_equipo ?? 'N/A'}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>{(item as EnrichedAlimentacionRecord).equipo_destino?.nombre_equipo ?? 'N/A'}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary font-medium text-right`}>{item.cantidad} {item.unidad}</td>
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
                entityName="Equipo"
                tableName="equipos"
                formFields={equipmentFormFields}
                onSuccess={() => {
                    toast({ title: 'Éxito', description: 'Equipo añadido con éxito.' });
                    refreshData();
                }}
            />
        </div>
    );
};

const FeedingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'log'>('ai');

  return (
    <Page>
      <div className="mb-4 border-b border-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>
            Predicción con IA
          </TabButton>
          <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')}>
            Registrar Alimentación
          </TabButton>
        </nav>
      </div>
      <div>
        {activeTab === 'ai' ? <AIPrediction /> : <LogFeeding />}
      </div>
    </Page>
  );
};

export default FeedingPage;
