import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { Database } from '../types/database';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { exportToCsv, exportToPdf } from '../lib/utils';
import { cn } from '../lib/utils';


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

const createAditivo = async (formData: AdditiveFormData) => {
    const { error } = await supabase.from('aditivos_biodigestor').insert({
        planta_id: 1, // Hardcoded plant ID for demo
        fecha_hora: `${formData.additive_date}T${new Date().toTimeString().slice(0,8)}`,
        tipo_aditivo: formData.additive,
        cantidad_kg: formData.additive_quantity,
        equipo_id: Number(formData.additive_bio),
        usuario_operador_id: 1, // hardcoded
    });
    if(error) throw error;
    return { success: true };
};

const fetchFosTacHistory = async (equipmentId?: number): Promise<FosTacHistoryItem[]> => {
    let query = supabase
        .from('analisis_fos_tac')
        .select('*, equipos(nombre_equipo)')
        .order('fecha_hora', { ascending: false })
        .limit(15);

    if (equipmentId) {
        query = query.eq('equipo_id', equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as any[] || [];
};

const fetchLastPhForEquipment = async (equipmentId: number) => {
    if (!equipmentId) return null;
    const { data, error } = await supabase
        .from('analisis_fos_tac')
        .select('ph')
        .eq('equipo_id', equipmentId)
        .not('ph', 'is', null)
        .order('fecha_hora', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (error) {
        console.error("Error fetching last pH:", error);
        return null;
    }
    return data;
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
type FosTacAnalysis = Database['public']['Tables']['analisis_fos_tac']['Row'];
interface FosTacHistoryItem extends FosTacAnalysis {
    equipos?: { nombre_equipo: string } | null;
}

type AditivoRecord = Database['public']['Tables']['aditivos_biodigestor']['Row'];
interface EnrichedAditivoRecord extends AditivoRecord {
    equipos?: { nombre_equipo: string } | null;
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

// --- Zod Schemas ---
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

const additiveSchema = z.object({
    additive_date: z.string().min(1, "La fecha es requerida."),
    additive: z.enum(['BICKO', 'HIMAX', 'CAL', 'OTROS']),
    additive_quantity: z.number().positive("La cantidad debe ser un número positivo."),
    additive_bio: z.string().min(1, "Debe seleccionar un biodigestor."),
});
type AdditiveFormData = z.infer<typeof additiveSchema>;


const FosTacCalculator: React.FC = () => {
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const [results, setResults] = useState({ fos: 0, tac: 0, ratio: 0 });
    const [phInputKey, setPhInputKey] = useState(Date.now());
    
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
    const selectedEquipmentId = form.watch('equipment');

    const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery({
        queryKey: ['fosTacHistory', selectedEquipmentId],
        queryFn: () => fetchFosTacHistory(selectedEquipmentId ? Number(selectedEquipmentId) : undefined),
        enabled: !dataLoading,
    });

    const { data: lastPhData } = useQuery({
        queryKey: ['lastPh', selectedEquipmentId],
        queryFn: () => fetchLastPhForEquipment(Number(selectedEquipmentId)),
        enabled: !!selectedEquipmentId,
    });

    useEffect(() => {
        if (lastPhData?.ph) {
            form.setValue('ph', lastPhData.ph);
            // Briefly flash the input to indicate it was auto-filled
            setPhInputKey(Date.now());
        }
    }, [lastPhData, form]);

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
    
    const mutation = useMutation({
        mutationFn: createFosTac,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Análisis FOS/TAC guardado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['fosTacHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error: ${err.message}`, variant: 'destructive' });
        }
    });

    const onSubmit = (data: FosTacFormData) => {
        mutation.mutate(data);
    };

    const dataToExport = useMemo(() => history.map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        equipo: item.equipos?.nombre_equipo || 'N/A',
        ph: item.ph,
        fos_mg_l: item.fos_mg_l?.toFixed(2) ?? 'N/A',
        tac_mg_l: item.tac_mg_l?.toFixed(2) ?? 'N/A',
        relacion_fos_tac: item.relacion_fos_tac?.toFixed(3) ?? 'N/A',
    })), [history]);

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
                            <FormItem>
                                <FormLabel>pH</FormLabel>
                                <FormControl>
                                    <Input 
                                        key={phInputKey}
                                        type="number" 
                                        step="0.01" 
                                        {...field} 
                                        value={field.value ?? ''} 
                                        onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                                        className={cn({ 'animate-pulse border-primary': phInputKey > 0 })}
                                        onAnimationEnd={(e) => (e.currentTarget as HTMLInputElement).classList.remove('animate-pulse', 'border-primary')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
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
                        <ExportButton data={dataToExport} filename="historial_fos_tac" disabled={history.length === 0} />
                   </div>
                   {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                   ) : historyError ? (
                      <p className="text-center text-error">{(historyError as Error).message}</p>
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
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.equipos?.nombre_equipo || 'N/A'}</td>
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
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const biodigestores = useMemo(() => 
        equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor')), 
    [equipos]);
    
    const form = useForm<AdditiveFormData>({
        resolver: zodResolver(additiveSchema),
        defaultValues: {
            additive_date: new Date().toISOString().split('T')[0],
            additive: 'BICKO',
            additive_quantity: undefined,
            additive_bio: '',
        },
    });

    const selectedBioId = form.watch('additive_bio');

    const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery({
        queryKey: ['additivesHistory', selectedBioId],
        queryFn: async () => {
            let query = supabase
                .from('aditivos_biodigestor')
                .select(`*, equipos ( nombre_equipo )`)
                .order('fecha_hora', { ascending: false })
                .limit(15);
            
            if (selectedBioId) {
                query = query.eq('equipo_id', Number(selectedBioId));
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !dataLoading,
    });

    const mutation = useMutation({
        mutationFn: createAditivo,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Registro de aditivo guardado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['additivesHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' });
        }
    });

    const onSubmit = (data: AdditiveFormData) => {
        mutation.mutate(data);
    };
    
    const dataToExport = useMemo(() => (history as EnrichedAditivoRecord[]).map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        aditivo: item.tipo_aditivo,
        cantidad_kg: item.cantidad_kg,
        equipo: item.equipos?.nombre_equipo,
    })), [history]);

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
                  <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                      <FormField control={form.control} name="additive_date" render={({ field }) => (
                          <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="additive" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Aditivo</FormLabel>
                              <FormControl>
                                  <Select {...field}>
                                      {['BICKO', 'HIMAX', 'CAL', 'OTROS'].map(o => <option key={o} value={o}>{o}</option>)}
                                  </Select>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="additive_quantity" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Cantidad (kg)</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="additive_bio" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Biodigestor</FormLabel>
                              <FormControl>
                                  <Select {...field} disabled={dataLoading}>
                                      <option value="">{dataLoading ? 'Cargando...' : 'Seleccione Biodigestor'}</option>
                                      {biodigestores.map(e => <option key={e.id} value={String(e.id)}>{e.nombre_equipo}</option>)}
                                  </Select>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <Button type="submit" variant="secondary" isLoading={mutation.isPending || dataLoading} disabled={dataLoading}>Guardar Registro</Button>
                  </form>
                  </Form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Historial de Aditivos Recientes</h3>
                        <ExportButton data={dataToExport} filename="historial_aditivos" disabled={history.length === 0} />
                  </div>
                  {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                  ) : historyError ? (
                      <p className="text-center text-error">{(historyError as Error).message}</p>
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
                                  {(history as EnrichedAditivoRecord[]).map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.tipo_aditivo}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.cantidad_kg}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary`}>{item.equipos?.nombre_equipo}</td>
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