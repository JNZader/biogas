import React, { useState, useMemo } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import QuickAddModal, { FormField as QuickFormField } from '../components/QuickAddModal.tsx';
import type { Database } from '../types/database';
import { useSortableData } from '../hooks/useSortableData';
import { SortableHeader } from '../components/ui/SortableHeader';


// --- Co-located Zod Schema ---
// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const ingresoSchema = z.object({
  transportista_id: z.string().min(1, "Debe seleccionar un transportista."),
  camion_id: z.string().min(1, "Debe seleccionar un camión."),
  remito: z.string().min(1, "El número de remito es requerido."),
  provider: z.string().min(1, "Debe seleccionar un proveedor."),
  substrate: z.string().min(1, "Debe seleccionar un sustrato."),
  quantity: z.number({invalid_type_error: "La cantidad debe ser un número."}).positive("La cantidad debe ser mayor a cero."),
  location: z.string().min(1, "Debe seleccionar un lugar de descarga."),
});
type IngresoFormData = z.infer<typeof ingresoSchema>;

// --- Co-located API Logic ---
const createIngresoSustrato = async (formData: IngresoFormData) => {
    const { data: viajeData, error: viajeError } = await supabase.from('ingresos_viaje_camion')
        .insert({
            planta_id: 1, usuario_operador_id: 1, fecha_hora_ingreso: new Date().toISOString(),
            camion_id: Number(formData.camion_id),
            numero_remito_general: formData.remito,
            peso_neto_kg: formData.quantity,
        }).select().single();
    if (viajeError) throw viajeError;

    const { error: detalleError } = await supabase.from('detalle_ingreso_sustrato')
        .insert({
            id_viaje_ingreso_fk: viajeData.id,
            sustrato_id: Number(formData.substrate),
            proveedor_empresa_id: Number(formData.provider),
            lugar_descarga_id: Number(formData.location),
            cantidad_kg: formData.quantity,
        });
    if (detalleError) throw detalleError;
    return { success: true };
};

type IngresoHistory = (Database['public']['Tables']['ingresos_viaje_camion']['Row'] & {
    usuarios: Pick<Database['public']['Tables']['usuarios']['Row'], 'nombres'> | null;
    camiones: Pick<Database['public']['Tables']['camiones']['Row'], 'patente'> | null;
    detalle_ingreso_sustrato: (Database['public']['Tables']['detalle_ingreso_sustrato']['Row'] & {
        sustratos: Pick<Database['public']['Tables']['sustratos']['Row'], 'nombre'> | null;
        empresa: Pick<Database['public']['Tables']['empresa']['Row'], 'nombre'> | null;
    })[];
});

const fetchIngresosHistory = async (): Promise<IngresoHistory[]> => {
    const { data, error } = await supabase
        .from('ingresos_viaje_camion')
        .select(`
            *,
            usuarios!ingresos_viaje_camion_usuario_operador_id_fkey( nombres ),
            camiones ( patente ),
            detalle_ingreso_sustrato (
                *,
                sustratos ( nombre ),
                empresa ( nombre )
            )
        `)
        .order('fecha_hora_ingreso', { ascending: false })
        .limit(10);
    if (error) throw error;
    return data as any as IngresoHistory[];
};

const fetchProviderSubstrateLinks = async () => {
    const { data, error } = await supabase
        .from('detalle_ingreso_sustrato')
        .select('proveedor_empresa_id, sustrato_id');
    if (error) throw error;
    
    const map = new Map<number, Set<number>>();
    if (data) {
        data.forEach(item => {
            if (!map.has(item.proveedor_empresa_id)) {
                map.set(item.proveedor_empresa_id, new Set());
            }
            map.get(item.proveedor_empresa_id)!.add(item.sustrato_id);
        });
    }
    return map;
};

const InputsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { sustratos, proveedores, lugaresDescarga, camiones, transportistas, loading: dataLoading, error, refreshData } = useSupabaseData();
    const [quickAddState, setQuickAddState] = useState<{
        isOpen: boolean;
        entity: string;
        tableName: 'sustratos' | 'empresa' | 'camiones' | 'lugares_descarga';
        fields: QuickFormField[];
        extraData?: { [key: string]: any };
    } | null>(null);
    
    const form = useForm<IngresoFormData>({
        resolver: zodResolver(ingresoSchema),
        defaultValues: {
            transportista_id: "",
            camion_id: "",
            remito: "",
            provider: "",
            substrate: "",
            quantity: undefined,
            location: "",
        },
    });

    const { data: history = [], isLoading: isHistoryLoading } = useQuery({ 
        queryKey: ['ingresosHistory'], 
        queryFn: fetchIngresosHistory 
    });

    const { data: providerSubstrateMap } = useQuery({
        queryKey: ['providerSubstrateLinks'],
        queryFn: fetchProviderSubstrateLinks,
    });

    const selectedTransportistaId = form.watch('transportista_id');
    const selectedProviderId = form.watch('provider');

    const filteredCamiones = useMemo(() => {
        if (!selectedTransportistaId) return [];
        return camiones.filter(c => c.transportista_empresa_id === Number(selectedTransportistaId));
    }, [camiones, selectedTransportistaId]);

    const filteredSustratos = useMemo(() => {
        if (!selectedProviderId || !providerSubstrateMap) return sustratos; // Fallback to all sustratos
        const allowedSustratoIds = providerSubstrateMap.get(Number(selectedProviderId));
        if (!allowedSustratoIds) return []; // Or return a message indicating no substrates for this provider
        return sustratos.filter(s => allowedSustratoIds.has(s.id));
    }, [sustratos, selectedProviderId, providerSubstrateMap]);

    const mutation = useMutation({
        mutationFn: createIngresoSustrato,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Ingreso registrado com éxito!' });
            queryClient.invalidateQueries({ queryKey: ['ingresosHistory'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al registrar: ${err.message}`, variant: 'destructive' });
        }
    });

    const quickAddConfig: {
        sustrato: { entity: string; tableName: 'sustratos'; fields: QuickFormField[] };
        proveedor: { entity: string; tableName: 'empresa'; extraData: { tipo_empresa: string }; fields: QuickFormField[] };
        camion: { entity: string; tableName: 'camiones'; fields: QuickFormField[] };
        lugarDescarga: { entity: string; tableName: 'lugares_descarga'; fields: QuickFormField[] };
    } = {
        sustrato: {
            entity: 'Sustrato', tableName: 'sustratos',
            fields: [{ name: 'nombre', label: 'Nombre del Sustrato', type: 'text', required: true }, { name: 'categoria', label: 'Categoría', type: 'text' }]
        },
        proveedor: {
            entity: 'Proveedor', tableName: 'empresa', extraData: { tipo_empresa: 'proveedor' },
            fields: [{ name: 'nombre', label: 'Nombre del Proveedor', type: 'text', required: true }, { name: 'cuit', label: 'CUIT', type: 'text' }]
        },
        camion: {
            entity: 'Camión', tableName: 'camiones',
            fields: [
                { name: 'patente', label: 'Patente', type: 'text', required: true },
                { 
                    name: 'transportista_empresa_id', 
                    label: 'Empresa transportista', 
                    type: 'select', 
                    required: true, 
                    options: transportistas.map(t => ({ value: String(t.id), label: t.nombre }))
                },
                { name: 'marca', label: 'Marca', type: 'text' }, 
                { name: 'modelo', label: 'Modelo', type: 'text' }
            ]
        },
        lugarDescarga: {
            entity: 'Lugar de Descarga', tableName: 'lugares_descarga',
            fields: [{ name: 'nombre', label: 'Nombre del Lugar', type: 'text', required: true }, { name: 'tipo', label: 'Tipo', type: 'text' }]
        }
    };
    
    const handleOpenQuickAdd = (type: keyof typeof quickAddConfig) => {
        const config = { ...quickAddConfig[type] };
        if (type === 'camion' && selectedTransportistaId) {
            const transportistaField = config.fields.find(f => f.name === 'transportista_empresa_id');
            if (transportistaField) {
                transportistaField.defaultValue = selectedTransportistaId;
            }
        }
        setQuickAddState({ isOpen: true, ...config });
    };

    function onSubmit(data: IngresoFormData) {
        mutation.mutate(data);
    }

    const flattenedHistory = useMemo(() => {
        if (!history) return [];
        return history.flatMap(trip => 
            trip.detalle_ingreso_sustrato.map(detail => ({
                id: `${trip.id}-${detail.id}`,
                fecha_hora: trip.fecha_hora_ingreso,
                remito: trip.numero_remito_general,
                patente: trip.camiones?.patente,
                proveedor: detail.empresa?.nombre,
                sustrato: detail.sustratos?.nombre,
                cantidad: detail.cantidad_kg,
                usuario: trip.usuarios?.nombres ?? 'N/A'
            }))
        );
    }, [history]);
    
    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(flattenedHistory, { key: 'fecha_hora', direction: 'descending' });

    if (error) {
        return (
            <Page>
                <Card>
                    <CardContent className="pt-6">
                        <h2 className="text-lg font-semibold text-error mb-2">Error de Carga</h2>
                        <p className="text-text-secondary">No se pudieron cargar los datos necesarios para el formulario (sustratos, proveedores, etc.).</p>
                        <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{error}</pre>
                    </CardContent>
                </Card>
            </Page>
        );
    }
    
    const commonTableClasses = {
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Registro de ingreso de sustratos</h2>
                    <Form {...form}>
                        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                            <fieldset>
                                <legend className="text-base font-semibold text-text-primary">Datos del viaje</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                     <FormField
                                        control={form.control}
                                        name="transportista_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Empresa transportista</FormLabel>
                                                <FormControl>
                                                    <Select {...field} disabled={dataLoading}>
                                                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione transportista'}</option>
                                                        {transportistas.map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="camion_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>Camión</FormLabel>
                                                    <button type="button" onClick={() => handleOpenQuickAdd('camion')} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                                                </div>
                                                    <FormControl>
                                                        <Select {...field} disabled={dataLoading || !selectedTransportistaId}>
                                                            <option value="">{!selectedTransportistaId ? 'Seleccione un transportista primero' : 'Seleccione patente'}</option>
                                                            {filteredCamiones.map(c => <option key={c.id} value={String(c.id)}>{c.patente}</option>)}
                                                        </Select>
                                                    </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="remito"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>N° Remito</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </fieldset>
                            
                            <fieldset>
                                <legend className="text-base font-semibold text-text-primary">Detalle de la carga</legend>
                                <div className="space-y-4 mt-2">
                                     <FormField
                                        control={form.control}
                                        name="provider"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>Proveedor</FormLabel>
                                                    <button type="button" onClick={() => handleOpenQuickAdd('proveedor')} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                                                </div>
                                                <FormControl>
                                                    <Select {...field} disabled={dataLoading}>
                                                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione proveedor'}</option>
                                                        {proveedores.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="substrate"
                                        render={({ field }) => (
                                            <FormItem>
                                                 <div className="flex items-center justify-between">
                                                    <FormLabel>Sustrato</FormLabel>
                                                    <button type="button" onClick={() => handleOpenQuickAdd('sustrato')} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                                                </div>
                                                <FormControl>
                                                    <Select {...field} disabled={dataLoading || !selectedProviderId}>
                                                        <option value="">{!selectedProviderId ? 'Seleccione un proveedor primero' : 'Seleccione sustrato'}</option>
                                                        {filteredSustratos.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cantidad (Peso Neto kg)</FormLabel>
                                                <FormControl><Input type="number" {...field} placeholder="ej., 15500.50" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                 <div className="flex items-center justify-between">
                                                    <FormLabel>Lugar de descarga</FormLabel>
                                                    <button type="button" onClick={() => handleOpenQuickAdd('lugarDescarga')} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                                                </div>
                                                <FormControl>
                                                    <Select {...field} disabled={dataLoading}>
                                                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione lugar'}</option>
                                                        {lugaresDescarga.map(l => <option key={l.id} value={String(l.id)}>{l.nombre}</option>)}
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </fieldset>
                                                
                            <Button type="submit" variant="default" isLoading={mutation.isPending || dataLoading} disabled={dataLoading}>Registrar Ingreso</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            
            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Ingresos Recientes</h3>
                    {isHistoryLoading ? <p className="text-center text-text-secondary">Cargando historial...</p> : (
                         <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                 <thead className="bg-background">
                                     <tr>
                                         <SortableHeader columnKey="fecha_hora" title="Fecha" sortConfig={sortConfig} onSort={requestSort} />
                                         <SortableHeader columnKey="sustrato" title="Sustrato" sortConfig={sortConfig} onSort={requestSort} />
                                         <SortableHeader columnKey="cantidad" title="Cantidad (kg)" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
                                         <SortableHeader columnKey="proveedor" title="Proveedor" sortConfig={sortConfig} onSort={requestSort} className="hidden sm:table-cell" />
                                         <SortableHeader columnKey="usuario" title="Operador" sortConfig={sortConfig} onSort={requestSort} className="hidden md:table-cell" />
                                     </tr>
                                 </thead>
                                 <tbody className="bg-surface divide-y divide-border">
                                    {sortedHistory.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-4 text-text-secondary">No hay registros de ingresos.</td></tr>
                                    ) : sortedHistory.map(item => (
                                        <tr key={item.id}>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.sustrato}</td>
                                            <td className={`${commonTableClasses.cell} text-text-primary text-right`}>{item.cantidad?.toLocaleString('es-AR')}</td>
                                            <td className={`${commonTableClasses.cell} text-text-secondary hidden sm:table-cell`}>{item.proveedor}</td>
                                            <td className={`${commonTableClasses.cell} text-text-secondary hidden md:table-cell`}>{item.usuario}</td>
                                        </tr>
                                    ))}
                                 </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {quickAddState && (
                <QuickAddModal
                    isOpen={quickAddState.isOpen}
                    onClose={() => setQuickAddState(null)}
                    entityName={quickAddState.entity}
                    tableName={quickAddState.tableName}
                    formFields={quickAddState.fields}
                    extraData={quickAddState.extraData}
                    onSuccess={() => {
                        toast({ title: 'Éxito', description: `${quickAddState.entity} añadido con éxito.` });
                        refreshData();
                    }}
                />
            )}
        </Page>
    );
};

export default InputsPage;
