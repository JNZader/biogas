import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import type { Database } from '../types/database';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportToCsv } from '../lib/utils';


// --- Co-located API Logic ---
const createFosTac = async (formData: FosTacFormData) => {
    const { vol1, vol2 } = formData;
    const { error } = await supabase.from('analisis_fos_tac').insert({
        planta_id: 1, // Hardcoded plant ID for demo
        equipo_id: Number(formData.equipment),
        usuario_operador_id: 1, // Hardcoded user ID for demo
        fecha_hora: `${formData.date}T${new Date().toTimeString().slice(0,8)}`,
        ph: formData.ph || null,
        volumen_1_ml: vol1,
        volumen_2_ml: vol2,
    });
    if (error) throw error;
    return { success: true };
};

const createAditivo = async (formData: any) => {
    const { error } = await supabase.from('aditivos_biodigestor').insert({
        planta_id: 1, // Hardcoded plant ID for demo
        fecha_hora: `${formData.additive_date}T${new Date().toTimeString().slice(0,8)}`,
        tipo_aditivo: formData.additive.toString(),
        cantidad_kg: Number(formData.additive_quantity),
        equipo_id: Number(formData.additive_bio),
        usuario_operador_id: 1, // hardcoded
    });
    if(error) throw error;
    return { success: true };
};


// --- Feature Components ---
type FosTacAnalysis = Database['public']['Tables']['analisis_fos_tac']['Row'];
interface FosTacHistoryItem extends FosTacAnalysis {
    equipo_nombre?: string;
}

type AditivoRecord = Database['public']['Tables']['aditivos_biodigestor']['Row'];
interface EnrichedAditivoRecord extends AditivoRecord {
    equipo_nombre?: string;
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

// --- Zod Schema for FOS/TAC form ---
const fosTacSchema = z.object({
  equipment: z.string().min(1, "Debe seleccionar un equipo."),
  date: z.string().min(1, "La fecha es requerida."),
  ph: z.number().min(0, "El pH no puede ser negativo.").max(14, "El pH no puede ser mayor a 14.").optional(),
  vol1: z.number().nonnegative("El volumen no puede ser negativo."),
  vol2: z.number().nonnegative("El volumen no puede ser negativo."),
}).refine(data => data.vol2 >= data.vol1, {
  message: 'El Volumen 2 no puede ser menor que el Volumen 1.',
  path: ['vol2'],
});
type FosTacFormData = z.infer<typeof fosTacSchema>;


const FosTacCalculator: React.FC = () => {
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const [history, setHistory] = useState<FosTacHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [results, setResults] = useState({ fos: 0, tac: 0, ratio: 0 });
    
    const biodigestores = equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor'));

    const form = useForm<FosTacFormData>({
        resolver: zodResolver(fosTacSchema),
        defaultValues: {
            equipment: '',
            date: new Date().toISOString().split('T')[0],
            ph: undefined,
            vol1: undefined,
            vol2: undefined,
        },
    });

    const vol1 = form.watch('vol1');
    const vol2 = form.watch('vol2');

    useEffect(() => {
        const v1 = vol1 || 0;
        const v2 = vol2 || 0;

        if (v1 <= 0 || v2 <= 0 || v2 < v1) {
            setResults({ fos: 0, tac: 0, ratio: 0 });
            return;
        }

        const calculatedTac = v1 * 250;
        const calculatedFos = (((v2 - v1) * 1.66) - 0.15) * 500;
        const calculatedRatio = calculatedTac > 0 ? calculatedFos / calculatedTac : 0;

        setResults({
            fos: Math.max(0, calculatedFos),
            tac: Math.max(0, calculatedTac),
            ratio: Math.max(0, calculatedRatio)
        });
    }, [vol1, vol2]);
    
    const fetchHistory = useCallback(async () => {
        if (!equipos || equipos.length === 0) return;
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('analisis_fos_tac')
                .select('*')
                .order('fecha_hora', { ascending: false })
                .limit(15);

            if (error) throw error;
            const enrichedData = data.map(reading => {
                const equipo = equipos.find(e => e.id === reading.equipo_id);
                return {
                    ...reading,
                    equipo_nombre: equipo ? equipo.nombre_equipo : `ID: ${reading.equipo_id}`
                };
            });
            setHistory(enrichedData);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, [equipos]);

    useEffect(() => {
        if (!dataLoading) {
            fetchHistory();
        }
    }, [dataLoading, fetchHistory]);
    
    const mutation = useMutation({
        mutationFn: createFosTac,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Análisis FOS/TAC guardado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['fosTacHistory'] }); // Or a more specific key
            form.reset();
            fetchHistory();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error: ${err.message}`, variant: 'destructive' });
        }
    });

    const onSubmit = (data: FosTacFormData) => {
        mutation.mutate(data);
    };

    const handleExport = () => {
        const dataToExport = history.map(item => ({
            fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
            equipo: item.equipo_nombre,
            ph: item.ph,
            fos_mg_l: item.fos_mg_l?.toFixed(2) ?? 'N/A',
            tac_mg_l: item.tac_mg_l?.toFixed(2) ?? 'N/A',
            relacion_fos_tac: item.relacion_fos_tac?.toFixed(3) ?? 'N/A',
        }));
        exportToCsv('historial_fos_tac.csv', dataToExport);
    };

    if (dataError) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-error mb-2">Error de Carga</h2>
                    <p className="text-text-secondary">No se pudo cargar la lista de equipos.</p>
                    <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{dataError}</pre>
                </CardContent>
            </Card>
        );
    }
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Análisis FOS/TAC</h2>
                  <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField control={form.control} name="equipment" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Equipo (Biodigestor)</FormLabel>
                                <FormControl>
                                    <Select {...field} disabled={dataLoading}>
                                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione Biodigestor'}</option>
                                        {biodigestores.map(e => <option key={e.id} value={String(e.id)}>{e.nombre_equipo}</option>)}
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="ph" render={({ field }) => (
                            <FormItem><FormLabel>pH</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <fieldset className="border-t border-border pt-4">
                            <legend className="text-base font-semibold text-text-primary mb-2">Volúmenes de Titulación</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="vol1" render={({ field }) => (
                                    <FormItem><FormLabel>Volumen 1 (mL)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="vol2" render={({ field }) => (
                                    <FormItem><FormLabel>Volumen 2 (mL)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </fieldset>
                        
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                            <div className="text-center p-2 bg-background rounded">
                                <p className="text-sm text-text-secondary">FOS (mg/L)</p>
                                <p className="text-xl font-bold text-primary">{results.fos.toFixed(2)}</p>
                            </div>
                            <div className="text-center p-2 bg-background rounded">
                                <p className="text-sm text-text-secondary">TAC (mg/L)</p>
                                <p className="text-xl font-bold text-primary">{results.tac.toFixed(2)}</p>
                            </div>
                            <div className="text-center p-2 bg-background rounded">
                                <p className="text-sm text-text-secondary">Relación FOS/TAC</p>
                                <p className="text-xl font-bold text-primary">{results.ratio.toFixed(3)}</p>
                            </div>
                        </div>

                        <Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Análisis</Button>
                    </form>
                  </Form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                   <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Historial de Análisis Recientes</h2>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={history.length === 0}>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                   </div>
                   {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                   ) : historyError ? (
                      <p className="text-center text-error">{historyError}</p>
                   ) : history.length === 0 ? (
                      <p className="text-center text-text-secondary py-4">No hay análisis registrados todavía.</p>
                   ) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <th className={commonTableClasses.head}>Fecha y Hora</th>
                                       <th className={commonTableClasses.head}>Equipo</th>
                                       <th className={commonTableClasses.head}>FOS (mg/L)</th>
                                       <th className={commonTableClasses.head}>TAC (mg/L)</th>
                                       <th className={commonTableClasses.head}>Relación</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {history.map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.equipo_nombre}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.fos_mg_l?.toFixed(2) ?? 'N/A'}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.tac_mg_l?.toFixed(2) ?? 'N/A'}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-bold`}>{item.relacion_fos_tac?.toFixed(3) ?? 'N/A'}</td>
                                      </tr>
                                  ))}
                               </tbody>
                          </table>
                      </div>
                   )}
                </CardContent>
            </Card>
        </div>
    );
};

const Additives: React.FC = () => {
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<EnrichedAditivoRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const biodigestores = useMemo(() => 
        equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor')), 
    [equipos]);

    const fetchHistory = useCallback(async () => {
        if (!equipos || equipos.length === 0) return;
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('aditivos_biodigestor')
                .select(`*, equipos ( nombre_equipo )`)
                .order('fecha_hora', { ascending: false })
                .limit(15);
            
            if (error) throw error;

            const enrichedData = data.map(item => ({
                ...item,
                equipo_nombre: item.equipos?.nombre_equipo
            }));

            setHistory(enrichedData as any[]);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, [equipos]);

    useEffect(() => {
        if(!dataLoading){
            fetchHistory();
        }
    }, [dataLoading, fetchHistory]);
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            await createAditivo(data);
            setMessage('Registro de aditivo guardado con éxito!');
            e.currentTarget.reset();
            fetchHistory();
        } catch (error: any) {
             setMessage(`Error al guardar el registro: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExport = () => {
        const dataToExport = history.map(item => ({
            fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
            aditivo: item.tipo_aditivo,
            cantidad_kg: item.cantidad_kg,
            equipo: item.equipo_nombre,
        }));
        exportToCsv('historial_aditivos.csv', dataToExport);
    };

    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    if (dataError) {
        return <Card><CardContent className="pt-6"><p className="text-error">{dataError}</p></CardContent></Card>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Registro de Aditivos</h2>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                      <div><Label htmlFor="additive_date">Fecha</Label><Input id="additive_date" name="additive_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className={commonInputClasses}/></div>
                      <div>
                          <Label htmlFor="additive">Aditivo</Label>
                          <Select id="additive" name="additive" required className={commonInputClasses}>
                            {['BICKO', 'HIMAX', 'CAL', 'OTROS'].map(o => <option key={o} value={o}>{o}</option>)}
                          </Select>
                      </div>
                      <div>
                        <Label htmlFor="additive_quantity">Cantidad (kg)</Label>
                        <Input id="additive_quantity" name="additive_quantity" type="number" min="0" required className={commonInputClasses}/>
                      </div>
                      <div>
                          <Label htmlFor="additive_bio">Biodigestor</Label>
                          <select
                              id="additive_bio"
                              name="additive_bio"
                              required
                              className="mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                              disabled={dataLoading}
                          >
                              <option value="">{dataLoading ? 'Cargando...' : 'Seleccione Biodigestor'}</option>
                              {biodigestores.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                          </select>
                      </div>
                      {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}
                      <Button type="submit" variant="secondary" isLoading={isLoading || dataLoading} disabled={dataLoading}>Guardar Registro</Button>
                  </form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Historial de Aditivos Recientes</h3>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={history.length === 0}>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                  </div>
                  {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                  ) : historyError ? (
                      <p className="text-center text-error">{historyError}</p>
                  ) : history.length === 0 ? (
                      <p className="text-center text-text-secondary py-4">No hay registros de aditivos.</p>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <th className={commonTableClasses.head}>Fecha y Hora</th>
                                       <th className={commonTableClasses.head}>Aditivo</th>
                                       <th className={commonTableClasses.head}>Cantidad (kg)</th>
                                       <th className={commonTableClasses.head}>Equipo</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {history.map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.tipo_aditivo}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.cantidad_kg}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.equipo_nombre}</td>
                                      </tr>
                                  ))}
                               </tbody>
                          </table>
                      </div>
                  )}
                </CardContent>
            </Card>
        </div>
    );
};


const PfQPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fos' | 'additives'>('fos');
  return (
    <Page>
      <div className="mb-4 border-b border-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton active={activeTab === 'fos'} onClick={() => setActiveTab('fos')}>
            FOS/TAC
          </TabButton>
          <TabButton active={activeTab === 'additives'} onClick={() => setActiveTab('additives')}>
            Aditivos
          </TabButton>
        </nav>
      </div>
      <div>
        {activeTab === 'fos' ? <FosTacCalculator /> : <Additives />}
      </div>
    </Page>
  );
};

export default PfQPage;