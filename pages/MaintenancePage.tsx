import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Page from '../components/Page';
// FIX: Use named import for Card from the new UI component path.
import { Card, CardContent } from '../components/ui/Card';
// FIX: Use named import for Button from the new UI component path.
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
// FIX: Replace deprecated Modal with new Dialog component.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
// FIX: Replace deprecated InputField with new UI components.
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { PlusCircleIcon, ClipboardDocumentCheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import EmptyState from '../components/EmptyState';
import QuickAddModal, { FormField as QuickFormField } from '../components/QuickAddModal.tsx';
import { useToast } from '../hooks/use-toast.ts';
import ProtectedRoute from '../components/ProtectedRoute.tsx';
import { exportToCsv } from '../lib/utils';


type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
interface EnrichedChecklistItem extends ChecklistItem {
    checked: boolean;
    registro_id?: number;
}

type MantenimientoEvento = Database['public']['Tables']['mantenimiento_eventos']['Row'];
interface EnrichedMantenimientoEvento extends MantenimientoEvento {
    equipos?: { nombre_equipo: string } | null;
    tipos_mantenimiento?: { nombre_tipo: string } | null;
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

const Checklist: React.FC = () => {
    const [items, setItems] = useState<EnrichedChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { subsistemas } = useSupabaseData();

    const fetchChecklistData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Fetch all checklist items and today's records in parallel
            const [itemsRes, recordsRes] = await Promise.all([
                supabase.from('checklist_items').select('*').order('numero_item'),
                supabase.from('checklist_registros').select('id, checklist_item_id').gte('fecha_verificacion', today.toISOString()).lt('fecha_verificacion', tomorrow.toISOString()),
            ]);

            if (itemsRes.error) throw new Error(`Error fetching items: ${itemsRes.error.message}`);
            if (recordsRes.error) throw new Error(`Error fetching records: ${recordsRes.error.message}`);

            const checkedItemIds = new Map(recordsRes.data.map(r => [r.checklist_item_id, r.id]));

            const enrichedItems = itemsRes.data.map(item => ({
                ...item,
                checked: checkedItemIds.has(item.id),
                registro_id: checkedItemIds.get(item.id),
            }));
            
            setItems(enrichedItems);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChecklistData();
    }, [fetchChecklistData]);
    
    const groupedItems = useMemo(() => {
        if (!items.length) return {};
        return items.reduce((acc, item) => {
            const key = item.subsistema_id || 0; // Group items with no subsystem under '0'
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {} as Record<number, EnrichedChecklistItem[]>);
    }, [items]);

    const subsistemaOrder = useMemo(() => {
        if (!subsistemas.length || Object.keys(groupedItems).length === 0) return Object.keys(groupedItems).map(Number);
        // Create a sorted list of subsystem IDs present in the checklist
        const orderedIds = subsistemas
            .filter(s => groupedItems[s.id])
            .sort((a, b) => (a.orden_visualizacion || 99) - (b.orden_visualizacion || 99))
            .map(s => s.id);
        
        // Add any items without a subsystem at the end
        if (groupedItems[0]) {
            orderedIds.push(0);
        }
        return orderedIds;
    }, [groupedItems, subsistemas]);

    const handleVerify = async (itemId: number) => {
        // Optimistically update the UI
        setItems(prevItems => prevItems.map(item => 
            item.id === itemId ? { ...item, checked: true } : item,
        ));
        
        try {
            const { error } = await supabase.from('checklist_registros').insert({
                checklist_item_id: itemId,
                usuario_operador_id: 1, // Hardcoded user for demo
                fecha_verificacion: new Date().toISOString(),
                estado_verificacion: 'OK',
            });

            if (error) {
                // Revert UI on error
                setItems(prevItems => prevItems.map(item => 
                    item.id === itemId ? { ...item, checked: false } : item,
                ));
                alert(`Error al guardar la verificación: ${error.message}`);
            } else {
                // Optionally refresh all data to get the new record ID, or just live with the optimistic state
                fetchChecklistData();
            }
        } catch(err: any) {
             alert(`Error: ${err.message}`);
        }
    };

    if (loading) {
        return <Card><CardContent className="pt-6"><p className="text-center text-text-secondary">Cargando checklist...</p></CardContent></Card>
    }
    
    if (error) {
        return <Card><CardContent className="pt-6"><p className="text-center text-error">{error}</p></CardContent></Card>
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Checklist Diario de Equipos</h2>
                {items.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardDocumentCheckIcon className="mx-auto h-12 w-12" />}
                        title="No hay ítems de checklist"
                        message="El checklist no ha sido configurado en el sistema todavía."
                    />
                ) : (
                     <div className="space-y-6">
                        {subsistemaOrder.map(subsistemaId => {
                            const subsistema = subsistemas.find(s => s.id === subsistemaId);
                            const checklistItems = groupedItems[subsistemaId];
                            if (!checklistItems || checklistItems.length === 0) return null;
                            
                            return (
                                <div key={subsistemaId}>
                                    <h3 className="text-md font-semibold text-primary border-b-2 border-primary/20 pb-1 mb-3">
                                        {subsistema ? subsistema.nombre_subsistema : 'General'}
                                    </h3>
                                    <ul className="space-y-3">
                                        {checklistItems.map(item => (
                                            <li key={item.id} className="flex items-center justify-between p-3 bg-background rounded-md">
                                                <span className={`flex-grow ${item.checked ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                                                    {item.numero_item} - {item.descripcion_item}
                                                </span>
                                                <button 
                                                    className={`ml-4 px-3 py-1 text-sm rounded-full transition-colors duration-200 ${item.checked ? 'bg-success-bg text-success' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                                                    onClick={() => handleVerify(item.id)}
                                                    disabled={item.checked}
                                                >
                                                    {item.checked ? 'Verificado' : 'Verificar'}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const Tasks: React.FC = () => {
    const { equipos, tiposMantenimiento, loading: dataLoading, error: dataError, refreshData } = useSupabaseData();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<EnrichedMantenimientoEvento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<EnrichedMantenimientoEvento[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formMessage, setFormMessage] = useState('');

    const [quickAddState, setQuickAddState] = useState<{
        isOpen: boolean;
        entity: string;
        tableName: 'equipos' | 'tipos_mantenimiento';
        fields: QuickFormField[];
    } | null>(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('mantenimiento_eventos')
                .select(`
                    *,
                    equipos ( nombre_equipo )
                `)
                .is('fecha_fin', null) // Fetch only incomplete tasks
                .order('fecha_planificada', { ascending: true })
                .limit(20);

            if (error) throw error;
            setTasks(data || []);
        } catch (err: any) {
            setError(`Error al cargar las tareas: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('mantenimiento_eventos')
                .select(`
                    *,
                    equipos ( nombre_equipo ),
                    tipos_mantenimiento ( nombre_tipo )
                `)
                .not('fecha_fin', 'is', null) // Fetch only COMPLETED tasks
                .order('fecha_fin', { ascending: false }) // Order by completion date
                .limit(10);

            if (error) throw error;
            setHistory(data as any[] || []);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchHistory();
    }, [fetchTasks, fetchHistory]);

    const handleToggleComplete = async (task: EnrichedMantenimientoEvento, isCompleted: boolean) => {
        try {
            const { error } = await supabase
                .from('mantenimiento_eventos')
                .update({ fecha_fin: isCompleted ? new Date().toISOString() : null })
                .eq('id', task.id);
            
            if (error) throw error;

            await Promise.all([fetchTasks(), fetchHistory()]);

        } catch (err: any) {
            alert(`Error al actualizar la tarea: ${err.message}`);
        }
    };

    const handleOpenModal = () => {
        setFormMessage('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        setFormMessage('');

        const formData = new FormData(e.currentTarget);
        const data = {
            equipo_id: Number(formData.get('equipo_id')),
            tipo_mantenimiento_id: Number(formData.get('tipo_mantenimiento_id')),
            descripcion_problema: formData.get('descripcion_problema') as string,
            fecha_inicio: formData.get('fecha_inicio') as string,
            fecha_planificada: (formData.get('fecha_planificada') as string) || null,
            usuario_responsable_id: 1, // Hardcoded for demo
// FIX: Added the required `planta_id` field to the insert data object.
            planta_id: 1, // Hardcoded for demo
        };

        try {
            const { error } = await supabase.from('mantenimiento_eventos').insert(data);
            if (error) throw error;
            
            setFormMessage('Tarea creada con éxito!');
            await fetchTasks();
            setTimeout(() => { // Close modal after a short delay to show success message
                handleCloseModal();
            }, 1000);

        } catch(err: any) {
            setFormMessage(`Error: ${err.message}`);
        } finally {
            setFormLoading(false);
        }
    };
    
    // FIX: Removed `as const` and used an explicit type to avoid readonly issues with the `fields` array when setting state, while still preserving literal types.
    const quickAddConfig: {
        equipo: { entity: string; tableName: 'equipos'; fields: QuickFormField[] };
        tipoMantenimiento: { entity: string; tableName: 'tipos_mantenimiento'; fields: QuickFormField[] };
    } = {
        equipo: {
            entity: 'Equipo', tableName: 'equipos',
            fields: [{ name: 'nombre_equipo', label: 'Nombre del Equipo', type: 'text', required: true }, { name: 'categoria', label: 'Categoría', type: 'text' }],
        },
        tipoMantenimiento: {
            entity: 'Tipo de Mantenimiento', tableName: 'tipos_mantenimiento',
            fields: [{ name: 'nombre_tipo', label: 'Nombre del Tipo', type: 'text', required: true }, { name: 'descripcion', label: 'Descripción', type: 'textarea' }],
        },
    };

    const handleOpenQuickAdd = (type: keyof typeof quickAddConfig) => {
        const config = quickAddConfig[type];
        setQuickAddState({ isOpen: true, ...config });
    };

    const handleHistoryExport = () => {
        const dataToExport = history.map(item => ({
            fecha_fin: item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString('es-AR') : 'N/A',
            equipo: item.equipos?.nombre_equipo,
            tipo_mantenimiento: item.tipos_mantenimiento?.nombre_tipo,
            descripcion_problema: item.descripcion_problema,
            trabajo_realizado: item.descripcion_trabajo_realizado,
        }));
        exportToCsv('historial_mantenimiento.csv', dataToExport);
    };

    const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };


    if (loading || dataLoading) {
        return <Card><CardContent className="pt-6"><p className="text-center text-text-secondary">Cargando tareas...</p></CardContent></Card>;
    }

    if (error || dataError) {
        return <Card><CardContent className="pt-6"><p className="text-center text-error">{error || dataError}</p></CardContent></Card>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Tareas de Mantenimiento Pendientes</h2>
                         <Button onClick={handleOpenModal} variant="secondary" className="w-auto px-4 py-2 text-sm flex items-center gap-2">
                            <PlusCircleIcon className="h-5 w-5" />
                            Crear Tarea
                        </Button>
                    </div>
                    {tasks.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardDocumentCheckIcon className="mx-auto h-12 w-12" />}
                            title="Todo en orden"
                            message="No hay tareas de mantenimiento pendientes en este momento."
                            action={<Button onClick={handleOpenModal} variant="secondary" className="w-auto mt-4 px-4 py-2 text-sm">Crear una Tarea</Button>}
                        />
                    ) : (
                        <div className="space-y-4">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-start p-3 bg-background rounded-md">
                                    <input
                                        id={`task-${task.id}`}
                                        type="checkbox"
                                        checked={!!task.fecha_fin}
                                        onChange={() => handleToggleComplete(task, true)}
                                        className="h-5 w-5 rounded border-border text-primary focus:ring-primary mt-1 cursor-pointer"
                                    />
                                    <div className="ml-3 text-sm flex-grow">
                                        <label htmlFor={`task-${task.id}`} className="font-medium text-text-primary cursor-pointer">
                                            {task.descripcion_problema || 'Tarea de mantenimiento programada'}
                                        </label>
                                        <p className="text-text-secondary">
                                            <strong>Equipo:</strong> {task.equipos?.nombre_equipo || 'No especificado'}
                                        </p>
                                        {task.fecha_planificada && (
                                            <p className="text-xs text-accent">
                                                Planificada para: {new Date(task.fecha_planificada + 'T00:00:00').toLocaleDateString('es-AR')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                   <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Historial de Tareas Completadas</h2>
                        <Button variant="outline" size="sm" onClick={handleHistoryExport} disabled={history.length === 0}>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                   </div>
                   {historyLoading ? (
                      <p className="text-center text-text-secondary">Cargando historial...</p>
                   ) : historyError ? (
                      <p className="text-center text-error">{historyError}</p>
                   ) : history.length === 0 ? (
                      <p className="text-center text-text-secondary py-4">No hay tareas completadas recientemente.</p>
                   ) : (
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <th className={commonTableClasses.head}>Fecha Fin</th>
                                       <th className={commonTableClasses.head}>Equipo</th>
                                       <th className={`${commonTableClasses.head} hidden sm:table-cell`}>Tipo</th>
                                       <th className={`${commonTableClasses.head} hidden md:table-cell`}>Tarea</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                  {history.map(item => (
                                      <tr key={item.id}>
                                          <td className={`${commonTableClasses.cell} text-text-secondary`}>
                                            {item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString('es-AR') : 'N/A'}
                                          </td>
                                          <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.equipos?.nombre_equipo}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary hidden sm:table-cell`}>{item.tipos_mantenimiento?.nombre_tipo}</td>
                                          <td className={`${commonTableClasses.cell} text-text-primary hidden md:table-cell`}>
                                            <span className="truncate">{item.descripcion_problema}</span>
                                          </td>
                                      </tr>
                                  ))}
                               </tbody>
                          </table>
                      </div>
                   )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nueva Tarea de Mantenimiento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="equipo_id">Equipo</Label>
                                <button type="button" onClick={() => handleOpenQuickAdd('equipo')} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                            </div>
                            <select
                                id="equipo_id"
                                name="equipo_id"
                                required
                                className={commonSelectClasses}
                            >
                                <option value="">Seleccione un equipo</option>
                                {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="tipo_mantenimiento_id">Tipo de Mantenimiento</Label>
                                <button type="button" onClick={() => handleOpenQuickAdd('tipoMantenimiento')} className="text-primary hover:opacity-80 transition-opacity"><PlusCircleIcon className="h-5 w-5"/></button>
                            </div>
                            <select
                                id="tipo_mantenimiento_id"
                                name="tipo_mantenimiento_id"
                                required
                                className={commonSelectClasses}
                            >
                                <option value="">Seleccione un tipo</option>
                                {tiposMantenimiento.map(t => <option key={t.id} value={t.id}>{t.nombre_tipo}</option>)}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="descripcion_problema">Descripción del Problema/Tarea</Label>
                            <Textarea id="descripcion_problema" name="descripcion_problema" required className={commonInputClasses} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                                <Input id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className={commonInputClasses}/>
                            </div>
                            <div>
                                <Label htmlFor="fecha_planificada">Fecha Planificada (Opcional)</Label>
                                <Input id="fecha_planificada" name="fecha_planificada" type="date" className={commonInputClasses}/>
                            </div>
                        </div>

                        {formMessage && <div className={`p-3 rounded-md text-sm ${formMessage.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{formMessage}</div>}

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" onClick={handleCloseModal} className="w-auto bg-border text-text-primary hover:bg-border/80">Cancelar</Button>
                            {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
                            <Button type="submit" variant="default" className="w-auto" isLoading={formLoading}>
                                Guardar Tarea
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {quickAddState && (
                <QuickAddModal
                    isOpen={quickAddState.isOpen}
                    onClose={() => setQuickAddState(null)}
                    entityName={quickAddState.entity}
                    tableName={quickAddState.tableName}
                    formFields={quickAddState.fields}
                    onSuccess={() => {
                        toast({ title: 'Éxito', description: `${quickAddState.entity} añadido con éxito.` });
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

const MaintenancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'tasks'>('checklist');

  return (
    <ProtectedRoute requiredPermission="mantenimiento">
        <Page>
        <div className="mb-4 border-b border-border">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')}>
                Checklist de Equipos
            </TabButton>
            <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>
                Tareas Asignadas
            </TabButton>
            </nav>
        </div>
        <div>
            {activeTab === 'checklist' ? <Checklist /> : <Tasks />}
        </div>
        </Page>
    </ProtectedRoute>
  );
};

export default MaintenancePage;