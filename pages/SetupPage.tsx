
import React, { useState, useEffect } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Modal from '../components/Modal';
import { TrashIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';

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
    
    return (
        <Page className="space-y-6">
            <h1 className="text-2xl font-bold text-text-primary">Configuración Inicial de la Planta</h1>

            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-4">1. Detalles de la Planta</h2>
                {plantLoading ? <p>Cargando detalles de la planta...</p> : (
                    <form className="space-y-4">
                        <InputField label="Nombre de la Planta" id="plant_name" type="text" placeholder="Ej: Planta de Biogás 'El Progreso'" value={plantDetails.nombre_planta} onChange={handlePlantDetailsChange} />
                        <InputField label="Ubicación" id="location" type="text" placeholder="Ej: Ruta 5, km 123, Provincia" value={plantDetails.ubicacion || ''} onChange={handlePlantDetailsChange}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField 
                                label="Capacidad Digestor (m³)" 
                                id="capacity" 
                                type="number" 
                                placeholder="5000" 
                                value={plantDetails.configuracion?.capacity || ''} 
                                onChange={handlePlantDetailsChange} 
                            />
                            <InputField 
                                label="Tipo de Digestor" 
                                id="digester_type" 
                                type="select" 
                                options={['', 'CSTR (Mezcla Completa)', 'Flujo Pistón', 'UASB', 'Otro']} 
                                value={plantDetails.configuracion?.digester_type || ''}
                                onChange={handlePlantDetailsChange}
                            />
                        </div>
                    </form>
                )}
            </Card>

            <Card>
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
            </Card>
            
            {message && <div className={`p-3 rounded-md text-sm my-4 ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

            <Button variant="primary" isLoading={plantSaving} onClick={handleSavePlantDetails}>Guardar Configuración</Button>

            <Modal title="Añadir Nuevo Equipo" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddEquipment} className="space-y-4">
                    <InputField label="Nombre del Equipo" id="name" name="name" type="text" placeholder="Ej: Biodigestor Principal" required/>
                    <InputField 
                        label="Tipo de Equipo" 
                        id="type" 
                        name="type"
                        type="select" 
                        options={['Biodigestor', 'Bomba', 'Agitador', 'Generador (CHP)', 'Soplador', 'Analizador de Gas', 'Otro']}
                        required
                    />
                     <InputField 
                        label="Área de la Planta" 
                        id="area"
                        name="area"
                        type="select" 
                        options={['Recepción', 'Pre-tratamiento', 'Digestión', 'Post-tratamiento', 'Generación de Energía']}
                        required
                    />
                    <InputField label="Código / Tag (Opcional)" id="code" name="code" type="text" placeholder="Ej: M-001" />

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <InputField label="Valor de Capacidad" id="capacityValue" name="capacityValue" type="number" placeholder="5000" />
                        <InputField label="Unidad" id="capacityUnit" name="capacityUnit" type="text" placeholder="m³, kW, kg/h" />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="w-auto bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</Button>
                        <Button type="submit" variant="primary" className="w-auto">Guardar Equipo</Button>
                    </div>
                </form>
            </Modal>
        </Page>
    );
};

export default SetupPage;