import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { PencilIcon, TrashIcon, PlusCircleIcon, ArchiveBoxIcon, ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import EmptyState from '../components/EmptyState';
import ProtectedRoute from '../components/ProtectedRoute.tsx';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { PlantaId, RepuestoId } from '../types/branded';
import { cn } from '../lib/utils';

type Repuesto = Database['public']['Tables']['repuestos']['Row'];
type RepuestoInsert = Database['public']['Tables']['repuestos']['Insert'];
type RepuestoUpdate = Database['public']['Tables']['repuestos']['Update'];

// --- Co-located API Logic ---
const fetchStockItems = async (plantaId: PlantaId): Promise<Repuesto[]> => {
    const { data, error } = await supabase
        .from('repuestos')
        .select('*')
        .eq('planta_id', plantaId)
        .order('nombre_repuesto');
    if (error) throw error;
    return data || [];
};

const createStockItem = async (item: RepuestoInsert) => {
    const { error } = await supabase.from('repuestos').insert(item);
    if (error) throw error;
};

const updateStockItem = async ({ id, item }: { id: RepuestoId, item: RepuestoUpdate }) => {
    const { error } = await supabase.from('repuestos').update(item).eq('id', id);
    if (error) throw error;
};

const deleteStockItem = async (id: RepuestoId) => {
    const { error } = await supabase.from('repuestos').delete().eq('id', id);
    if (error) throw error;
};

// --- Type for the mutation variables, using a discriminated union for type safety ---
type MutationVars = 
  | { mode: 'add'; item: RepuestoInsert }
  | { mode: 'edit'; item: RepuestoUpdate; id: RepuestoId }
  | { mode: 'delete'; id: RepuestoId };

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


const StockPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { activePlanta } = useAuth();
    const { proveedores, loading: dataLoading } = useSupabaseData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Repuesto | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: Repuesto | null }>({ isOpen: false, item: null });

    const { data: stockItems = [], isLoading: stockLoading, error } = useQuery({
        queryKey: ['stockItems', activePlanta?.id],
        queryFn: () => fetchStockItems(activePlanta!.id as PlantaId),
        enabled: !!activePlanta,
    });
    
    const mutation = useMutation({
        mutationFn: (vars: MutationVars) => {
            switch (vars.mode) {
                case 'add':
                    return createStockItem(vars.item);
                case 'edit':
                    return updateStockItem({ id: vars.id, item: vars.item });
                case 'delete':
                    return deleteStockItem(vars.id);
                default:
                    // This should be unreachable if vars is correctly typed
                    return Promise.reject('Invalid mutation call');
            }
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'La operación se completó correctamente.' });
            queryClient.invalidateQueries({ queryKey: ['stockItems'] });
            handleCloseModal();
            closeDeleteConfirmation();
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    const handleOpenModal = (mode: 'add' | 'edit', item: Repuesto | null = null) => {
        setModalMode(mode);
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!activePlanta) {
            toast({ title: 'Error', description: 'Planta no seleccionada.', variant: 'destructive' });
            return;
        }

        const formData = new FormData(e.currentTarget);
        const dataToSubmit = {
            nombre_repuesto: formData.get('nombre_repuesto') as string,
            codigo_sku: (formData.get('codigo_sku') as string) || null,
            proveedor_principal_empresa_id: formData.get('proveedor_principal_empresa_id') ? Number(formData.get('proveedor_principal_empresa_id')) : null,
            stock_actual: Number(formData.get('stock_actual')),
            stock_minimo: formData.get('stock_minimo') ? Number(formData.get('stock_minimo')) : null,
            stock_maximo: formData.get('stock_maximo') ? Number(formData.get('stock_maximo')) : null,
            ubicacion_almacen: (formData.get('ubicacion_almacen') as string) || null,
            planta_id: activePlanta.id,
        };

        if (modalMode === 'add') {
            mutation.mutate({ mode: 'add', item: dataToSubmit });
        } else if (currentItem) {
            mutation.mutate({ mode: 'edit', id: currentItem.id as RepuestoId, item: dataToSubmit });
        }
    };
    
    const openDeleteConfirmation = (item: Repuesto) => {
        setDeleteConfirmation({ isOpen: true, item });
    };

    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({ isOpen: false, item: null });
    };
    
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.item) return;
        mutation.mutate({ mode: 'delete', id: deleteConfirmation.item.id as RepuestoId });
    };

    const getStatus = (item: Repuesto) => {
        if (item.stock_minimo !== null && item.stock_actual <= item.stock_minimo) return 'low';
        return 'ok';
    };

    const getStatusBadge = (status: string) => {
        if (status === 'low') return 'bg-error-bg text-error';
        return 'bg-success-bg text-success';
    };

    const dataToExport = useMemo(() => stockItems.map(item => {
        const proveedor = proveedores.find(p => p.id === item.proveedor_principal_empresa_id);
        return {
            nombre_repuesto: item.nombre_repuesto,
            sku: item.codigo_sku || 'N/A',
            proveedor: proveedor?.nombre || 'N/A',
            stock_actual: item.stock_actual,
            stock_minimo: item.stock_minimo,
            stock_maximo: item.stock_maximo,
            ubicacion: item.ubicacion_almacen,
            estado: getStatus(item) === 'low' ? 'Bajo Stock' : 'OK',
        };
    }), [stockItems, proveedores]);

    if (stockLoading) {
        return <Page><Card><CardContent className="pt-6"><p className="text-center text-text-secondary">Cargando inventario...</p></CardContent></Card></Page>
    }

    if (error) {
        return <Page><Card><CardContent className="pt-6"><h2 className="text-lg font-semibold text-error mb-2">Error</h2><p className="text-text-secondary">No se pudieron obtener los datos de stock.</p><pre className="mt-4 p-2 bg-background text-error text-xs rounded">{error.message}</pre></CardContent></Card></Page>;
    }

  return (
    <ProtectedRoute requiredPermission="stock">
        <Page>
        <Card>
            <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-text-primary">Inventario de Repuestos</h2>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => handleOpenModal('add')} variant="secondary" className="w-auto px-4 py-2 text-sm flex items-center gap-2">
                            <PlusCircleIcon className="h-5 w-5"/>
                            Añadir Nuevo Ítem
                        </Button>
                        <ExportButton data={dataToExport} filename="inventario_stock" disabled={stockItems.length === 0} />
                    </div>
                </div>
                
                {stockItems.length === 0 ? (
                    <EmptyState
                        icon={<ArchiveBoxIcon className="mx-auto h-12 w-12" />}
                        title="Inventario vacío"
                        message="Aún no se han añadido repuestos al stock."
                        action={<Button onClick={() => handleOpenModal('add')} variant="secondary" className="w-auto mt-4 px-4 py-2 text-sm">Añadir Ítem</Button>}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nombre</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Proveedor</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Stock Actual</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Estado</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {stockItems.map((item) => {
                                    const status = getStatus(item);
                                    const proveedor = proveedores.find(p => p.id === item.proveedor_principal_empresa_id);
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-text-primary">{item.nombre_repuesto}</div>
                                                <div className="text-sm text-text-secondary">{item.codigo_sku || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary hidden sm:table-cell">{proveedor?.nombre || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-text-primary">{item.stock_actual} / {item.stock_maximo || 'N/A'}</div>
                                                <div className="text-sm text-text-secondary">Mín: {item.stock_minimo}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(status)}`}>{status === 'low' ? 'Bajo Stock' : 'OK'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800" aria-label={`Editar ${item.nombre_repuesto}`}><PencilIcon className="h-5 w-5"/></button>
                                                <button onClick={() => openDeleteConfirmation(item)} className="p-1 text-error hover:opacity-80" aria-label={`Eliminar ${item.nombre_repuesto}`}><TrashIcon className="h-5 w-5"/></button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{`${modalMode === 'add' ? 'Añadir' : 'Editar'} Repuesto`}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                        <div><Label htmlFor="nombre_repuesto">Nombre Repuesto</Label><Input id="nombre_repuesto" name="nombre_repuesto" type="text" defaultValue={currentItem?.nombre_repuesto} required/></div>
                        <div><Label htmlFor="codigo_sku">Código (SKU)</Label><Input id="codigo_sku" name="codigo_sku" type="text" defaultValue={currentItem?.codigo_sku || ''} /></div>
                        <div>
                            <Label htmlFor="proveedor_principal_empresa_id">Proveedor Principal</Label>
                            <Select id="proveedor_principal_empresa_id" name="proveedor_principal_empresa_id" defaultValue={currentItem?.proveedor_principal_empresa_id || ''} disabled={dataLoading}>
                                <option value="">{dataLoading ? 'Cargando...' : 'Ninguno'}</option>
                                {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label htmlFor="stock_actual">Stock Actual</Label><Input id="stock_actual" name="stock_actual" type="number" min="0" defaultValue={currentItem?.stock_actual ?? 0} required/></div>
                            <div><Label htmlFor="stock_minimo">Stock Mínimo</Label><Input id="stock_minimo" name="stock_minimo" type="number" min="0" defaultValue={currentItem?.stock_minimo || ''} /></div>
                            <div><Label htmlFor="stock_maximo">Stock Máximo</Label><Input id="stock_maximo" name="stock_maximo" type="number" min="0" defaultValue={currentItem?.stock_maximo || ''} /></div>
                        </div>
                        <div><Label htmlFor="ubicacion_almacen">Ubicación en Almacén</Label><Input id="ubicacion_almacen" name="ubicacion_almacen" type="text" defaultValue={currentItem?.ubicacion_almacen || ''} /></div>
                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" onClick={handleCloseModal} variant="outline">Cancelar</Button>
                            <Button type="submit" variant="default" className="w-auto" isLoading={mutation.isPending}>
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
                            ¿Está seguro de que desea eliminar <strong>{deleteConfirmation.item?.nombre_repuesto}</strong>? Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDeleteConfirmation}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} isLoading={mutation.isPending}>Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Page>
    </ProtectedRoute>
  );
};

export default StockPage;