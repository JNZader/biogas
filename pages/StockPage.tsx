
import React, { useState, useEffect, useCallback } from 'react';
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
import { PencilIcon, TrashIcon, PlusCircleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import EmptyState from '../components/EmptyState';
import ProtectedRoute from '../components/ProtectedRoute.tsx';

type Repuesto = Database['public']['Tables']['repuestos']['Row'];

const StockPage: React.FC = () => {
    const [stockItems, setStockItems] = useState<Repuesto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { proveedores, loading: dataLoading } = useSupabaseData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Repuesto | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [formLoading, setFormLoading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: Repuesto | null }>({ isOpen: false, item: null });
    const [deleteLoading, setDeleteLoading] = useState(false);

    const refreshData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('repuestos')
                .select('*')
                .order('nombre_repuesto');

            if (error) throw error;
            setStockItems(data || []);
        } catch (err: any) {
            console.error("Error fetching stock:", err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleOpenModal = (mode: 'add' | 'edit', item: Repuesto | null = null) => {
        setModalMode(mode);
        setCurrentItem(item);
        setFormMessage('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        setFormMessage('');

        const formData = new FormData(e.currentTarget);
        
        const dataToSubmit = {
            nombre_repuesto: formData.get('nombre_repuesto') as string,
            codigo_sku: (formData.get('codigo_sku') as string) || null,
            proveedor_principal_empresa_id: formData.get('proveedor_principal_empresa_id') ? Number(formData.get('proveedor_principal_empresa_id')) : null,
            stock_actual: Number(formData.get('stock_actual')),
            stock_minimo: formData.get('stock_minimo') ? Number(formData.get('stock_minimo')) : null,
            stock_maximo: formData.get('stock_maximo') ? Number(formData.get('stock_maximo')) : null,
            ubicacion_almacen: (formData.get('ubicacion_almacen') as string) || null,
            planta_id: 1, // Hardcoded for demo
        };

        try {
            let error;
            if (modalMode === 'add') {
                ({ error } = await supabase.from('repuestos').insert(dataToSubmit));
            } else {
                ({ error } = await supabase.from('repuestos').update(dataToSubmit).eq('id', currentItem!.id));
            }
            if (error) throw error;
            
            await refreshData();
            handleCloseModal();
        } catch (err: any) {
            setFormMessage(`Error: ${err.message}`);
        } finally {
            setFormLoading(false);
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
        
        setDeleteLoading(true);
        try {
            const { error } = await supabase.from('repuestos').delete().eq('id', deleteConfirmation.item.id);
            if (error) throw error;
            await refreshData();
            closeDeleteConfirmation();
        } catch (err: any) {
            // A simple alert is fine here, or a toast notification if available
            alert(`Error al eliminar: ${err.message}`);
        } finally {
            setDeleteLoading(false);
        }
    };


    const getStatus = (item: Repuesto) => {
        if (item.stock_minimo !== null && item.stock_actual <= item.stock_minimo) {
            return 'low';
        }
        return 'ok';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'low': return 'bg-error-bg text-error';
            case 'ok': return 'bg-success-bg text-success';
            default: return 'bg-background text-text-secondary';
        }
    };

    if (loading) {
        return <Page><Card><CardContent className="pt-6"><p className="text-center text-text-secondary">Cargando inventario...</p></CardContent></Card></Page>
    }

    if (error) {
        return (
            <Page>
                <Card>
                    <CardContent className="pt-6">
                        <h2 className="text-lg font-semibold text-error mb-2">Error al Cargar el Inventario</h2>
                        <p className="text-text-secondary">No se pudieron obtener los datos de stock.</p>
                        <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{error}</pre>
                    </CardContent>
                </Card>
            </Page>
        );
    }

  return (
    <ProtectedRoute requiredPermission="stock">
        <Page>
        <Card>
            <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-text-primary">Inventario de Repuestos</h2>
                    <Button onClick={() => handleOpenModal('add')} variant="secondary" className="w-auto px-4 py-2 text-sm flex items-center gap-2">
                        <PlusCircleIcon className="h-5 w-5"/>
                        Añadir Nuevo Ítem
                    </Button>
                </div>
                
                {stockItems.length === 0 ? (
                    <EmptyState
                        icon={<ArchiveBoxIcon className="mx-auto h-12 w-12" />}
                        title="Inventario vacío"
                        message="Aún no se han añadido repuestos al stock. Empiece por añadir el primer ítem."
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary hidden sm:table-cell">
                                                {proveedor?.nombre || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-text-primary">{item.stock_actual} / {item.stock_maximo || 'N/A'}</div>
                                                <div className="text-sm text-text-secondary">Mín: {item.stock_minimo}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(status)}`}>
                                                    {status === 'low' ? 'Bajo Stock' : 'OK'}
                                                </span>
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
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label htmlFor="stock_actual">Stock Actual</Label><Input id="stock_actual" name="stock_actual" type="number" min="0" defaultValue={currentItem?.stock_actual ?? 0} required/></div>
                            <div><Label htmlFor="stock_minimo">Stock Mínimo</Label><Input id="stock_minimo" name="stock_minimo" type="number" min="0" defaultValue={currentItem?.stock_minimo || ''} /></div>
                            <div><Label htmlFor="stock_maximo">Stock Máximo</Label><Input id="stock_maximo" name="stock_maximo" type="number" min="0" defaultValue={currentItem?.stock_maximo || ''} /></div>
                        </div>
                        <div><Label htmlFor="ubicacion_almacen">Ubicación en Almacén</Label><Input id="ubicacion_almacen" name="ubicacion_almacen" type="text" defaultValue={currentItem?.ubicacion_almacen || ''} /></div>
                        
                        {formMessage && <div className={`p-3 rounded-md text-sm ${formMessage.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{formMessage}</div>}

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" onClick={handleCloseModal} variant="outline">Cancelar</Button>
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
                            ¿Está seguro de que desea eliminar <strong>{deleteConfirmation.item?.nombre_repuesto}</strong>? Esta acción no se puede deshacer.
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

export default StockPage;
