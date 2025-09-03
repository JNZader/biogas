import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';

type EnergiaRecord = Database['public']['Tables']['energia']['Row'];

const EnergyRegistryPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [history, setHistory] = useState<EnergiaRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('energia')
                .select('*')
                .order('fecha', { ascending: false })
                .limit(15);

            if (error) throw error;
            setHistory(data || []);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        const insertData = {
            planta_id: 1, // Hardcoded for demo
            fecha: data.date.toString(),
            generacion_electrica_total_kwh_dia: Number(data.total_gen) || null,
            despacho_spot_smec_kwh_dia: Number(data.spot_dispatch) || null,
            totalizador_smec_kwh: Number(data.smec_total) || null,
            totalizador_chp_mwh: Number(data.chp_total) || null,
            horas_funcionamiento_motor_chp_dia: Number(data.motor_hours) || null,
            tiempo_funcionamiento_antorcha_s_dia: Number(data.torch_time) || null,
            flujo_biogas_kg_dia: Number(data.biogas_flow) || null,
        };

        const { error } = await supabase.from('energia').insert(insertData);

        setIsLoading(false);
        if (error) {
            setMessage(`Error al guardar el registro: ${error.message}`);
        } else {
            setMessage('Registro diario guardado con éxito!');
            e.currentTarget.reset();
            fetchHistory();
        }
    };
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-1">Registro Diario de Energía</h2>
                <p className="text-sm text-text-secondary mb-4">Información generada y tomada de la red (SMEC).</p>
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <InputField label="Fecha" id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <InputField label="Generación Eléctrica Total" id="total_gen" name="total_gen" type="number" unit="kWh/d" />
                        <InputField label="Despacho SPOT (SMEC)" id="spot_dispatch" name="spot_dispatch" type="number" unit="kWh/d" />
                        <InputField label="Totalizador SMEC" id="smec_total" name="smec_total" type="number" unit="kWh" />
                        <InputField label="Totalizador CHP" id="chp_total" name="chp_total" type="number" unit="MWh" />
                        <InputField label="Horas Funcionamiento Motor" id="motor_hours" name="motor_hours" type="number" unit="hrs" />
                        <InputField label="Tiempo Funcionamiento Antorcha" id="torch_time" name="torch_time" type="number" unit="seg" />
                        <InputField label="Flujo de Biogás" id="biogas_flow" name="biogas_flow" type="number" unit="kg" />
                    </div>

                    {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

                    <div className="pt-4">
                        <Button type="submit" variant="primary" isLoading={isLoading}>Guardar Registro Diario</Button>
                    </div>
                </form>
            </Card>
            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Registros Recientes</h3>
                 {historyLoading ? (
                    <p className="text-center text-text-secondary">Cargando historial...</p>
                 ) : historyError ? (
                    <p className="text-center text-red-500">{historyError}</p>
                 ) : history.length === 0 ? (
                    <p className="text-center text-text-secondary py-4">No hay registros de energía todavía.</p>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-background">
                                 <tr>
                                     <th className={commonTableClasses.head}>Fecha</th>
                                     <th className={commonTableClasses.head}>Gen. Eléctrica (kWh)</th>
                                     <th className={`${commonTableClasses.head} hidden sm:table-cell`}>Biogás (kg)</th>
                                     <th className={`${commonTableClasses.head} hidden md:table-cell`}>Horas Motor</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-surface divide-y divide-border">
                                {history.map(item => (
                                    <tr key={item.id}>
                                        <td className={`${commonTableClasses.cell} text-text-secondary`}>
                                           {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-AR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                        </td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>
                                            {item.generacion_electrica_total_kwh_dia?.toLocaleString('es-AR') ?? 'N/A'}
                                        </td>
                                        <td className={`${commonTableClasses.cell} text-text-primary hidden sm:table-cell`}>
                                            {item.flujo_biogas_kg_dia?.toLocaleString('es-AR') ?? 'N/A'}
                                        </td>
                                        <td className={`${commonTableClasses.cell} text-text-primary hidden md:table-cell`}>
                                            {item.horas_funcionamiento_motor_chp_dia ?? 'N/A'}
                                        </td>
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

export default EnergyRegistryPage;