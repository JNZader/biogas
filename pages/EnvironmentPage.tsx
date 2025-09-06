import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { PlusCircleIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportToPdf } from '../lib/utils';
import EmptyState from '../components/EmptyState';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

type Monitoreo = Database['public']['Tables']['monitoreos_ambientales']['Row'];
type MonitoreoDetalle = Database['public']['Tables']['monitoreos_ambientales_detalle']['Row'];

type EnrichedMonitoreo = Monitoreo & {
    monitoreos_ambientales_detalle: MonitoreoDetalle[];
};

type ChartDataPoint = MonitoreoDetalle & {
    monitoreos_ambientales: { fecha_monitoreo: string } | null;
};

type MonitoreoDetalleInsert = Database['public']['Tables']['monitoreos_ambientales_detalle']['Insert'];

interface DetalleConIdTemporal extends Omit<MonitoreoDetalleInsert, 'monitoreo_id'> {
    tempId: number;
}

// --- Co-located Constants for Selects ---
const PARAMETER_OPTIONS = [
    { value: 'PM10', label: 'PM10 (Partículas)', unit: 'µg/m³' },
    { value: 'PM2.5', label: 'PM2.5 (Partículas)', unit: 'µg/m³' },
    { value: 'NOx', label: 'NOx (Óxidos de Nitrógeno)', unit: 'ppm' },
    { value: 'SO2', label: 'SO2 (Dióxido de Azufre)', unit: 'ppm' },
    { value: 'CO', label: 'CO (Monóxido de Carbono)', unit: 'ppm' },
    { value: 'DBO5', label: 'DBO5 (Agua)', unit: 'mg/L' },
    { value: 'DQO', label: 'DQO (Agua)', unit: 'mg/L' },
    { value: 'pH', label: 'pH (Agua)', unit: '' },
    { value: 'Nitrato', label: 'Nitrato (Suelo)', unit: 'mg/kg' },
    { value: 'Fosfato', label: 'Fosfato (Suelo)', unit: 'mg/kg' },
    { value: 'Ruido', label: 'Nivel de Ruido', unit: 'dB' },
];

const UNIT_OPTIONS = ['µg/m³', 'ppm', 'mg/L', 'mg/kg', 'dB', '%', '°C', 'NTU'];


const EnvironmentPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // State for main form
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [monitoringType, setMonitoringType] = useState('Emisiones');
    const [observations, setObservations] = useState('');
    
    // State for details
    const [details, setDetails] = useState<DetalleConIdTemporal[]>([]);
    
    // State for the temporary detail form
    const [parametro, setParametro] = useState('');
    const [valor, setValor] = useState('');
    const [unidad, setUnidad] = useState('');
    const [limiteNormativo, setLimiteNormativo] = useState('');

    // History and Chart state
    const [history, setHistory] = useState<EnrichedMonitoreo[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [chartParameter, setChartParameter] = useState<string>('');
    const [chartLoading, setChartLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('monitoreos_ambientales')
                .select('*, monitoreos_ambientales_detalle(*)')
                .order('fecha_monitoreo', { ascending: false })
                .limit(10);
            if (error) throw error;
            setHistory(data || []);
        } catch (err: any) {
            setMessage(`Error al cargar el historial: ${err.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const fetchChartData = useCallback(async () => {
        setChartLoading(true);
        try {
            const { data, error } = await supabase
                .from('monitoreos_ambientales_detalle')
                .select(`*, monitoreos_ambientales ( fecha_monitoreo )`)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const recentData = (data as ChartDataPoint[]).filter(d => {
                if (!d.monitoreos_ambientales) return false;
                return new Date(d.monitoreos_ambientales.fecha_monitoreo).getTime() >= oneYearAgo.getTime();
            });

            setChartData(recentData);
            if(recentData.length > 0 && !chartParameter){
                setChartParameter(recentData[0].parametro_medido);
            }

        } catch (err: any) {
            setMessage(`Error al cargar datos del gráfico: ${err.message}`);
        } finally {
            setChartLoading(false);
        }
    }, [chartParameter]);

    useEffect(() => {
        fetchHistory();
        fetchChartData();
    }, [fetchHistory, fetchChartData]);

    const { parameterOptions, processedChartData } = useMemo(() => {
        if (!chartData) return { parameterOptions: [], processedChartData: [] };
        
        const options = [...new Set(chartData.map(d => d.parametro_medido).filter(Boolean))];
        
        const sortedAndFilteredData = chartData
            .filter(d => d.parametro_medido === chartParameter && d.monitoreos_ambientales)
            .sort((a, b) => new Date(a.monitoreos_ambientales!.fecha_monitoreo).getTime() - new Date(b.monitoreos_ambientales!.fecha_monitoreo).getTime())
            .map(d => ({
                Fecha: new Date(d.monitoreos_ambientales!.fecha_monitoreo + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
                'Límite': d.limite_normativo,
                'Medición': d.valor,
            }));

        return { parameterOptions: options, processedChartData: sortedAndFilteredData };
    }, [chartData, chartParameter]);

    const handleParameterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newParam = e.target.value;
        setParametro(newParam);
        const selectedParam = PARAMETER_OPTIONS.find(p => p.value === newParam);
        if (selectedParam && selectedParam.unit) {
            setUnidad(selectedParam.unit);
        } else {
            setUnidad(''); // Reset if no specific unit
        }
    };

    const handleAddDetail = () => {
        if (!parametro.trim() || !valor.trim()) {
            setMessage('Error: Por favor, complete el parámetro y el valor.');
            return;
        }
        setMessage('');
        const newDetail: DetalleConIdTemporal = {
            tempId: Date.now(),
            parametro_medido: parametro,
            valor: parseFloat(valor),
            unidad_medida: unidad,
            limite_normativo: limiteNormativo ? parseFloat(limiteNormativo) : null,
        };
        setDetails(prev => [...prev, newDetail]);
        // Reset detail form fields
        setParametro('');
        setValor('');
        setUnidad('');
        setLimiteNormativo('');
    };

    const handleRemoveDetail = (tempId: number) => {
        setDetails(prev => prev.filter(d => d.tempId !== tempId));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (details.length === 0) {
            setMessage('Error: Debe añadir al menos un parámetro medido para guardar el monitoreo.');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const lastAddedParam = details.length > 0 ? details[details.length - 1].parametro_medido : null;
            
            const { data: monitoreoData, error: monitoreoError } = await supabase
                .from('monitoreos_ambientales')
                .insert({
                    planta_id: 1, // Hardcoded for demo
                    usuario_operador_id: 1, // Hardcoded for demo
                    fecha_monitoreo: date,
                    tipo_monitoreo: monitoringType,
                    observaciones: observations || null,
                })
                .select()
                .single();

            if (monitoreoError) throw monitoreoError;

            if (details.length > 0) {
                const detailsToInsert = details.map(({ tempId, ...rest }) => ({
                    ...rest,
                    monitoreo_id: monitoreoData.id,
                }));
                const { error: detailError } = await supabase.from('monitoreos_ambientales_detalle').insert(detailsToInsert);
                if (detailError) throw detailError;
            }

            setMessage('Monitoreo guardado con éxito!');
            
            setDate(new Date().toISOString().split('T')[0]);
            setMonitoringType('Emisiones');
            setObservations('');
            setDetails([]);
            
            await fetchHistory();
            await fetchChartData();

            if (lastAddedParam) {
                setChartParameter(lastAddedParam);
            }

        } catch (error: any) {
            setMessage(`Error al guardar: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    
    return (
    <Page className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Monitoreo Ambiental</h2>
          <p className="text-sm text-text-secondary mb-4">Cargar resultados de monitoreos y visualizar tendencias.</p>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="date">Fecha Monitoreo</Label><Input id="date" name="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClasses}/></div>
              <div>
                <Label htmlFor="monitoringType">Tipo de Monitoreo</Label>
                <Select id="monitoringType" name="monitoringType" value={monitoringType} onChange={e => setMonitoringType(e.target.value)} required className={inputClasses}>
                    {['Emisiones', 'Ruido', 'Agua', 'Suelo'].map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
              </div>
            </div>

            <fieldset className="border-t border-border pt-4 mt-4">
              <legend className="text-base font-semibold text-text-primary mb-2">Parámetros Medidos</legend>
               <div className="p-3 bg-background rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                      <div>
                          <Label htmlFor="param">Parámetro</Label>
                          <Select id="param" value={parametro} onChange={handleParameterChange} className={inputClasses}>
                            <option value="">Seleccione...</option>
                            {PARAMETER_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="value">Valor</Label>
                          <Input type="number" step="any" id="value" value={valor} onChange={e => setValor(e.target.value)} className={inputClasses} placeholder="12.5" min="0"/>
                      </div>
                      <div>
                          <Label htmlFor="unit">Unidad</Label>
                          <Select id="unit" value={unidad} onChange={e => setUnidad(e.target.value)} className={inputClasses}>
                            <option value="">Seleccione...</option>
                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="limit">Límite Normativo (Opcional)</Label>
                          <Input type="number" step="any" id="limit" value={limiteNormativo} onChange={e => setLimiteNormativo(e.target.value)} className={inputClasses} placeholder="20.0" min="0"/>
                      </div>
                   </div>
                   <Button type="button" onClick={handleAddDetail} variant="secondary" className="w-auto px-3 py-1.5 text-sm">
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> Añadir Parámetro
                  </Button>
               </div>
              
              {details.length > 0 && (
                  <div className="mt-4 space-y-2">
                      {details.map(d => (
                          <div key={d.tempId} className="flex items-center justify-between p-2 bg-primary/10 rounded-md text-sm">
                              <div>
                                  <span className="font-medium">{d.parametro_medido}: </span>
                                  <span className="text-text-primary">{d.valor} {d.unidad_medida}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveDetail(d.tempId)} className="p-1 rounded-full hover:bg-error-bg">
                                  <TrashIcon className="h-5 w-5 text-error" />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
            </fieldset>

            <div>
                <Label htmlFor="observations">Observaciones Generales</Label>
                <Textarea id="observations" name="observations" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Anotar condiciones climáticas u otras observaciones relevantes..." className={inputClasses} />
            </div>
            
            {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

            <div className="pt-4">
              <Button type="submit" variant="default" isLoading={isLoading} disabled={isLoading}>Guardar Monitoreo</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Historial de Monitoreos Recientes</CardTitle></CardHeader>
        <CardContent>
            {historyLoading ? (
                <p className="text-center text-text-secondary py-4">Cargando historial...</p>
            ) : history.length === 0 ? (
                <EmptyState
                    icon={<ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-text-secondary" />}
                    title="No hay monitoreos"
                    message="Aún no se han guardado registros de monitoreo ambiental."
                />
            ) : (
                <div className="space-y-4">
                    {history.map(item => (
                        <div key={item.id} className="p-4 border border-border rounded-lg bg-background/50">
                             <div className="flex justify-between items-center mb-3 pb-3 border-b border-border">
                                <div>
                                    <p className="font-semibold text-text-primary">{item.tipo_monitoreo}</p>
                                    <p className="text-sm text-text-secondary">{new Date(item.fecha_monitoreo + 'T00:00:00').toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>
                            
                            {(item.monitoreos_ambientales_detalle || []).length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                                    {(item.monitoreos_ambientales_detalle).map(d => (
                                        <div key={d.id} className="bg-surface p-2 rounded-md border border-border/50 text-center shadow-sm">
                                            <p className="text-xs font-medium text-text-secondary truncate">{d.parametro_medido}</p>
                                            <p className="text-lg font-bold text-primary">{d.valor}</p>
                                            <p className="text-xs text-text-secondary">{d.unidad_medida}</p>
                                            {d.limite_normativo != null && (
                                                <p className={`text-xs mt-1 ${ d.valor != null && d.valor > d.limite_normativo ? 'text-error font-semibold' : 'text-text-secondary/80'}`}>
                                                    Límite: {d.limite_normativo}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {item.observaciones && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-sm font-semibold text-text-secondary mb-1">Observaciones:</p>
                                    <p className="text-sm text-text-primary italic">{item.observaciones}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
              <h3 className="text-lg font-semibold text-text-primary">Tendencia Anual de Parámetros</h3>
              <div className="flex items-center gap-2">
                {parameterOptions.length > 0 && (
                    <Select 
                        value={chartParameter} 
                        onChange={e => setChartParameter(e.target.value)}
                        className={`${inputClasses} mt-2 sm:mt-0 sm:w-auto`}
                        aria-label="Seleccionar parámetro para visualizar"
                    >
                        {parameterOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                )}
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToPdf(`Tendencia - ${chartParameter}`, processedChartData)}
                    disabled={processedChartData.length === 0}
                >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Exportar PDF
                </Button>
              </div>
          </div>
          {chartLoading ? (
              <div className="text-center text-text-secondary py-10">Cargando datos del gráfico...</div>
          ) : processedChartData.length === 0 ? (
              <div className="text-center text-text-secondary py-10">
                  {parameterOptions.length > 0 ? `No hay datos para el parámetro "${chartParameter}".` : 'No hay datos de monitoreo para mostrar.'}
              </div>
          ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={processedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="Fecha" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Medición" stroke="#1E3A8A" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Límite" stroke="#EF4444" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
};

export default EnvironmentPage;
