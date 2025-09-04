

import React, { useState, useMemo } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { PencilIcon, TrashIcon, PlusCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { Database } from '../types/database';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import QuickAddModal, { FormField as QuickFormField } from '../components/QuickAddModal';
import { useToast } from '../hooks/use-toast';
import { Select } from '../components/ui/Select';
import ProtectedRoute from '../components/ProtectedRoute.tsx';
import { useAuth } from '../contexts/AuthContext';
import { exportToCsv } from '../lib/utils';


// --- Co-located Zod Schemas ---
const camionSchema = z.object({
  patente: z.string().min(1, "La patente es requerida."),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  año: z.number()
        .int({ message: "El año debe ser un número entero." })
        .positive({ message: "El año debe ser un número positivo." })
        .optional(),
  transportista_empresa_id: z.string().min(1, "Debe seleccionar un transportista."),
});


// --- Co-located API Logic ---
type TableName = keyof Database['public']['Tables'];

const createEntity = async ({ tableName, data }: { tableName: TableName; data: any }) => {
    const { error } = await supabase.from(tableName).insert(data as any);
    if (error) throw error;
    return { success: true };
};

const updateEntity = async ({ tableName, data, id }: { tableName: TableName; data: any; id: number }) => {
    const { error } = await supabase.from(tableName).update(data as any).eq('id', id);
    if (error) throw error;
    return { success: true };
};

const deleteEntity = async ({ tableName, id }: { tableName: TableName; id: number }) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
};

// --- Feature Components ---
type Tab = 'sustratos' | 'proveedores' | 'transportistas' | 'camiones' | 'lugaresDescarga' | 'equipos';
type Sustrato = Database['public']['Tables']['sustratos']['Row'];
type Empresa = Database['public']['Tables']['empresa']['Row'];
type Camion = Database['public']['Tables']['camiones']['Row'];
type LugarDescarga = Database['public']['Tables']['lugares_descarga']['Row'];
type Equipo = Database['public']['Tables']['equipos']['Row'];
type ManagedEntity = Sustrato | Empresa | Camion | LugarDescarga | Equipo;

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none whitespace-nowrap ${
        active
          ? 'border-b-2 border-primary text-primary bg-blue-50'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
);

const ManagementPage: React.FC = () => {
    const { sustratos, proveedores, camiones, lugaresDescarga, equipos, transportistas, loading: dataLoading, error: dataError, refreshData } = useSupabaseData();
    const { activePlanta } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('sustratos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<ManagedEntity | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const { toast } = useToast();
    
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: ManagedEntity | null }>({ isOpen: false, item: null });
    const [deleteLoading, setDeleteLoading] = useState(false);
    
    const form = useForm<z.infer<typeof camionSchema>>({
        resolver: zodResolver(camionSchema),
        defaultValues: {
            patente: '',
            marca: '',
            modelo: '',
            transportista_empresa_id: '',
        }
    });

    const getTableName = (tab: Tab): TableName => {
        if (tab === 'proveedores' || tab === 'transportistas') return 'empresa';
        if (tab === 'lugaresDescarga') return 'lugares_descarga';
        return tab;
    };

    const handleOpenModal = (mode: 'add' | 'edit', item: ManagedEntity | null = null) => {
        setModalMode(mode);
        setCurrentItem(item);
        setFormError('');

        if (activeTab === 'camiones') {
             if (mode === 'edit' && item && 'patente' in item) {
                form.reset({
                    patente: item.patente || '',
                    marca: item.marca || '',
                    modelo: item.modelo || '',
                    año: item.año || undefined,
                    transportista_empresa_id: String(item.transportista_empresa_id || ''),
                });
            } else {
                form.reset({
                    patente: '',
                    marca: '',
                    modelo: '',
                    año: undefined,
                    transportista_empresa_id: '',
                });
            }
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const openDeleteConfirmation = (item: ManagedEntity) => {
        setDeleteConfirmation({ isOpen: true, item });
    };

    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({ isOpen: false, item: null });
    };
    
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.item) return;
        
        setDeleteLoading(true);
        // FIX: Replaced a faulty destructuring assignment with direct property access.
        // This resolves a TypeScript error where the item's complex union type was inferred as 'never'.
        const id = deleteConfirmation.item.id;
        const tableName = getTableName(activeTab);

        try {
            await deleteEntity({ tableName, id });
            await refreshData();
            closeDeleteConfirmation();
        } catch (error: any) {
            alert(`Error al eliminar: ${error.message}`);
        } finally {
            setDeleteLoading(false);
        }
    };
    
    const onManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        const tableName = getTableName(activeTab);
        
        if(activeTab === 'proveedores'){ data.tipo_empresa = 'proveedor'; }
        if(activeTab === 'transportistas'){ data.tipo_empresa = 'transportista'; }
        // FIX: Cast `data` to `any` before assigning a number to prevent a type conflict with FormDataEntryValue (string | File).
        if(activeTab === 'equipos' && activePlanta) { (data as any).planta_id = activePlanta.id; }
        
        try {
            if (modalMode === 'add') {
                await createEntity({ tableName, data });
            } else if (currentItem) {
                await updateEntity({ tableName, data, id: currentItem.id });
            }
            
            await refreshData();
            handleCloseModal();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const onCamionSubmit = async (values: z.infer<typeof camionSchema>) => {
        setFormLoading(true);
        setFormError('');
        const tableName = 'camiones';
        
        const data = { ...values, transportista_empresa_id: Number(values.transportista_empresa_id) };
        
        try {
            if (modalMode === 'add') {
                await createEntity({ tableName, data });
            } else if (currentItem) {
                await updateEntity({ tableName, data, id: currentItem.id });
            }
            
            await refreshData();
            handleCloseModal();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };
    
    const handleExport = () => {
        let dataToExport: any[] = [];
        let filename = `${activeTab}.csv`;
        
        switch (activeTab) {
            case 'sustratos':
                dataToExport = sustratos.map(({ id, created_at, updated_at, activo, planta_id, ...rest }) => rest);
                break;
            case 'proveedores':
                dataToExport = proveedores.map(({ id, created_at, updated_at, activo, direccion_id, id_empresa, iduseradmin, logo_url, tipo_empresa, ...rest }) => rest);
                break;
            case 'transportistas':
                dataToExport = transportistas.map(({ id, created_at, updated_at, activo, direccion_id, id_empresa, iduseradmin, logo_url, tipo_empresa, ...rest }) => rest);
                break;
            case 'camiones':
                dataToExport = camiones.map(c => ({
                    patente: c.patente,
                    marca: c.marca,
                    modelo: c.modelo,
                    año: c.año,
                    transportista: transportistas.find(t => t.id === c.transportista_empresa_id)?.nombre || 'N/A',
                }));
                break;
            case 'lugaresDescarga':
                dataToExport = lugaresDescarga.map(({ id, created_at, updated_at, activo, planta_id, ...rest }) => rest);
                break;
            case 'equipos':
                dataToExport = equipos.map(e => ({
                    nombre_equipo: e.nombre_equipo,
                    categoria: e.categoria,
                    codigo_equipo: e.codigo_equipo,
                    marca: e.marca,
                    modelo: e.modelo,
                }));
                break;
            default:
                return;
        }

        exportToCsv(filename, dataToExport);
    };
    
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    const getItemName = (item: ManagedEntity | null): string => {
        if (!item) return '';
        if ('nombre' in item) return item.nombre;
        if ('patente' in item) return item.patente;
        if ('nombre_equipo' in item) return item.nombre_equipo;
        return `ítem con ID ${item.id}`;
    };

    const renderTable = () => {
        const commonClasses = "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider";
        switch (activeTab) {
            case 'sustratos':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>Categoría</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {sustratos.map((item: Sustrato) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.categoria}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'proveedores':
                 return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>CUIT</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {proveedores.map((item: Empresa) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.cuit}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'transportistas':
                 return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>CUIT</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {transportistas.map((item: Empresa) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.cuit}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
             case 'camiones':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Patente</th><th className={commonClasses}>Marca</th><th className={commonClasses}>Transportista</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {camiones.map((item: Camion) => {
                                const transportista = transportistas.find(t => t.id === item.transportista_empresa_id);
                                return (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.patente}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.marca}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{transportista?.nombre || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                );
            case 'lugaresDescarga':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>Tipo</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {lugaresDescarga.map((item: LugarDescarga) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.tipo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'equipos':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>Categoría</th><th className={commonClasses}>Código</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {equipos.map((item: Equipo) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre_equipo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.categoria}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.codigo_equipo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default: return null;
        }
    };
    
    const renderModalForm = () => {
        switch (activeTab) {
            case 'sustratos':
                return (
                    <>
                        <div><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" type="text" defaultValue={'nombre' in currentItem ? currentItem.nombre : ''} required className={commonInputClasses}/></div>
                        <div><Label htmlFor="categoria">Categoría</Label><Input id="categoria" name="categoria" type="text" defaultValue={'categoria' in currentItem ? currentItem.categoria : ''} className={commonInputClasses}/></div>
                        <div><Label htmlFor="descripcion">Descripción</Label><Textarea id="descripcion" name="descripcion" defaultValue={'descripcion' in currentItem ? currentItem.descripcion : ''} className={commonInputClasses} /></div>
                    </>
                );
            case 'proveedores':
            case 'transportistas':
                return (
                     <>
                        <div><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" type="text" defaultValue={'nombre' in currentItem ? currentItem.nombre : ''} required className={commonInputClasses}/></div>
                        <div><Label htmlFor="razon_social">Razón Social</Label><Input id="razon_social" name="razon_social" type="text" defaultValue={'razon_social' in currentItem ? currentItem.razon_social : ''} className={commonInputClasses}/></div>
                        <div><Label htmlFor="cuit">CUIT</Label><Input id="cuit" name="cuit" type="text" defaultValue={'cuit' in currentItem ? currentItem.cuit : ''} className={commonInputClasses}/></div>
                    </>
                );
            case 'camiones':
                return (
                    <Form {...form}>
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="patente"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Patente</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="transportista_empresa_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Transportista</FormLabel>
                                            <button type="button" onClick={() => setIsQuickAddOpen(true)} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                                        </div>
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
                                name="marca"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marca</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="modelo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modelo</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="año"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Año</FormLabel>
                                        <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </Form>
                );
             case 'lugaresDescarga':
                return (
                     <>
                        <div><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" type="text" defaultValue={'nombre' in currentItem ? currentItem.nombre : ''} required className={commonInputClasses}/></div>
                        <div><Label htmlFor="tipo">Tipo</Label><Input id="tipo" name="tipo" type="text" defaultValue={'tipo' in currentItem ? currentItem.tipo : ''} placeholder="Ej: Playa, Tolva, Tanque" className={commonInputClasses}/></div>
                        <div><Label htmlFor="capacidad_m3">Capacidad (m³)</Label><Input id="capacidad_m3" name="capacidad_m3" type="number" min="0" defaultValue={'capacidad_m3' in currentItem ? currentItem.capacidad_m3 : ''} className={commonInputClasses}/></div>
                    </>
                );
            case 'equipos':
                return (
                    <>
                        <div><Label htmlFor="nombre_equipo">Nombre del Equipo</Label><Input id="nombre_equipo" name="nombre_equipo" type="text" defaultValue={'nombre_equipo' in currentItem ? currentItem.nombre_equipo : ''} required className={commonInputClasses}/></div>
                        <div><Label htmlFor="categoria">Categoría</Label><Input id="categoria" name="categoria" type="text" defaultValue={'categoria' in currentItem ? currentItem.categoria : ''} placeholder="Ej: Bomba, Agitador" className={commonInputClasses}/></div>
                        <div><Label htmlFor="codigo_equipo">Código / Tag</Label><Input id="codigo_equipo" name="codigo_equipo" type="text" defaultValue={'codigo_equipo' in currentItem ? currentItem.codigo_equipo : ''} placeholder="Ej: P-001" className={commonInputClasses}/></div>
                        <div><Label htmlFor="marca">Marca</Label><Input id="marca" name="marca" type="text" defaultValue={'marca' in currentItem ? currentItem.marca : ''} className={commonInputClasses}/></div>
                        <div><Label htmlFor="modelo">Modelo</Label><Input id="modelo" name="modelo" type="text" defaultValue={'modelo' in currentItem ? currentItem.modelo : ''} className={commonInputClasses}/></div>
                    </>
                );
            default: return null;
        }
    };

    const { title, data } = useMemo(() => {
        switch (activeTab) {
            case 'sustratos': return { title: 'Sustratos', data: sustratos };
            case 'proveedores': return { title: 'Proveedores', data: proveedores };
            case 'transportistas': return { title: 'Transportistas', data: transportistas };
            case 'camiones': return { title: 'Camiones', data: camiones };
            case 'lugaresDescarga': return { title: 'Lugares de Descarga', data: lugaresDescarga };
            case 'equipos': return { title: 'Equipos', data: equipos };
        }
    }, [activeTab, sustratos, proveedores, camiones, lugaresDescarga, equipos, transportistas]);

    const formSubmitHandler = activeTab === 'camiones' ? form.handleSubmit(onCamionSubmit) : onManualSubmit;

    return (
        <ProtectedRoute requiredPermission="administracion">
            <Page>
                <div className="mb-4 border-b border-gray-200">
                    <div className="overflow-x-auto">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                            <TabButton active={activeTab === 'sustratos'} onClick={() => setActiveTab('sustratos')}>Sustratos</TabButton>
                            <TabButton active={activeTab === 'proveedores'} onClick={() => setActiveTab('proveedores')}>Proveedores</TabButton>
                            <TabButton active={activeTab === 'transportistas'} onClick={() => setActiveTab('transportistas')}>Transportistas</TabButton>
                            <TabButton active={activeTab === 'camiones'} onClick={() => setActiveTab('camiones')}>Camiones</TabButton>
                            <TabButton active={activeTab === 'lugaresDescarga'} onClick={() => setActiveTab('lugaresDescarga')}>Lugares Descarga</TabButton>
                            <TabButton active={activeTab === 'equipos'} onClick={() => setActiveTab('equipos')}>Equipos</TabButton>
                        </nav>
                    </div>
                </div>

                {dataError && <Card><CardContent className="pt-6"><p className="text-red-500">{dataError}</p></CardContent></Card>}

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-text-primary">Gestionar {title}</h2>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => handleOpenModal('add')} variant="secondary" className="w-auto px-4 py-2 text-sm flex items-center gap-2">
                                    <PlusCircleIcon className="h-5 w-5" />
                                    Añadir Nuevo
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                    Exportar
                                </Button>
                            </div>
                        </div>

                        {dataLoading ? <p>Cargando datos...</p> : (
                            <div className="overflow-x-auto">
                                {data.length > 0 ? renderTable() : <p className="text-center text-text-secondary py-4">No hay {title.toLowerCase()} para mostrar.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{`${modalMode === 'add' ? 'Añadir' : 'Editar'} ${title.slice(0, -1)}`}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={formSubmitHandler} className="space-y-4 px-6 pb-6">
                            {renderModalForm()}
                            {formError && <p className="text-red-500 text-sm">{formError}</p>}
                            <div className="flex justify-end space-x-3 pt-4">
                                <Button type="button" variant="secondary" onClick={handleCloseModal} className="w-auto bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</Button>
                                <Button type="submit" variant="default" className="w-auto" isLoading={formLoading}>
                                    {modalMode === 'add' ? 'Guardar' : 'Actualizar'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && closeDeleteConfirmation()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Eliminación</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 pt-0">
                            <p className="text-sm text-text-secondary">
                                ¿Está seguro de que desea eliminar <strong>{getItemName(deleteConfirmation.item)}</strong>? Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeDeleteConfirmation}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleConfirmDelete} isLoading={deleteLoading}>Eliminar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <QuickAddModal
                    isOpen={isQuickAddOpen}
                    onClose={() => setIsQuickAddOpen(false)}
                    entityName="Transportista"
                    tableName="empresa"
                    formFields={[
                        { name: 'nombre', label: 'Nombre del Transportista', type: 'text', required: true },
                        { name: 'cuit', label: 'CUIT', type: 'text' }
                    ]}
                    extraData={{ tipo_empresa: 'transportista' }}
                    onSuccess={() => {
                        toast({ title: 'Éxito', description: 'Transportista añadido con éxito.' });
                        refreshData();
                    }}
                />
            </Page>
        </ProtectedRoute>
    );
};

export default ManagementPage;