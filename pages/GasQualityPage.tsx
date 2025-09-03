import React from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import type { Database } from '../types/database';

type LecturaGas = Database['public']['Tables']['lecturas_gas']['Row'];
interface GasReadingHistoryItem extends LecturaGas {
    equipos?: { nombre_equipo: string } | null;
}

const GasQualityPage: React.FC = () => {
    const queryClient = useQueryClient();
    const addNotification = useNotificationStore(s => s.addNotification);
    
    const { data: equipos = [], isLoading: isEquiposLoading, error: equiposError } = useQuery({ queryKey: ['equipos'], queryFn: api.fetchEquipos });
    const { data: history = [], isLoading: isHistoryLoading, error: historyError } = useQuery({ 
        queryKey: ['gasQualityHistory'], 
        queryFn: api.fetchGasQualityHistory 
    });

    const mutation = useMutation({
        mutationFn: api.createGasReading,
        onSuccess: () => {
            addNotification('Medición guardada con éxito!', 'success');
            queryClient.invalidateQueries({ queryKey: ['gasQualityHistory'] });
        },
        onError: (err: Error) => {
            addNotification(`Error al guardar: ${err.message}`, 'error');
        }
    });
    
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        mutation.mutate(data);
        if(!mutation.isError){
            e.currentTarget.reset();
        }
    };

    if (equiposError) {
        return (
            <Page>
                <Card>
                    <h2 className="text-lg font-semibold text-error mb-2">Error de Carga</h2>
                    <p className="text-text-secondary">No se pudo cargar la lista de equipos.</p>
                    <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{equiposError.message}</pre>
                </Card>
            </Page>
        );
    }
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-1">Registrar Calidad de Gas</h2>
                <p className="text-sm text-text-secondary mb-4">Cargar los valores del analizador de gas de la planta.</p>
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="date" className="block text-sm font-medium text-text-secondary">Fecha</label>
                           <input type="date" id="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className={commonInputClasses} />
                        </div>
                        <div>
                            <label htmlFor="time" className="block text-sm font-medium text-text-secondary">Hora</label>
                            <input type="time" id="time" name="time" required defaultValue={new Date().toTimeString().slice(0,5)} className={commonInputClasses} />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="equipo_id" className="block text-sm font-medium text-text-secondary">Equipo Analizador</label>
                        <select 
                            id="equipo_id" 
                            name="equipo_id" 
                            required
                            className={commonInputClasses}
                            disabled={isEquiposLoading}
                        >
                            <option value="">{isEquiposLoading ? 'Cargando equipos...' : 'Seleccione un equipo'}</option>
                            {equipos.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre_equipo}</option>
                            ))}
                        </select>
                    </div>

                    <fieldset className="border-t border-border pt-4">
                        <legend className="text-base font-semibold text-text-primary mb-2">Composición del Gas</legend>
                        <div className="grid grid-cols-2 gap-4">
                           <InputField label="CO₂" id="co2" name="co2" type="number" unit="%" required />
                           <InputField label="CH₄" id="ch4" name="ch4" type="number" unit="%" required />
                           <InputField label="O₂" id="o2" name="o2" type="number" unit="%" required />
                           <InputField label="H₂S" id="h2s" name="h2s" type="number" unit="ppm" required />
                        </div>
                    </fieldset>
                    
                    <fieldset className="border-t border-border pt-4">
                        <legend className="text-base font-semibold text-text-primary mb-2">Mediciones Adicionales</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Caudal Másico SCADA" id="flow_scada" name="flow_scada" type="number" unit="kg/h" />
                            <InputField label="Caudal CHP" id="flow_chp" name="flow_chp" type="number" unit="l/s" />
                            <InputField label="Potencia Exacta" id="power" name="power" type="number" unit="kW" />
                        </div>
                    </fieldset>
                    
                    <div className="pt-4">
                        <Button type="submit" variant="primary" isLoading={mutation.isPending}>Guardar Medición</Button>
                    </div>
                </form>
            </Card>

            <Card>
                 <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de Mediciones Recientes</h2>
                 {isHistoryLoading ? (
                    <p className="text-center text-text-secondary">Cargando historial...</p>
                 ) : historyError ? (
                    <p className="text-center text-error">{historyError.message}</p>
                 ) : history.length === 0 ? (
                    <p className="text-center text-text-secondary py-4">No hay mediciones registradas todavía.</p>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-background">
                                 <tr>
                                     <th className={commonTableClasses.head}>Fecha y Hora</th>
                                     <th className={commonTableClasses.head}>Equipo</th>
                                     <th className={commonTableClasses.head}>CH₄ (%)</th>
                                     <th className={commonTableClasses.head}>CO₂ (%)</th>
                                     <th className={commonTableClasses.head}>H₂S (ppm)</th>
                                     <th className={commonTableClasses.head}>Potencia (kW)</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-surface divide-y divide-border">
                                {history.map(item => (
                                    <tr key={item.id}>
                                        <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{(item as GasReadingHistoryItem).equipos?.nombre_equipo}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.ch4_porcentaje}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.co2_porcentaje}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.h2s_ppm}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.potencia_exacta_kw ?? 'N/A'}</td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                 )}
            </Card>
        </Page>
    );
};

export default GasQualityPage;