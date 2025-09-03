import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import InputField from '../components/InputField';
import type { Database } from '../types/database';

type FosTacAnalysis = Database['public']['Tables']['analisis_fos_tac']['Row'];
interface FosTacHistoryItem extends FosTacAnalysis {
    equipo_nombre?: string;
}

type AditivoRecord = Database['public']['Tables']['aditivos_biodigestor']['Row'];
interface EnrichedAditivoRecord extends AditivoRecord {
    equipo_nombre?: string;
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

const FosTacCalculator: React.FC = () => {
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const [vol1, setVol1] = useState('');
    const [vol2, setVol2] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    const [history, setHistory] = useState<FosTacHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const biodigestores = equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor'));

    const { fos, tac, ratio } = useMemo(() => {
        const v1 = parseFloat(vol1) || 0;
        const v2 = parseFloat(vol2) || 0;
        if (v1 <= 0) return { fos: 0, tac: 0, ratio: 0 };
        const calculatedTac = v1 * 250;
        const calculatedFos = (((v2 - v1) * 1.66) - 0.15) * 500;
        const calculatedRatio = calculatedTac > 0 ? calculatedFos / calculatedTac : 0;
        return {
            fos: Math.max(0, calculatedFos),
            tac: Math.max(0, calculatedTac),
            ratio: Math.max(0, calculatedRatio)
        };
    }, [vol1, vol2]);
    
    const fetchHistory = useCallback(async () => {
        if (!equipos || equipos.length === 0) return;
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('analisis_fos_tac')
                .select('*')
                .order('fecha_hora', { ascending: false })
                .limit(15);

            if (error) throw error;
            const enrichedData = data.map(reading => {
                const equipo = equipos.find(e => e.id === reading.equipo_id);
                return {
                    ...reading,
                    equipo_nombre: equipo ? equipo.nombre_equipo : `ID: ${reading.equipo_id}`
                };
            });
            setHistory(enrichedData);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, [equipos]);

    useEffect(() => {
        if (!dataLoading) {
            fetchHistory();
        }
    }, [dataLoading, fetchHistory]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        
        const fecha_hora = `${data.date}T${new Date().toTimeString().slice(0,8)}`;

        const { error } = await supabase.from('analisis_fos_tac').insert({
            equipo_id: Number(data.equipment),
            usuario_operador_id: 1, // Hardcoded user ID for demo
            fecha_hora: fecha_hora,
            ph: data.ph ? Number(data.ph) : null,
            volumen_1_ml: Number(vol1),
            volumen_2_ml: Number(vol2),
        });

        setIsLoading(false);
        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            setMessage('Análisis FOS/TAC guardado con éxito!');
            e.currentTarget.reset();
            setVol1('');
            setVol2('');
            fetchHistory();
        }
    };
    
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";


    if (dataError) {
        return (
            <Card>
                <h2 className="text-lg font-semibold text-error mb-2">Error de Carga</h2>
                <p className="text-text-secondary">No se pudo cargar la lista de equipos.</p>
                <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{dataError}</pre>
            </Card>
        );
    }
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Análisis FOS/TAC</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="equipment" className="block text-sm font-medium text-text-secondary">Equipo (Biodigestor)</label>
                      <select
                        id="equipment"
                        name="equipment"
                        required
                        className={commonInputClasses}
                        disabled={dataLoading}
                      >
                        <option value="">{dataLoading ? 'Cargando...' : 'Seleccione Biodigestor'}</option>
                        {biodigestores.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                      </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-text-secondary">Fecha</label>
                        <input type="date" id="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className={commonInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="ph" className="block text-sm font-medium text-text-secondary">pH</label>
                        <input type="number" id="ph" name="ph" step="0.01" className={commonInputClasses} />
                    </div>
                    
                    <fieldset className="border-t border-border pt-4">
                        <legend className="text-base font-semibold text-text-primary mb-2">Volúmenes de Titulación</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="vol1" className="block text-sm font-medium text-text-secondary">Volumen 1 (mL)</label>
                                <input type="number" id="vol1" name="vol1" value={vol1} onChange={e => setVol1(e.target.value)} required className={commonInputClasses} />
                            </div>
                            <div>
                                <label htmlFor="vol2" className="block text-sm font-medium text-text-secondary">Volumen 2 (mL)</label>
                                <input type="number" id="vol2" name="vol2" value={vol2} onChange={e => setVol2(e.target.value)} required className={commonInputClasses} />
                            </div>
                        </div>
                    </fieldset>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                        <div className="text-center p-2 bg-background rounded">
                            <p className="text-sm text-text-secondary">FOS (mg/L)</p>
                            <p className="text-xl font-bold text-primary">{fos.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                            <p className="text-sm text-text-secondary">TAC (mg/L)</p>
                            <p className="text-xl font-bold text-primary">{tac.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                            <p className="text-sm text-text-secondary">Relación FOS/TAC</p>
                            <p className="text-xl font-bold text-primary">{ratio.toFixed(3)}</p>
                        </div>
                    </div>

                    {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

                    <Button type="submit" variant="primary" isLoading={isLoading}>Guardar Análisis</Button>
                </form>
            </Card>

            <Card>
                 <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de Análisis Recientes</h2>
                 {historyLoading ? (
                    <p className="text-center text-text-secondary">Cargando historial...</p>
                 ) : historyError ? (
                    <p className="text-center text-error">{historyError}</p>
                 ) : history.length === 0 ? (
                    <p className="text-center text-text-secondary py-4">No hay análisis registrados todavía.</p>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-background">
                                 <tr>
                                     <th className={commonTableClasses.head}>Fecha y Hora</th>
                                     <th className={commonTableClasses.head}>Equipo</th>
                                     <th className={commonTableClasses.head}>FOS (mg/L)</th>
                                     <th className={commonTableClasses.head}>TAC (mg/L)</th>
                                     <th className={commonTableClasses.head}>Relación</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-surface divide-y divide-border">
                                {history.map(item => (
                                    <tr key={item.id}>
                                        <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.equipo_nombre}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.fos_mg_l?.toFixed(2) ?? 'N/A'}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.tac_mg_l?.toFixed(2) ?? 'N/A'}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-bold`}>{item.relacion_fos_tac?.toFixed(3) ?? 'N/A'}</td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                 )}
            </Card>
        </div>
    );
};

const Additives: React.FC = () => {
    const { equipos, loading: dataLoading, error: dataError } = useSupabaseData();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<EnrichedAditivoRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const biodigestores = useMemo(() => 
        equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor')), 
    [equipos]);

    const fetchHistory = useCallback(async () => {
        if (!equipos || equipos.length === 0) return;
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const { data, error } = await supabase
                .from('aditivos_biodigestor')
                .select(`*, equipos ( nombre_equipo )`)
                .order('fecha_hora', { ascending: false })
                .limit(15);
            
            if (error) throw error;

            const enrichedData = data.map(item => ({
                ...item,
                equipo_nombre: item.equipos?.nombre_equipo
            }));

            setHistory(enrichedData as any[]);
        } catch (err: any) {
            setHistoryError(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, [equipos]);

    useEffect(() => {
        if(!dataLoading){
            fetchHistory();
        }
    }, [dataLoading, fetchHistory]);
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        const fecha_hora = `${data.additive_date}T${new Date().toTimeString().slice(0,8)}`;

        const insertData = {
            fecha_hora,
            tipo_aditivo: data.additive.toString(),
            cantidad_kg: Number(data.additive_quantity),
            equipo_id: Number(data.additive_bio),
            usuario_operador_id: 1 // hardcoded
        };

        const { error } = await supabase.from('aditivos_biodigestor').insert(insertData);
        
        setIsLoading(false);
        if (error) {
            setMessage(`Error al guardar el registro: ${error.message}`);
        } else {
            setMessage('Registro de aditivo guardado con éxito!');
            e.currentTarget.reset();
            fetchHistory();
        }
    };
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    if (dataError) {
        return <Card><p className="text-error">{dataError}</p></Card>
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Registro de Aditivos</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <InputField label="Fecha" id="additive_date" name="additive_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required/>
                    <InputField label="Aditivo" id="additive" name="additive" type="select" options={['BICKO', 'HIMAX', 'CAL', 'OTROS']} required/>
                    <InputField label="Cantidad" id="additive_quantity" name="additive_quantity" type="number" unit="kg" required/>
                    <div>
                        <label htmlFor="additive_bio" className="block text-sm font-medium text-text-secondary">Biodigestor</label>
                        <select
                            id="additive_bio"
                            name="additive_bio"
                            required
                            className="mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            disabled={dataLoading}
                        >
                            <option value="">{dataLoading ? 'Cargando...' : 'Seleccione Biodigestor'}</option>
                            {biodigestores.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                        </select>
                    </div>
                    {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}
                    <Button type="submit" variant="secondary" isLoading={isLoading || dataLoading} disabled={dataLoading}>Guardar Registro</Button>
                </form>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Aditivos Recientes</h3>
                {historyLoading ? (
                    <p className="text-center text-text-secondary">Cargando historial...</p>
                ) : historyError ? (
                    <p className="text-center text-error">{historyError}</p>
                ) : history.length === 0 ? (
                    <p className="text-center text-text-secondary py-4">No hay registros de aditivos.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-background">
                                 <tr>
                                     <th className={commonTableClasses.head}>Fecha y Hora</th>
                                     <th className={commonTableClasses.head}>Aditivo</th>
                                     <th className={commonTableClasses.head}>Cantidad (kg)</th>
                                     <th className={commonTableClasses.head}>Equipo</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-surface divide-y divide-border">
                                {history.map(item => (
                                    <tr key={item.id}>
                                        <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora).toLocaleString('es-AR')}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{item.tipo_aditivo}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.cantidad_kg}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{item.equipo_nombre}</td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};


const PfQPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fos' | 'additives'>('fos');
  return (
    <Page>
      <div className="mb-4 border-b border-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton active={activeTab === 'fos'} onClick={() => setActiveTab('fos')}>
            FOS/TAC
          </TabButton>
          <TabButton active={activeTab === 'additives'} onClick={() => setActiveTab('additives')}>
            Aditivos
          </TabButton>
        </nav>
      </div>
      <div>
        {activeTab === 'fos' ? <FosTacCalculator /> : <Additives />}
      </div>
    </Page>
  );
};

export default PfQPage;