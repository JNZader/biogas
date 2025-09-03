
import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { PlusCircleIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import EmptyState from '../components/EmptyState';

type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
interface EnrichedChecklistItem extends ChecklistItem {
    checked: boolean;
    registro_id?: number;
}

type MantenimientoEvento = Database['public']['Tables']['mantenimiento_eventos']['Row'];
interface EnrichedMantenimientoEvento extends MantenimientoEvento {
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

const Checklist: React.FC = () => {
    const [items, setItems] = useState<EnrichedChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                supabase.from('checklist_registros').select('id, checklist_item_id').gte('fecha_verificacion', today.toISOString()).lt('fecha_verificacion', tomorrow.toISOString())
            ]);

            if (itemsRes.error) throw new Error(`Error fetching items: ${itemsRes.error.message}`);
            if (recordsRes.error) throw new Error(`Error fetching records: ${recordsRes.error.message}`);

            const checkedItemIds = new Map(recordsRes.data.map(r => [r.checklist_item_id, r.id]));

            const enrichedItems = itemsRes.data.map(item => ({
                ...item,
                checked: checkedItemIds.has(item.id),
                registro_id: checkedItemIds.get(item.id)
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
    
    const handleVerify = async (itemId: number) => {
        // Optimistically update the UI
        setItems(prevItems => prevItems.map(item => 
            item.id === itemId ? { ...item, checked: true } : item
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
                    item.id === itemId ? { ...item, checked: false } : item
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
        return <Card><p className="text-center text-text-secondary">Cargando checklist...</p></Card>
    }
    
    if (error) {
        return <Card><p className="text-center text-error">{error}</p></Card>
    }

    return (
        <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Checklist Diario de Equipos</h2>
            {items.length === 0 ? (
                <EmptyState
                    icon={<ClipboardDocumentCheckIcon className="mx-auto h-12 w-12" />}
                    title="No hay ítems de checklist"
                    message="El checklist no ha sido configurado en el sistema todavía."
                />
            ) : (
                <ul className="space-y-3">
                    {items.map(item => (
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
            )}
        </Card>
    );
};

const Tasks: React.FC = () => {
    const { equipos, tiposMantenimiento, loading: dataLoading, error: dataError } = useSupabaseData();
    const [tasks, setTasks] = useState<EnrichedMantenimientoEvento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formMessage, setFormMessage] = useState('');

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

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleToggleComplete = async (task: EnrichedMantenimientoEvento, isCompleted: boolean) => {
        const originalTasks = [...tasks];
        // Optimistically remove from list if marking as complete
        if (isCompleted) {
             setTasks(tasks.filter(t => t.id !== task.id));
        }
        
        try {
            const { error } = await supabase
                .from('mantenimiento_eventos')
                .update({ fecha_fin: isCompleted ? new Date().toISOString() : null })
                .eq('id', task.id);
            
            if (error) {
                // Revert on error
                setTasks(originalTasks);
                alert(`Error al actualizar la tarea: ${error.message}`);
            }
        } catch (err: any) {
            setTasks(originalTasks);
            alert(`Error: ${err.message}`);
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
            usuario_responsable_id: 1 // Hardcoded for demo
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
    
    const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";


    if (loading || dataLoading) {
        return <Card><p className="text-center text-text-secondary">Cargando tareas...</p></Card>;
    }

    if (error || dataError) {
        return <Card><p className="text-center text-error">{error || dataError}</p></Card>;
    }

    return (
        <>
            <Card>
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
            </Card>

            <Modal title="Crear Nueva Tarea de Mantenimiento" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="equipo_id" className="block text-sm font-medium text-text-secondary">Equipo</label>
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
                        <label htmlFor="tipo_mantenimiento_id" className="block text-sm font-medium text-text-secondary">Tipo de Mantenimiento</label>
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

                    <InputField label="Descripción del Problema/Tarea" id="descripcion_problema" name="descripcion_problema" type="textarea" required />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Fecha de Inicio" id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={new Date().toISOString().split('T')[0]} required/>
                        <InputField label="Fecha Planificada (Opcional)" id="fecha_planificada" name="fecha_planificada" type="date" />
                    </div>

                    {formMessage && <div className={`p-3 rounded-md text-sm ${formMessage.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{formMessage}</div>}

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" onClick={handleCloseModal} className="w-auto bg-border text-text-primary hover:bg-border/80">Cancelar</Button>
                        <Button type="submit" variant="primary" className="w-auto" isLoading={formLoading}>
                            Guardar Tarea
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

const MaintenancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'tasks'>('checklist');

  return (
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
  );
};

export default MaintenancePage;