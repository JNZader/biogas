import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { TrashIcon, PencilIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import ProtectedRoute from '../components/ProtectedRoute.tsx';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { DataTable } from '../components/ui/DataTable';
import { Textarea } from '../components/ui/Textarea';
import type { Database } from '../types/database';

type Equipo = Database['public']['Tables']['equipos']['Row'];
type Area = Database['public']['Tables']['areas_planta']['Row'];
type Subsistema = Database['public']['Tables']['subsistemas']['Row'];

// --- Co-located Components for Tabs ---

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

// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const plantDetailsSchema = z.object({
    nombre_planta: z.string().min(1, "El nombre es requerido."),
    ubicacion: z.string().optional(),
    capacity: z.number({invalid_type_error: "La capacidad debe ser un número."}).positive("La capacidad debe ser un número positivo.").optional(),
    digester_type: z.string().optional(),
});
type PlantDetailsFormData = z.infer<typeof plantDetailsSchema>;

const PlantDetails: React.FC<{ plantaId: number }> = ({ plantaId }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: plantData, isLoading: isPlantLoading } = useQuery({
        queryKey: ['planta', plantaId],
        queryFn: async () => {
            const { data, error } = await supabase.from('plantas').select('*').eq('id', plantaId).single();
            if (error) throw error;
            return data;
        },
    });
    
    const form = useForm<PlantDetailsFormData>({
        resolver: zodResolver(plantDetailsSchema),
        defaultValues: {
            nombre_planta: '',
            ubicacion: '',
            capacity: undefined,
            digester_type: '',
        }
    });

    useEffect(() => {
        if (plantData) {
            form.reset({
                nombre_planta: plantData.nombre_planta || '',
                ubicacion: plantData.ubicacion || '',
                capacity: (plantData.configuracion as any)?.capacity != null ? Number((plantData.configuracion as any).capacity) : undefined,
                digester_type: (plantData.configuracion as any)?.digester_type || '',
            });
        }
    }, [plantData, form]);

    const mutation = useMutation({
        mutationFn: async (formData: PlantDetailsFormData) => {
            const { error } = await supabase.from('plantas').update({
                nombre_planta: formData.nombre_planta,
                ubicacion: formData.ubicacion,
                configuracion: { capacity: formData.capacity, digester_type: formData.digester_type }
            }).eq('id', plantaId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Detalles de la planta actualizados.' });
            queryClient.invalidateQueries({ queryKey: ['planta', plantaId] });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    return (
        <Card>
            <CardHeader><CardTitle>Detalles Generales de la Planta</CardTitle></CardHeader>
            <CardContent>
                 {isPlantLoading ? <p>Cargando...</p> : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                            <FormField control={form.control} name="nombre_planta" render={({ field }) => (
                                <FormItem><FormLabel>Nombre de la Planta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="ubicacion" render={({ field }) => (
                                <FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="capacity" render={({ field }) => (
                                    <FormItem><FormLabel>Capacidad Digestor (m³)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="digester_type" render={({ field }) => (
                                    <FormItem><FormLabel>Tipo de Digestor</FormLabel><FormControl><Select {...field}><option value="">Seleccione...</option>{['CSTR (Mezcla Completa)', 'Flujo Pistón', 'UASB', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</Select></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <Button type="submit" isLoading={mutation.isPending}>Guardar Detalles</Button>
                        </form>
                    </Form>
                 )}
            </CardContent>
        </Card>
    );
};

const equipmentSchema = z.object({
    nombre_equipo: z.string().min(1, "El nombre es requerido."),
    categoria: z.string().optional(),
    codigo_equipo: z.string().optional(),
});
type EquipmentFormData = z.infer<typeof equipmentSchema>;

const EquipmentManagement: React.FC<{ plantaId: number }> = ({ plantaId }) => {
    const { equipos, refreshData } = useSupabaseData();
    const { toast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentItem, setCurrentItem] = useState<Equipo | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const form = useForm<EquipmentFormData>({
        resolver: zodResolver(equipmentSchema),
    });

    const mutation = useMutation({
        mutationFn: async ({ mode, data, id }: { mode: 'add' | 'edit' | 'delete', data?: any, id?: number }) => {
            if (mode === 'add') {
                const { error } = await supabase.from('equipos').insert({ ...data, planta_id: plantaId });
                if (error) throw error;
            } else if (mode === 'edit' && id) {
                const { error } = await supabase.from('equipos').update(data).eq('id', id);
                if (error) throw error;
            } else if (mode === 'delete' && id) {
                const { error } = await supabase.from('equipos').delete().eq('id', id);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Operación realizada com éxito.' });
            refreshData();
            setIsModalOpen(false);
            setIsDeleteModalOpen(false);
        },
        onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });

    const handleOpenModal = (mode: 'add' | 'edit', item: Equipo | null = null) => {
        setModalMode(mode);
        setCurrentItem(item);
        form.reset(mode === 'edit' ? item : { nombre_equipo: '', categoria: '', codigo_equipo: '' });
        setIsModalOpen(true);
    };

    const onSubmit = (data: EquipmentFormData) => {
        mutation.mutate({ mode: modalMode, data, id: currentItem?.id });
    };

    const handleDelete = (item: Equipo) => {
        setCurrentItem(item);
        setIsDeleteModalOpen(true);
    };

    const columns = useMemo(() => [
        { header: 'Nombre', accessorKey: 'nombre_equipo' as keyof Equipo },
        { header: 'Categoría', accessorKey: 'categoria' as keyof Equipo },
        { header: 'Código', accessorKey: 'codigo_equipo' as keyof Equipo },
    ], []);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Gestión de Equipos</CardTitle>
                    <Button onClick={() => handleOpenModal('add')}><PlusCircleIcon className="h-5 w-5 mr-2" /> Crear Equipo</Button>
                </div>
            </CardHeader>
            <CardContent>
                <DataTable columns={columns} data={equipos} onEdit={(item) => handleOpenModal('edit', item)} onDelete={handleDelete} />
            </CardContent>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{modalMode === 'add' ? 'Crear' : 'Editar'} Equipo</DialogTitle></DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 pb-6">
                            <FormField control={form.control} name="nombre_equipo" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="categoria" render={({ field }) => (<FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="codigo_equipo" render={({ field }) => (<FormItem><FormLabel>Código</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit" isLoading={mutation.isPending}>Guardar</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Confirmar Eliminación</DialogTitle></DialogHeader>
                    <div className="p-6">¿Seguro que quieres eliminar el equipo "{currentItem?.nombre_equipo}"?</div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => mutation.mutate({ mode: 'delete', id: currentItem?.id })} isLoading={mutation.isPending}>Eliminar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

const areaSchema = z.object({ nombre_area: z.string().min(1, 'El nombre es requerido'), descripcion: z.string().optional() });
const subsistemaSchema = z.object({ nombre_subsistema: z.string().min(1, 'El nombre es requerido'), descripcion: z.string().optional() });

const AreasManagement: React.FC<{ plantaId: number }> = ({ plantaId }) => {
    const { areasPlanta, subsistemas, refreshData } = useSupabaseData();
    const { toast } = useToast();

    const [isAreaModalOpen, setAreaModalOpen] = useState(false);
    const [areaModalMode, setAreaModalMode] = useState<'add' | 'edit'>('add');
    const [currentArea, setCurrentArea] = useState<Area | null>(null);
    
    const [isSubsystemModalOpen, setIsSubsystemModalOpen] = useState(false);
    const [subsystemModalMode, setSubsystemModalMode] = useState<'add' | 'edit'>('add');
    const [currentSubsystem, setCurrentSubsystem] = useState<Subsistema | null>(null);
    const [parentAreaId, setParentAreaId] = useState<number | null>(null);

    const areaForm = useForm({ resolver: zodResolver(areaSchema) });
    const subsystemForm = useForm({ resolver: zodResolver(subsistemaSchema) });

    const mutation = useMutation({
        mutationFn: async ({ entity, mode, data, id }: { entity: 'area' | 'subsistema', mode: 'add' | 'edit' | 'delete', data?: any, id?: number }) => {
            const tableName = entity === 'area' ? 'areas_planta' : 'subsistemas';
            if (mode === 'add') {
                const { error } = await supabase.from(tableName).insert(data);
                if (error) throw error;
            } else if (mode === 'edit' && id) {
                const { error } = await supabase.from(tableName).update(data).eq('id', id);
                if (error) throw error;
            } else if (mode === 'delete' && id) {
                const { error } = await supabase.from(tableName).delete().eq('id', id);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Operación realizada con éxito.' });
            refreshData();
            setAreaModalOpen(false);
            setIsSubsystemModalOpen(false);
            setCurrentArea(null);
            setCurrentSubsystem(null);
        },
        onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });
    
    const handleOpenAreaModal = (mode: 'add' | 'edit', area: Area | null = null) => {
        setAreaModalMode(mode);
        setCurrentArea(area);
        areaForm.reset(mode === 'edit' ? area : { nombre_area: '', descripcion: '' });
        setAreaModalOpen(true);
    };

    const handleOpenSubsystemModal = (mode: 'add' | 'edit', parentId: number, subsistema: Subsistema | null = null) => {
        setSubsystemModalMode(mode);
        setParentAreaId(parentId);
        setCurrentSubsystem(subsistema);
        subsystemForm.reset(mode === 'edit' ? subsistema : { nombre_subsistema: '', descripcion: '' });
        setIsSubsystemModalOpen(true);
    };
    
    const onAreaSubmit = (data: z.infer<typeof areaSchema>) => {
        const dataToSubmit = { ...data, planta_id: plantaId };
        mutation.mutate({ entity: 'area', mode: areaModalMode, data: dataToSubmit, id: currentArea?.id });
    };

    const onSubsystemSubmit = (data: z.infer<typeof subsistemaSchema>) => {
        const dataToSubmit = { ...data, area_id: parentAreaId };
        mutation.mutate({ entity: 'subsistema', mode: subsystemModalMode, data: dataToSubmit, id: currentSubsystem?.id });
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={() => handleOpenAreaModal('add')}><PlusCircleIcon className="h-5 w-5 mr-2" /> Crear Área</Button>
            </div>
            <div className="space-y-4">
                {areasPlanta.map(area => (
                    <Card key={area.id}>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>{area.nombre_area}</CardTitle>
                            <div className="space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenAreaModal('edit', area)}><PencilIcon className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="text-error" onClick={() => { setCurrentArea(area); mutation.mutate({ entity: 'area', mode: 'delete', id: area.id })}}><TrashIcon className="h-5 w-5" /></Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenSubsystemModal('add', area.id)}><PlusCircleIcon className="h-4 w-4 mr-1" /> Añadir Subsistema</Button>
                            {subsistemas.filter(s => s.area_id === area.id).map(sub => (
                                <div key={sub.id} className="flex items-center justify-between p-2 bg-background rounded-md">
                                    <p>{sub.nombre_subsistema}</p>
                                    <div className="space-x-1">
                                         <Button variant="ghost" size="icon" onClick={() => handleOpenSubsystemModal('edit', area.id, sub)}><PencilIcon className="h-4 w-4" /></Button>
                                         <Button variant="ghost" size="icon" className="text-error" onClick={() => mutation.mutate({ entity: 'subsistema', mode: 'delete', id: sub.id })}><TrashIcon className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isAreaModalOpen} onOpenChange={setAreaModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{areaModalMode === 'add' ? 'Crear' : 'Editar'} Área</DialogTitle></DialogHeader>
                    <Form {...areaForm}>
                        <form onSubmit={areaForm.handleSubmit(onAreaSubmit)} className="space-y-4 p-6">
                            <FormField control={areaForm.control} name="nombre_area" render={({ field }) => (<FormItem><FormLabel>Nombre del Área</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={areaForm.control} name="descripcion" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <DialogFooter><Button type="button" variant="outline" onClick={() => setAreaModalOpen(false)}>Cancelar</Button><Button type="submit" isLoading={mutation.isPending}>Guardar</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isSubsystemModalOpen} onOpenChange={setIsSubsystemModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{subsystemModalMode === 'add' ? 'Añadir' : 'Editar'} Subsistema</DialogTitle></DialogHeader>
                    <Form {...subsystemForm}>
                        <form onSubmit={subsystemForm.handleSubmit(onSubsystemSubmit)} className="space-y-4 p-6">
                            <FormField control={subsystemForm.control} name="nombre_subsistema" render={({ field }) => (<FormItem><FormLabel>Nombre del Subsistema</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={subsystemForm.control} name="descripcion" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsSubsystemModalOpen(false)}>Cancelar</Button><Button type="submit" isLoading={mutation.isPending}>Guardar</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const SetupPage: React.FC = () => {
    const { activePlanta } = useAuth();
    const [activeTab, setActiveTab] = useState<'details' | 'equipment' | 'areas'>('details');
    
    if (!activePlanta) {
        return <Page><p>Seleccione una planta para continuar.</p></Page>;
    }
    
    return (
        <ProtectedRoute requiredPermission="setup">
            <Page>
                <h1 className="text-2xl font-bold text-text-primary mb-4">Configuración de la Planta</h1>
                 <div className="mb-4 border-b border-border">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>Detalles de la Planta</TabButton>
                        <TabButton active={activeTab === 'equipment'} onClick={() => setActiveTab('equipment')}>Equipos</TabButton>
                        <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')}>Áreas y Subsistemas</TabButton>
                    </nav>
                </div>
                <div className="mt-6">
                    {activeTab === 'details' && <PlantDetails plantaId={activePlanta.id} />}
                    {activeTab === 'equipment' && <EquipmentManagement plantaId={activePlanta.id} />}
                    {activeTab === 'areas' && <AreasManagement plantaId={activePlanta.id} />}
                </div>
            </Page>
        </ProtectedRoute>
    );
};

export default SetupPage;
