
import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';

type AnalisisLaboratorio = Database['public']['Tables']['analisis_laboratorio']['Row'];
type Remito = Database['public']['Tables']['ingresos_viaje_camion']['Row'];
type TipoMuestra = Database['public']['Tables']['tipos_muestra']['Row'];

const LaboratoryPage: React.FC = () => {
    const { proveedores, loading: dataLoading, error: dataError } = useSupabaseData();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [remitos, setRemitos] = useState<Remito[]>([]);
    const [tiposMuestra, setTiposMuestra] = useState<TipoMuestra[]>([]);
    const [history, setHistory] = useState<AnalisisLaboratorio[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [remitosRes, tiposMuestraRes] = await Promise.all([
                    supabase.from('ingresos_viaje_camion').select('*').order('fecha_hora_ingreso', { ascending: false }).limit(50),
                    supabase.from('tipos_muestra').select('*')
                ]);

                if (remitosRes.error) throw remitosRes.error;
                if (tiposMuestraRes.error) throw tiposMuestraRes.error;

                setRemitos(remitosRes.data || []);
                setTiposMuestra(tiposMuestraRes.data || []);
            } catch (error: any) {
                setMessage(`Error cargando datos de formulario: ${error.message}`);
            }
        };
        fetchDropdownData();
    }, []);
    
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('analisis_laboratorio')
                .select(`
                    *,
                    tipos_muestra ( nombre_tipo_muestra )
                `)
                .order('fecha_hora_registro', { ascending: false })
                .limit(15);

            if (error) throw error;
            setHistory(data as any);
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

        const fecha_hora_registro = new Date().toISOString();
        const fecha_hora_muestra = `${data.date}T${data.time}:00`;

        try {
            // Step 1: Insert the main analysis record
            const { data: analysisData, error: analysisError } = await supabase
                .from('analisis_laboratorio')
                .insert({
                    planta_id: 1, // Hardcoded for demo
                    usuario_analista_id: 1, // Hardcoded for demo
                    fecha_hora_registro,
                    fecha_hora_muestra,
                    numero_remito_asociado: data.remito.toString(),
                    tipo_muestra_id: Number(data.sampleType),
                    peso_muestra_g: data.sampleWeight ? Number(data.sampleWeight) : null,
                    tiempo_analisis_segundos: data.analysisTime ? Number(data.analysisTime) : null,
                    temperatura_muestra_c: data.sampleTemp ? Number(data.sampleTemp) : null,
                    observaciones: data.observations.toString() || null,
                })
                .select()
                .single();

            if (analysisError) throw analysisError;

            // Step 2: Insert the detailed parameters
            const parameters = [
                { parametro: 'pH', valor: data.ph, unidad: null },
                { parametro: 'Sólidos Totales', valor: data.totalSolids, unidad: '%' },
            ];

            const detailInserts = parameters
                .filter(p => p.valor)
                .map(p => ({
                    analisis_laboratorio_id: analysisData.id,
                    parametro: p.parametro,
                    valor: Number(p.valor),
                    unidad: p.unidad,
                }));

            if (detailInserts.length > 0) {
                const { error: detailError } = await supabase
                    .from('analisis_laboratorio_detalle')
                    .insert(detailInserts);
                if (detailError) throw detailError;
            }

            setMessage('Análisis guardado con éxito!');
            e.currentTarget.reset();
            fetchHistory();

        } catch (error: any) {
            setMessage(`Error al guardar el análisis: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-1">Análisis de Laboratorio</h2>
                <p className="text-sm text-text-secondary mb-4">Registrar mediciones de muestras de sustratos.</p>
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Fecha Muestra" id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required/>
                        <InputField label="Hora Muestra" id="time" name="time" type="time" defaultValue={new Date().toTimeString().slice(0, 5)} required/>
                    </div>
                    
                    <InputField 
                        label="Nº Remito (Asociado)" 
                        id="remito"
                        name="remito"
                        type="select" 
                        options={remitos.map(r => r.numero_remito_general || `ID ${r.id}`) || ['Cargando...']}
                        required
                    />
                    <div>
                        <label htmlFor="sampleType" className="block text-sm font-medium text-text-secondary">Tipo de Muestra</label>
                        <select
                            id="sampleType"
                            name="sampleType"
                            required
                            className="mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="">{tiposMuestra.length > 0 ? 'Seleccione tipo' : 'Cargando...'}</option>
                            {tiposMuestra.map(t => <option key={t.id} value={t.id}>{t.nombre_tipo_muestra}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <InputField label="pH" id="ph" name="ph" type="number" placeholder="7.0" />
                        <InputField label="Peso de Muestra" id="sampleWeight" name="sampleWeight" type="number" unit="g" />
                        <InputField label="Sólidos Totales (ST)" id="totalSolids" name="totalSolids" type="number" unit="%" />
                        <InputField label="Tiempo de Análisis" id="analysisTime" name="analysisTime" type="number" unit="seg" />
                        <InputField label="Temperatura Muestra" id="sampleTemp" name="sampleTemp" type="number" unit="°C" />
                    </div>

                    <InputField label="Observaciones" id="observations" name="observations" type="textarea" />

                    {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

                    <div className="pt-4">
                        <Button type="submit" variant="primary" isLoading={isLoading || dataLoading} disabled={dataLoading}>Guardar Análisis</Button>
                    </div>
                </form>
            </Card>
            <Card>
                 <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de Análisis Recientes</h2>
                 {historyLoading ? (
                    <p className="text-center text-text-secondary">Cargando historial...</p>
                 ) : historyError ? (
                    <p className="text-center text-red-500">{historyError}</p>
                 ) : history.length === 0 ? (
                    <p className="text-center text-text-secondary py-4">No hay análisis registrados todavía.</p>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-background">
                                 <tr>
                                     <th className={commonTableClasses.head}>Fecha y Hora</th>
                                     <th className={commonTableClasses.head}>Tipo Muestra</th>
                                     <th className={`${commonTableClasses.head} hidden sm:table-cell`}>Remito</th>
                                     <th className={commonTableClasses.head}>Temp (°C)</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-surface divide-y divide-border">
                                {history.map(item => (
                                    <tr key={item.id}>
                                        <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora_muestra!).toLocaleString('es-AR')}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{(item as any).tipos_muestra.nombre_tipo_muestra}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary hidden sm:table-cell`}>{item.numero_remito_asociado ?? 'N/A'}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.temperatura_muestra_c ?? 'N/A'}</td>
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

export default LaboratoryPage;