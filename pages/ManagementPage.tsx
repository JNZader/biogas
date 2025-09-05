import React, { useState, useMemo, useRef, useEffect } from 'react';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { PlusCircleIcon, ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Database } from '../types/database';
import { useToast } from '../hooks/use-toast';
import { Select } from '../components/ui/Select';
import ProtectedRoute from '../components/ProtectedRoute.tsx';
import { useAuth } from '../contexts/AuthContext';
import { exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { DataTable } from '../components/ui/DataTable';
import { cn } from '../lib/utils';


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
type EntityKey = 'sustratos' | 'proveedores' | 'transportistas' | 'camiones' | 'lugaresDescarga' | 'equipos';
type Sustrato = Database['public']['Tables']['sustratos']['Row'];
type Empresa = Database['public']['Tables']['empresa']['Row'];
type Camion = Database['public']['Tables']['camiones']['Row'];
type LugarDescarga = Database['public']['Tables']['lugares_descarga']['Row'];
type Equipo = Database['public']['Tables']['equipos']['Row'];
type ManagedEntity = Sustrato | Empresa | Camion | LugarDescarga | Equipo;

interface FormFieldConfig {
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select';
    required?: boolean;
    options?: { value: string; label: string }[];
}

const ManagementPage: React.FC = () => {
    const { sustratos, proveedores, camiones, lugaresDescarga, equipos, transportistas, loading: dataLoading, error: dataError, refreshData } = useSupabaseData();
    const { activePlanta } = useAuth();
    const { toast } = useToast();

    const [selectedEntity, setSelectedEntity] = useState<EntityKey>('transportistas');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<ManagedEntity | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: ManagedEntity | null }>({ isOpen: false, item: null });
    const [deleteLoading, setDeleteLoading] = useState(false);
    
    const [filter, setFilter] = useState('');

    const getTableName = (entity: EntityKey): TableName => {
        if (entity === 'proveedores' || entity === 'transportistas') return 'empresa';
        if (entity === 'lugaresDescarga') return 'lugares_descarga';
        return entity;
    };

    const managementConfig = useMemo(() => {
        const baseConfig = {
            title: '',
            data: [] as any[],
            tableName: 'sustratos' as TableName,
            filterColumn: 'nombre' as any,
            columns: [] as any[],
            formFields: [] as FormFieldConfig[],
        };

        switch (selectedEntity) {
            case 'sustratos':
                baseConfig.title = 'Sustratos';
                baseConfig.data = sustratos;
                baseConfig.tableName = 'sustratos';
                baseConfig.filterColumn = 'nombre';
                baseConfig.columns = [
                    { header: 'Nombre', accessorKey: 'nombre' },
                    { header: 'Categoría', accessorKey: 'categoria' },
                ];
                baseConfig.formFields = [
                    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { name: 'categoria', label: 'Categoría', type: 'text' },
                    { name: 'descripcion', label: 'Descripción', type: 'textarea' },
                ];
                break;
            case 'proveedores':
                baseConfig.title = 'Proveedores';
                baseConfig.data = proveedores;
                baseConfig.tableName = 'empresa';
                baseConfig.filterColumn = 'nombre';
                baseConfig.columns = [
                    { header: 'Nombre', accessorKey: 'nombre' },
                    { header: 'CUIT', accessorKey: 'cuit' },
                ];
                baseConfig.formFields = [
                    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { name: 'razon_social', label: 'Razón Social', type: 'text' },
                    { name: 'cuit', label: 'CUIT', type: 'text' },
                ];
                break;
             case 'transportistas':
                baseConfig.title = 'Transportistas';
                baseConfig.data = transportistas;
                baseConfig.tableName = 'empresa';
                baseConfig.filterColumn = 'nombre';
                baseConfig.columns = [
                    { header: 'Nombre', accessorKey: 'nombre' },
                    { header: 'CUIT', accessorKey: 'cuit' },
                ];
                baseConfig.formFields = [
                    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { name: 'cuit', label: 'CUIT', type: 'text' },
                ];
                break;
            case 'camiones':
                baseConfig.title = 'Camiones';
                baseConfig.data = camiones;
                baseConfig.tableName = 'camiones';
                baseConfig.filterColumn = 'patente';
                baseConfig.columns = [
                    { header: 'Patente', accessorKey: 'patente' },
                    { header: 'Marca', accessorKey: 'marca' },
                    { header: 'Transportista', accessorKey: 'transportista_empresa_id', cell: (item: Camion) => transportistas.find(t => t.id === item.transportista_empresa_id)?.nombre || 'N/A' },
                ];
                baseConfig.formFields = [
                    { name: 'patente', label: 'Patente', type: 'text', required: true },
                    { name: 'transportista_empresa_id', label: 'Transportista', type: 'select', required: true, options: transportistas.map(t => ({ value: String(t.id), label: t.nombre })) },
                    { name: 'marca', label: 'Marca', type: 'text' },
                    { name: 'modelo', label: 'Modelo', type: 'text' },
                    { name: 'año', label: 'Año', type: 'number' },
                ];
                break;
            case 'lugaresDescarga':
                 baseConfig.title = 'Lugares de Descarga';
                 baseConfig.data = lugaresDescarga;
                 baseConfig.tableName = 'lugares_descarga';
                 baseConfig.filterColumn = 'nombre';
                 baseConfig.columns = [
                     { header: 'Nombre', accessorKey: 'nombre' },
                     { header: 'Tipo', accessorKey: 'tipo' },
                 ];
                 baseConfig.formFields = [
                     { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                     { name: 'tipo', label: 'Tipo', type: 'text' },
                     { name: 'capacidad_m3', label: 'Capacidad (m³)', type: 'number' },
                 ];
                 break;
            case 'equipos':
                baseConfig.title = 'Equipos';
                baseConfig.data = equipos;
                baseConfig.tableName = 'equipos';
                baseConfig.filterColumn = 'nombre_equipo';
                baseConfig.columns = [
                    { header: 'Nombre', accessorKey: 'nombre_equipo' },
                    { header: 'Categoría', accessorKey: 'categoria' },
                    { header: 'Código', accessorKey: 'codigo_equipo' },
                ];
                baseConfig.formFields = [
                    { name: 'nombre_equipo', label: 'Nombre', type: 'text', required: true },
                    { name: 'categoria', label: 'Categoría', type: 'text' },
                    { name: 'codigo_equipo', label: 'Código / Tag', type: 'text' },
                    { name: 'marca', label: 'Marca', type: 'text' },
                    { name: 'modelo', label: 'Modelo', type: 'text' },
                ];
                break;
        }
        return baseConfig;
    }, [selectedEntity, sustratos, proveedores, camiones, lugaresDescarga, equipos, transportistas]);
    
    const filteredData = useMemo(() => {
        if (!filter) return managementConfig.data;
        return managementConfig.data.filter(item => {
            const value = item[managementConfig.filterColumn];
            return value && typeof value === 'string' && value.toLowerCase().includes(filter.toLowerCase());
        });
    }, [managementConfig.data, filter, managementConfig.filterColumn]);


    const handleOpenModal = (mode: 'add' | 'edit', item: ManagedEntity | null = null) => {
        setModalMode(mode);
        setCurrentItem(item);
        setFormError('');
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
        const id = (deleteConfirmation.item as { id: number }).id;
        const tableName = getTableName(selectedEntity);

        try {
            await deleteEntity({ tableName, id });
            await refreshData();
            closeDeleteConfirmation();
            toast({ title: 'Éxito', description: `${managementConfig.title.slice(0, -1)} eliminado.` });
        } catch (error: any) {
            toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
        } finally {
            setDeleteLoading(false);
        }
    };
    
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        const formData = new FormData(e.currentTarget);
        // FIX: Explicitly type `data` to allow assigning numeric values, resolving the 'FormDataEntryValue' type error.
        const data: { [key: string]: any } = Object.fromEntries(formData.entries());

        // Process data types
        managementConfig.formFields.forEach(field => {
            if (field.type === 'number' && data[field.name]) {
                data[field.name] = Number(data[field.name]);
            }
             if (field.type === 'select' && data[field.name] && field.name.endsWith('_id')) {
                data[field.name] = Number(data[field.name]);
            }
        });
        
        // Add extra required data
        if(selectedEntity === 'proveedores'){ data.tipo_empresa = 'proveedor'; }
        if(selectedEntity === 'transportistas'){ data.tipo_empresa = 'transportista'; }
        if(selectedEntity === 'equipos' && activePlanta) { (data as any).planta_id = activePlanta.id; }
        
        try {
            if (modalMode === 'add') {
                await createEntity({ tableName: managementConfig.tableName, data });
            } else if (currentItem) {
                await updateEntity({ tableName: managementConfig.tableName, data, id: (currentItem as { id: number }).id });
            }
            
            await refreshData();
            handleCloseModal();
            toast({ title: 'Éxito', description: `${managementConfig.title.slice(0, -1)} guardado.` });
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };
    
    const dataToExport = useMemo(() => {
        let data = managementConfig.data;
        if (selectedEntity === 'camiones') {
            return camiones.map(c => ({
                patente: c.patente,
                marca: c.marca,
                modelo: c.modelo,
                año: c.año,
                transportista: transportistas.find(t => t.id === c.transportista_empresa_id)?.nombre || 'N/A',
            }));
        } else {
             return data.map(item => {
                const { id, created_at, updated_at, activo, planta_id, ...rest } = item as any;
                return rest;
            });
        }
    }, [managementConfig.data, selectedEntity, camiones, transportistas]);


    const getItemName = (item: ManagedEntity | null): string => {
        if (!item) return '';
        if ('nombre' in item && item.nombre) return item.nombre;
        if ('patente' in item && item.patente) return item.patente;
        if ('nombre_equipo' in item && item.nombre_equipo) return item.nombre_equipo;
        return `ítem con ID ${(item as { id: number }).id}`;
    };
    
    const renderModalFormFields = () => (
        managementConfig.formFields.map(field => (
            <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === 'textarea' ? (
                    <Textarea id={field.name} name={field.name} required={field.required} className="mt-1" defaultValue={currentItem?.[field.name as keyof ManagedEntity] as string ?? ''}/>
                ) : field.type === 'select' ? (
                    <Select id={field.name} name={field.name} required={field.required} className="mt-1" defaultValue={currentItem?.[field.name as keyof ManagedEntity] as string ?? ''}>
                        <option value="">Seleccione una opción</option>
                        {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                ) : (
                    <Input id={field.name} name={field.name} type={field.type} required={field.required} className="mt-1" min={field.type === 'number' ? '0' : undefined} defaultValue={currentItem?.[field.name as keyof ManagedEntity] as any ?? ''} />
                )}
            </div>
        ))
    );
    
    return (
        <ProtectedRoute requiredPermission="administracion">
            <Page>
                 {dataError && <Card><CardContent className="pt-6"><p className="text-red-500">{dataError}</p></CardContent></Card>}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
                             <div className="w-full flex flex-col sm:flex-row gap-4">
                                 <div className="flex-1 sm:max-w-xs">
                                    <Label htmlFor="entity-select" className="mb-2 block">Seleccionar Entidad a Gestionar</Label>
                                    <Select id="entity-select" value={selectedEntity} onChange={e => setSelectedEntity(e.target.value as EntityKey)}>
                                        <option value="sustratos">Sustratos</option>
                                        <option value="proveedores">Proveedores</option>
                                        <option value="transportistas">Transportistas</option>
                                        <option value="camiones">Camiones</option>
                                        <option value="lugaresDescarga">Lugares Descarga</option>
                                        <option value="equipos">Equipos</option>
                                    </Select>
                                </div>
                                <div className="flex-1 sm:max-w-xs">
                                    <Label htmlFor="filter-input" className="mb-2 block">Filtrar por nombre...</Label>
                                    <Input
                                        id="filter-input"
                                        placeholder="Escriba para filtrar..."
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end">
                                <Button onClick={() => handleOpenModal('add')} variant="secondary" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                                    Añadir Nuevo
                                </Button>
                                <ExportButton data={dataToExport} filename={selectedEntity} disabled={managementConfig.data.length === 0} />
                            </div>
                        </div>

                        {dataLoading ? <p>Cargando datos...</p> : (
                             <DataTable
                                columns={managementConfig.columns}
                                data={filteredData}
                                onEdit={(item) => handleOpenModal('edit', item)}
                                onDelete={openDeleteConfirmation}
                            />
                        )}
                    </CardContent>
                </Card>
                
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{`${modalMode === 'add' ? 'Añadir' : 'Editar'} ${managementConfig.title.slice(0, -1)}`}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} className="space-y-4 px-6 pb-6">
                            {renderModalFormFields()}
                            {formError && <p className="text-red-500 text-sm">{formError}</p>}
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                                <Button type="submit" variant="default" isLoading={formLoading}>
                                    {modalMode === 'add' ? 'Guardar' : 'Actualizar'}
                                </Button>
                            </DialogFooter>
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
            </Page>
        </ProtectedRoute>
    );
};

export default ManagementPage;