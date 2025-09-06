import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
import { exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { cn } from '../lib/utils';
import { useSortableData } from '../hooks/useSortableData';
import { SortableHeader } from '../components/ui/SortableHeader';


// --- Co-located API Logic ---
const createFosTac = async (formData: FosTacFormData) => {
    const { vol1, vol2 } = formData;
    const { error } = await supabase.from('analisis_fos_tac').insert({
        planta_id: 1, // Hardcoded plant ID for demo
        equipo_id: Number(formData.equipment),
        usuario_operador_id: 1, // Hardcoded user ID for demo
        fecha_hora: `${formData.date}T${new Date().toTimeString().slice(0,8)}`,
        ph: formData.ph,
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

    const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
        setIsOpen(false);
        if (format === 'csv') {
            exportToCsv(`${filename}.csv`, data);
        } else if (format === 'xlsx') {
            exportToXlsx(filename, data);
        } else if (format === 'pdf') {
            exportToPdf(filename, data);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={disabled}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDownIcon className={cn("h-4 w-4 ml-1 transition-transform", { "rotate-180": isOpen })} />
            </Button>
            <div className={cn(
                "absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 z-10 transition-all duration-100 ease-out",
                isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}>
                <div className="py-1" role="menu" aria-orientation="vertical">
                    <button onClick={() => handleExport('csv')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                        Exportar como CSV
                    </button>
                    <button onClick={() => handleExport('xlsx')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                        Exportar como XLSX
                    </button>
                    <button onClick={() => handleExport('pdf')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                        Exportar como PDF
                    </button>
                </div>
            </div>
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

type PfqRecord = Database['public']['Tables']['pfq']['Row'];
interface EnrichedPfqRecord extends PfqRecord {
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
// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const fosTacSchema = z.object({
  equipment: z.string().min(1, "Requerido"),
  date: z.string().min(1, "Requerido"),
  // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
  ph: z.number().min(0, "El pH debe ser >= 0.").max(14, "El pH no puede ser > 14."),
  // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
  vol1: z.number().nonnegative("El volumen no puede ser negativo."),
  // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
  vol2: z.number().nonnegative("El volumen no puede ser negativo."),
}).refine(data => {
    if (typeof data.vol1 === 'number' && typeof data.vol2 === 'number') {
        return data.vol2 >= data.vol1;
    }
    return true;
}, {
  message: 'El Volumen 2 no puede ser menor que el Volumen 1.',
  path: ['vol2'],
});
type FosTacFormData = z.infer<typeof fosTacSchema>;

// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const additiveSchema = z.object({
    additive_date: z.string().min(1, "Requerido"),
    additive: z.enum(['BICKO', 'HIMAX', 'CAL', 'OTROS']),
    // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
    additive_quantity: z.number().positive("La cantidad debe ser mayor a cero."),
    additive_bio: z.string().min(1, "Requerido"),
});
type AdditiveFormData = z.infer<typeof additiveSchema>;

// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const physicalParamsSchema = z.object({
  equipment: z.string().min(1, "Requerido."),
  date: z.string().min(1, "Requerido."),
  time: z.string().min(1, "Requerido."),
  // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
  temperature: z.number().optional(),
  // FIX: Removed invalid_type_error from z.number() to fix TypeScript error.
  level: z.number().nonnegative("El nivel no puede ser negativo."),
});
type PhysicalParamsFormData = z.infer<typeof physicalParamsSchema>;


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

    const displayHistory = useMemo(() => history.map(item => ({
        ...item,
        equipo_nombre: item.equipos?.nombre_equipo ?? 'N/A',
    })), [history]);

    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(displayHistory, { key: 'fecha_hora', direction: 'descending' });


    const { data: lastPhData } = useQuery({
        queryKey: ['lastPh', selectedEquipmentId],
        queryFn: () => fetchLastPhForEquipment(Number(selectedEquipmentId)),
        enabled: !!selectedEquipmentId,
    });

    useEffect(() => {
        if (lastPhData?.ph) {
            form.setValue('ph', lastPhData.ph);
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
            toast({ title: 'Éxito', description: 'Análisis FOS/TAC guardado com éxito!' });
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

    const dataToExport = useMemo(() => sortedHistory.map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        equipo: item.equipo_nombre,
        ph: item.ph,
        fos_mg_l: item.fos_mg_l?.toFixed(2) ?? 'N/A',
        tac_mg_l: item.tac_mg_l?.toFixed(2) ?? 'N/A',
        relacion_fos_tac: item.relacion_fos_tac?.toFixed(3) ?? 'N/A',
    })), [sortedHistory]);

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
                                    <FormItem><FormLabel>Volumen 1 (mL)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="vol2" render={({ field }) => (
                                    <FormItem><FormLabel>Volumen 2 (mL)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
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
                        <ExportButton data={dataToExport} filename="historial_fos_tac" disabled={sortedHistory.length === 0} />
                   </div>
                   {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                   ) : historyError ? (
                      <p className="text-center text-error">{(historyError as Error).message}</p>
                   ) : sortedHistory.length === 0 ? (
                      <p className="text-center text-text-secondary py-4">No hay análisis registrados todavía.</p>
                   ) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <SortableHeader columnKey="fecha_hora" title="Fecha y Hora" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="equipo_nombre" title="Equipo" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="fos_mg_l" title="FOS (mg/L)" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="tac_mg_l" title="TAC (mg/L)" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="relacion_fos_tac" title="Relación" sortConfig={sortConfig} onSort={requestSort} />
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {sortedHistory.map(item => (
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
    
    const displayHistory = useMemo(() => (history as EnrichedAditivoRecord[]).map(item => ({
        ...item,
        equipo_nombre: item.equipos?.nombre_equipo ?? 'N/A',
    })), [history]);

    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(displayHistory, { key: 'fecha_hora', direction: 'descending' });


    const mutation = useMutation({
        mutationFn: createAditivo,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Registro de aditivo guardado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['additivesHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error: ${err.message}`, variant: 'destructive' });
        }
    });

    const onSubmit = (data: AdditiveFormData) => {
        mutation.mutate(data);
    };

    const commonTableClasses = {
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Registrar Aditivos</h2>
                    <Form {...form}>
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <FormField control={form.control} name="additive_date" render={({ field }) => (
                                <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="additive" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Aditivo</FormLabel>
                                    <FormControl>
                                        <Select {...field}>
                                            <option value="BICKO">BICKO</option>
                                            <option value="HIMAX">HIMAX</option>
                                            <option value="CAL">CAL</option>
                                            <option value="OTROS">OTROS</option>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="additive_quantity" render={({ field }) => (
                                <FormItem><FormLabel>Cantidad (kg)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="additive_bio" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Biodigestor</FormLabel>
                                    <FormControl>
                                        <Select {...field} disabled={dataLoading}>
                                            <option value="">{dataLoading ? 'Cargando...' : 'Seleccione'}</option>
                                            {biodigestores.map(b => <option key={b.id} value={String(b.id)}>{b.nombre_equipo}</option>)}
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Registro</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="pt-6">
                   <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de Aditivos</h2>
                   {historyLoading ? <p className="text-center text-text-secondary">Cargando...</p> : historyError ? <p className="text-center text-error">{(historyError as Error).message}</p> : (
                       <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <SortableHeader columnKey="fecha_hora" title="Fecha" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="tipo_aditivo" title="Tipo Aditivo" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="cantidad_kg" title="Cantidad (kg)" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="equipo_nombre" title="Biodigestor" sortConfig={sortConfig} onSort={requestSort} />
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {sortedHistory.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-text-secondary">No hay registros.</td></tr>
                                    ) : sortedHistory.map(item => (
                                        <tr key={item.id}>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleDateString('es-AR')}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.tipo_aditivo}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>{item.cantidad_kg}</td>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>{item.equipo_nombre}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                       </div>
                   )}
                </CardContent>
             </Card>
        </div>
    )
};

const PhysicalParameters: React.FC = () => {
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<PhysicalParamsFormData>({
        resolver: zodResolver(physicalParamsSchema),
        defaultValues: {
            equipment: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            level: undefined,
            temperature: undefined,
        },
    });
    
    const level = form.watch('level');
    const selectedEquipmentId = form.watch('equipment');
    const biodigestores = useMemo(() => 
        equipos.filter(e => e.categoria?.toLowerCase().includes('biodigestor')), 
    [equipos]);

    const { volume, capacityPercentage } = useMemo(() => {
        if (!level || !selectedEquipmentId) return { volume: 0, capacityPercentage: 0 };
        const biodigester = biodigestores.find(b => b.id === Number(selectedEquipmentId));
        const specs = biodigester?.especificaciones_tecnicas as any;
        const diameter = specs?.diameter;
        const height = specs?.height;

        if (!diameter || !height) return { volume: 0, capacityPercentage: 0 };
        
        const radius = diameter / 2;
        const totalVolume = Math.PI * Math.pow(radius, 2) * height;
        const currentVolume = Math.PI * Math.pow(radius, 2) * level;
        const percentage = totalVolume > 0 ? (currentVolume / totalVolume) * 100 : 0;
        
        return { volume: currentVolume, capacityPercentage: percentage };

    }, [level, selectedEquipmentId, biodigestores]);

    const { data: history = [], isLoading: historyLoading } = useQuery({
        queryKey: ['physicalParamsHistory', selectedEquipmentId],
        queryFn: async () => {
            let query = supabase.from('pfq').select('*, equipos (nombre_equipo)').order('fecha_hora_medicion', { ascending: false }).limit(10);
            if (selectedEquipmentId) {
                query = query.eq('equipo_id_fk', Number(selectedEquipmentId));
            }
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !dataLoading
    });

    const displayHistory = useMemo(() => (history as EnrichedPfqRecord[]).map(item => ({
        ...item,
        equipo_nombre: item.equipos?.nombre_equipo ?? 'N/A',
    })), [history]);

    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(displayHistory, { key: 'fecha_hora_medicion', direction: 'descending' });

    const mutation = useMutation({
        mutationFn: async (formData: PhysicalParamsFormData) => {
            const { error } = await supabase.from('pfq').insert({
                planta_id: 1,
                usuario_operador_id_fk: 1, // hardcoded
                equipo_id_fk: Number(formData.equipment),
                fecha_hora_medicion: `${formData.date}T${formData.time}:00`,
                temperatura_c: formData.temperature,
                nivel_m: formData.level,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Parámetros guardados con éxito.' });
            queryClient.invalidateQueries({ queryKey: ['physicalParamsHistory'] });
            form.reset();
        },
        onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });
    
    const commonTableClasses = {
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Registrar Parámetros Físicos</h2>
                    <Form {...form}>
                        <form className="space-y-4" onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
                            <FormField control={form.control} name="equipment" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Biodigestor</FormLabel>
                                    <FormControl>
                                        <Select {...field} disabled={dataLoading}>
                                            <option value="">{dataLoading ? 'Cargando...' : 'Seleccione'}</option>
                                            {biodigestores.map(b => <option key={b.id} value={String(b.id)}>{b.nombre_equipo}</option>)}
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field}/></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="temperature" render={({ field }) => (<FormItem><FormLabel>Temperatura (°C)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="level" render={({ field }) => (<FormItem><FormLabel>Nivel (m)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>)} />
                            </div>

                             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                <div className="text-center p-2 bg-background rounded">
                                    <p className="text-sm text-text-secondary">Volumen Actual Estimado</p>
                                    <p className="text-xl font-bold text-primary">{volume.toFixed(2)} m³</p>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                    <p className="text-sm text-text-secondary">Porcentaje de Capacidad</p>
                                    <p className="text-xl font-bold text-primary">{capacityPercentage.toFixed(1)} %</p>
                                </div>
                            </div>
                            
                            <Button type="submit" isLoading={mutation.isPending}>Guardar Medición</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Historial de Mediciones Físicas</CardTitle></CardHeader>
                <CardContent>
                    {historyLoading ? <p>Cargando...</p> : (
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <SortableHeader columnKey="fecha_hora_medicion" title="Fecha" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="equipo_nombre" title="Equipo" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="temperatura_c" title="Temp (°C)" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="nivel_m" title="Nivel (m)" sortConfig={sortConfig} onSort={requestSort} />
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {sortedHistory.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-text-secondary">No hay mediciones.</td></tr>
                                    ) : sortedHistory.map(item => (
                                        <tr key={item.id}>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora_medicion).toLocaleString('es-AR')}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.equipo_nombre}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>{item.temperatura_c ?? 'N/A'}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>{item.nivel_m ?? 'N/A'}</td>
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
  const [activeTab, setActiveTab] = useState<'fosTac' | 'additives' | 'physical'>('fosTac');

  return (
    <Page>
      <div className="mb-4 border-b border-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton active={activeTab === 'fosTac'} onClick={() => setActiveTab('fosTac')}>
            Análisis FOS/TAC
          </TabButton>
          <TabButton active={activeTab === 'additives'} onClick={() => setActiveTab('additives')}>
            Aditivos
          </TabButton>
          <TabButton active={activeTab === 'physical'} onClick={() => setActiveTab('physical')}>
            Parámetros Físicos
          </TabButton>
        </nav>
      </div>
      <div>
        {activeTab === 'fosTac' && <FosTacCalculator />}
        {activeTab === 'additives' && <Additives />}
        {activeTab === 'physical' && <PhysicalParameters />}
      </div>
    </Page>
  );
};

export default PfQPage;