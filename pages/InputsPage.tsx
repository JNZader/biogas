import React, { useState } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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


// --- Co-located Zod Schema ---
// FIX: Replaced z.coerce.number with z.number since coercion is handled in the component's onChange event, resolving type inference issues.
const ingresoSchema = z.object({
  camion_id: z.string().min(1, "Debe seleccionar un camión."),
  remito: z.string().min(1, "El número de remito es requerido."),
  provider: z.string().min(1, "Debe seleccionar un proveedor."),
  substrate: z.string().min(1, "Debe seleccionar un sustrato."),
  quantity: z.number()
          .positive({ message: "La cantidad debe ser mayor a cero." }),
  location: z.string().min(1, "Debe seleccionar un lugar de descarga."),
});

// --- Co-located API Logic ---
const createIngresoSustrato = async (formData: z.infer<typeof ingresoSchema>) => {
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
    
    const form = useForm<z.infer<typeof ingresoSchema>>({
        resolver: zodResolver(ingresoSchema),
        defaultValues: {
            camion_id: "",
            remito: "",
            provider: "",
            substrate: "",
            quantity: undefined,
            location: "",
        },
    });

    const mutation = useMutation({
        mutationFn: createIngresoSustrato,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Ingreso registrado con éxito!' });
            queryClient.invalidateQueries({ queryKey: ['ingresos'] });
            form.reset();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al registrar: ${err.message}`, variant: 'destructive' });
            console.error(err);
        }
    });

    // FIX: Removed `as const` and used an explicit type to avoid readonly issues with the `fields` array when setting state, while still preserving literal types.
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
                    label: 'Transportista', 
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
        const config = quickAddConfig[type];
        setQuickAddState({ isOpen: true, ...config });
    };

    function onSubmit(data: z.infer<typeof ingresoSchema>) {
        mutation.mutate(data);
    }

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

    return (
        <Page>
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Registro de Ingreso de Sustratos</h2>
                    <Form {...form}>
                        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                            <fieldset>
                                <legend className="text-base font-semibold text-text-primary">Datos del Viaje</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
                                                        <Select {...field} disabled={dataLoading}>
                                                            <option value="">{dataLoading ? 'Cargando...' : 'Seleccione patente'}</option>
                                                            {camiones.map(c => <option key={c.id} value={String(c.id)}>{c.patente}</option>)}
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
                                <legend className="text-base font-semibold text-text-primary">Detalle de la Carga</legend>
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
                                                    <Select {...field} disabled={dataLoading}>
                                                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione sustrato'}</option>
                                                        {sustratos.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
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
                                                {/* FIX: Added an onChange handler to explicitly convert the input value to a number for type consistency. */}
                                                <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
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
                                                    <FormLabel>Lugar de Descarga</FormLabel>
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
                                                
                            {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
                            <Button type="submit" variant="default" isLoading={mutation.isPending || dataLoading} disabled={dataLoading}>Registrar Ingreso</Button>
                        </form>
                    </Form>
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