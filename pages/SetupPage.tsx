
import React, { useState, useEffect } from 'react';
import Page from '../components/Page';
// FIX: Use named import for Card from the new UI component path.
import { Card, CardContent } from '../components/ui/Card';
// FIX: Use named import for Button from the new UI component path.
import { Button } from '../components/ui/Button';
// FIX: Replace deprecated InputField with new UI components.
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
// FIX: Replace deprecated Modal with new Dialog component.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { TrashIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import ProtectedRoute from '../components/ProtectedRoute.tsx';

const SetupPage: React.FC = () => {
    const { equipos, loading: dataLoading, refreshData } = useSupabaseData();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State for plant details form
    const [plantDetails, setPlantDetails] = useState({
        nombre_planta: '',
        ubicacion: '',
        configuracion: { capacity: '', digester_type: '' } as { capacity: string; digester_type: string; } | any,
    });
    const [plantLoading, setPlantLoading] = useState(true);
    const [plantSaving, setPlantSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchPlantData = async () => {
            setPlantLoading(true);
            try {
                // Hardcoded plant ID 1 for this demo app
                const { data, error } = await supabase.from('plantas').select('*').eq('id', 1).single();
                if (error && error.code !== 'PGRST116') throw error; // Ignore "No rows found" error
                if (data) {
                    setPlantDetails({
                        nombre_planta: data.nombre_planta || '',
                        ubicacion: data.ubicacion || '',
                        configuracion: data.configuracion || { capacity: '', digester_type: '' },
                    });
                }
            } catch (error: any) {
                setMessage(`Error al cargar datos de la planta: ${error.message}`);
            } finally {
                setPlantLoading(false);
            }
        };
        fetchPlantData();
    }, []);
    
    const handlePlantDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        if (id === 'plant_name' || id === 'location') {
            setPlantDetails(prev => ({ ...prev, [id === 'plant_name' ? 'nombre_planta' : 'ubicacion']: value }));
        } else { // 'capacity' or 'digester_type'
            setPlantDetails(prev => ({
                ...prev,
                configuracion: { ...prev.configuracion, [id]: value }
            }));
        }
    };
    
    const handleSavePlantDetails = async () => {
        setPlantSaving(true);
        setMessage('');
        try {
            const { error } = await supabase
                .from('plantas')
                .update({
                    nombre_planta: plantDetails.nombre_planta,
                    ubicacion: plantDetails.ubicacion,
                    configuracion: plantDetails.configuracion
                })
                .eq('id', 1); // Hardcoded plant ID 1
            if (error) throw error;
            setMessage('Configuración de la planta guardada con éxito.');
        } catch (error: any) {
            setMessage(`Error al guardar: ${error.message}`);
        } finally {
            setPlantSaving(false);
        }
    };


    const handleAddEquipment = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        const newEquipment = {
            nombre_equipo: formData.get('name') as string,
            categoria: formData.get('type') as string,
            codigo_equipo: (formData.get('code') as string) || null,
            planta_id: 1, // Hardcoded plant ID
            especificaciones_tecnicas: {
                area: formData.get('area') as string,
                capacityValue: formData.get('capacityValue') as string,
                capacityUnit: formData.get('capacityUnit') as string,
            }
        };

        try {
            const { error } = await supabase.from('equipos').insert(newEquipment);
            if (error) throw error;
            await refreshData();
            setIsModalOpen(false);
            event.currentTarget.reset();
        } catch(error: any) {
            alert(`Error al añadir equipo: ${error.message}`);
        }
    };

    const handleRemoveEquipment = async (id: number) => {
        if(window.confirm('¿Está seguro de que desea eliminar este equipo?')) {
            try {
                const { error } = await supabase.from('equipos').delete().eq('id', id);
                if (error) throw error;
                await refreshData();
            } catch (error: any) {
                alert(`Error al eliminar equipo: ${error.message}`);
            }
        }
    };
    
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    return (
        <ProtectedRoute requiredPermission="setup">
            <Page className="space-y-6">
                <h1 className="text-2xl font-bold text-text-primary">Configuración Inicial de la Planta</h1>

                <Card>
                    <CardContent className="pt-6">
                        <h2 className="text-lg font-semibold text-text-primary mb-4">1. Detalles de la Planta</h2>
                        {plantLoading ? <p>Cargando detalles de la planta...</p> : (
                            <form className="space-y-4">
                                <div><Label htmlFor="plant_name">Nombre de la Planta</Label><Input id="plant_name" type="text" placeholder="Ej: Planta de Biogás 'El Progreso'" value={plantDetails.nombre_planta} onChange={handlePlantDetailsChange} className={commonInputClasses} /></div>
                                <div><Label htmlFor="location">Ubicación</Label><Input id="location" type="text" placeholder="Ej: Ruta 5, km 123, Provincia" value={plantDetails.ubicacion || ''} onChange={handlePlantDetailsChange} className={commonInputClasses}/></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="capacity">Capacidad Digestor (m³)</Label>
                                        <Input id="capacity" type="number" min="0" placeholder="5000" value={plantDetails.configuracion?.capacity || ''} onChange={handlePlantDetailsChange} className={commonInputClasses} />
                                    </div>
                                    <div>
                                        <Label htmlFor="digester_type">Tipo de Digestor</Label>
                                        <Select id="digester_type" value={plantDetails.configuracion?.digester_type || ''} onChange={handlePlantDetailsChange} className={commonInputClasses}>
                                            {['', 'CSTR (Mezcla Completa)', 'Flujo Pistón', 'UASB', 'Otro'].map(opt => <option key={opt} value={opt}>{opt || 'Seleccione...'}</option>)}
                                        </Select>
                                    </div>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-text-primary">2. Equipos de la Planta</h2>
                            <Button variant="secondary" onClick={() => setIsModalOpen(true)} className="w-auto px-4 py-2 text-sm">Añadir Equipo</Button>
                        </div>
                        <p className="text-sm text-text-secondary mb-4">Añada los equipos principales de su planta, como biodigestores, bombas, sopladores y generadores.</p>
                        
                        <div className="space-y-3">
                            {dataLoading ? <p>Cargando equipos...</p> : equipos.length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                                    <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay equipos</h3>
                                    <p className="mt-1 text-sm text-gray-500">Comience a añadir equipos a su planta.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {equipos.map(eq => (
                                        <li key={eq.id} className="py-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{eq.nombre_equipo} <span className="text-xs text-text-secondary">({eq.codigo_equipo || 'N/A'})</span></p>
                                                <p className="text-sm text-text-secondary">{eq.categoria} - {(eq.especificaciones_tecnicas as any)?.area}</p>
                                                {(eq.especificaciones_tecnicas as any)?.capacityValue && (
                                                    <p className="text-sm text-accent font-semibold">{(eq.especificaciones_tecnicas as any)?.capacityValue} {(eq.especificaciones_tecnicas as any)?.capacityUnit}</p>
                                                )}
                                            </div>
                                            <button onClick={() => handleRemoveEquipment(eq.id)} className="p-2 rounded-full hover:bg-red-50">
                                                <TrashIcon className="h-5 w-5 text-red-500" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                {message && <div className={`p-3 rounded-md text-sm my-4 ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

                {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
                <Button variant="default" isLoading={plantSaving} onClick={handleSavePlantDetails}>Guardar Configuración</Button>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Añadir Nuevo Equipo</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddEquipment} className="space-y-4 px-6 pb-6">
                            <div><Label htmlFor="name">Nombre del Equipo</Label><Input id="name" name="name" type="text" placeholder="Ej: Biodigestor Principal" required className={commonInputClasses}/></div>
                            <div>
                                <Label htmlFor="type">Tipo de Equipo</Label>
                                <Select id="type" name="type" required className={commonInputClasses}>
                                    {['Biodigestor', 'Bomba', 'Agitador', 'Generador (CHP)', 'Soplador', 'Analizador de Gas', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="area">Área de la Planta</Label>
                                <Select id="area" name="area" required className={commonInputClasses}>
                                    {['Recepción', 'Pre-tratamiento', 'Digestión', 'Post-tratamiento', 'Generación de Energía'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </Select>
                            </div>
                            <div><Label htmlFor="code">Código / Tag (Opcional)</Label><Input id="code" name="code" type="text" placeholder="Ej: M-001" className={commonInputClasses} /></div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                                <div><Label htmlFor="capacityValue">Valor de Capacidad</Label><Input id="capacityValue" name="capacityValue" type="number" min="0" placeholder="5000" className={commonInputClasses}/></div>
                                <div><Label htmlFor="capacityUnit">Unidad</Label><Input id="capacityUnit" name="capacityUnit" type="text" placeholder="m³, kW, kg/h" className={commonInputClasses}/></div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="w-auto bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</Button>
                                {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
                                <Button type="submit" variant="default" className="w-auto">Guardar Equipo</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </Page>
        </ProtectedRoute>
    );
};

export default SetupPage;
