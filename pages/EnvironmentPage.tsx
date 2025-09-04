import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Page from '../components/Page';
// FIX: Use named import for Card from the new UI component path.
import { Card, CardContent } from '../components/ui/Card';
// FIX: Use named import for Button from the new UI component path.
import { Button } from '../components/ui/Button';
// FIX: Replace deprecated InputField with new UI components.
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

type MonitoreoDetalle = Database['public']['Tables']['monitoreos_ambientales_detalle']['Row'] & {
    monitoreos_ambientales: { fecha_monitoreo: string } | null;
};
type MonitoreoDetalleInsert = Database['public']['Tables']['monitoreos_ambientales_detalle']['Insert'];

interface DetalleConIdTemporal extends Omit<MonitoreoDetalleInsert, 'monitoreo_id'> {
    tempId: number;
}


const EnvironmentPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [details, setDetails] = useState<DetalleConIdTemporal[]>([]);
    
    // State for the temporary detail form
    const [parametro, setParametro] = useState('');
    const [valor, setValor] = useState('');
    const [unidad, setUnidad] = useState('');
    const [cumple, setCumple] = useState(true);

    // Chart state
    const [chartData, setChartData] = useState<MonitoreoDetalle[]>([]);
    const [chartParameter, setChartParameter] = useState<string>('');
    const [chartLoading, setChartLoading] = useState(true);
    const [chartError, setChartError] = useState<string | null>(null);

    const fetchChartData = useCallback(async () => {
        setChartLoading(true);
        setChartError(null);
        try {
            const { data, error } = await supabase
                .from('monitoreos_ambientales_detalle')
                .select(`
                    valor,
                    limite_normativo,
                    parametro_medido,
                    monitoreos_ambientales ( fecha_monitoreo )
                `)
                .limit(500);

            if (error) throw error;
            
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const recentData = (data as MonitoreoDetalle[]).filter(d => {
                if (!d.monitoreos_ambientales) return false;
                return new Date(d.monitoreos_ambientales.fecha_monitoreo).getTime() >= oneYearAgo.getTime();
            });

            setChartData(recentData);
            if(recentData.length > 0 && !chartParameter){
                // Set default parameter to the first one found in data
                setChartParameter(recentData[0].parametro_medido);
            }

        } catch (err: any) {
            setChartError(err.message);
        } finally {
            setChartLoading(false);
        }
    // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to fetch all data once on mount; filtering is handled in useMemo.
    }, []);

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    const { parameterOptions, processedChartData } = useMemo(() => {
        if (!chartData) return { parameterOptions: [], processedChartData: [] };
        
        const options = [...new Set(chartData.map(d => d.parametro_medido))];
        
        const sortedAndFilteredData = chartData
            .filter(d => d.parametro_medido === chartParameter && d.monitoreos_ambientales)
            .sort((a, b) => new Date(a.monitoreos_ambientales!.fecha_monitoreo).getTime() - new Date(b.monitoreos_ambientales!.fecha_monitoreo).getTime())
            .map(d => ({
                name: new Date(d.monitoreos_ambientales!.fecha_monitoreo + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
                'Límite': d.limite_normativo,
                'Medición': d.valor,
            }));

        return { parameterOptions: options, processedChartData: sortedAndFilteredData };
    }, [chartData, chartParameter]);

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
            cumple_normativa: cumple,
        };
        setDetails(prev => [...prev, newDetail]);
        setParametro('');
        setValor('');
        setUnidad('');
        setCumple(true);
    };

    const handleRemoveDetail = (tempId: number) => {
        setDetails(prev => prev.filter(d => d.tempId !== tempId));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const { data: monitoreoData, error: monitoreoError } = await supabase
                .from('monitoreos_ambientales')
                .insert({
                    planta_id: 1, // Hardcoded for demo
                    usuario_operador_id: 1, // Hardcoded for demo
                    fecha_monitoreo: data.date.toString(),
                    tipo_monitoreo: data.monitoringType.toString(),
                    observaciones: data.observations.toString() || null,
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
            e.currentTarget.reset();
            setDetails([]);
            fetchChartData(); // Refresh chart data

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
              <div><Label htmlFor="date">Fecha Monitoreo</Label><Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className={inputClasses}/></div>
              <div>
                <Label htmlFor="monitoringType">Tipo de Monitoreo</Label>
                <Select id="monitoringType" name="monitoringType" required className={inputClasses}>
                    {['Emisiones', 'Ruido', 'Agua', 'Suelo'].map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
              </div>
            </div>

            <fieldset className="border-t border-border pt-4 mt-4">
              <legend className="text-base font-semibold text-text-primary mb-2">Parámetros Medidos</legend>
               <div className="p-3 bg-background rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-2">
                          <Label htmlFor="param">Parámetro</Label>
                          <Input type="text" id="param" value={parametro} onChange={e => setParametro(e.target.value)} className={inputClasses} placeholder="Ej: PM10" />
                      </div>
                      <div>
                          <Label htmlFor="value">Valor</Label>
                          <Input type="number" step="any" id="value" value={valor} onChange={e => setValor(e.target.value)} className={inputClasses} placeholder="12.5" min="0"/>
                      </div>
                      <div className="flex items-center space-x-2">
                          <div>
                              <Label htmlFor="unit">Unidad</Label>
                              <Input type="text" id="unit" value={unidad} onChange={e => setUnidad(e.target.value)} className={inputClasses} placeholder="µg/m³" />
                          </div>
                          <div className="flex items-center ml-auto pt-6">
                              <input type="checkbox" id="compliant" checked={cumple} onChange={e => setCumple(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                              <Label htmlFor="compliant" className="text-sm font-medium text-text-primary ml-2">Cumple</Label>
                          </div>
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
                                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${d.cumple_normativa ? 'bg-success-bg text-success' : 'bg-error-bg text-error'}`}>
                                      {d.cumple_normativa ? 'Cumple' : 'No Cumple'}
                                  </span>
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
                <Textarea id="observations" name="observations" placeholder="Anotar condiciones climáticas u otras observaciones relevantes..." className={inputClasses} />
            </div>
            
            {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

            <div className="pt-4">
              {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
              <Button type="submit" variant="default" isLoading={isLoading} disabled={isLoading}>Guardar Monitoreo</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Tendencia Anual de Parámetros</h3>
              {parameterOptions.length > 0 && (
                  <select 
                      value={chartParameter} 
                      onChange={e => setChartParameter(e.target.value)}
                      className={`${inputClasses} mt-2 sm:mt-0 sm:w-auto`}
                      aria-label="Seleccionar parámetro para visualizar"
                  >
                      {parameterOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
              )}
          </div>
          {chartLoading ? (
              <div className="text-center text-text-secondary py-10">Cargando datos del gráfico...</div>
          ) : chartError ? (
               <div className="text-center text-red-500 py-10">{`Error al cargar el gráfico: ${chartError}`}</div>
          ) : processedChartData.length === 0 ? (
              <div className="text-center text-text-secondary py-10">
                  {parameterOptions.length > 0 ? `No hay datos para el parámetro "${chartParameter}".` : 'No hay datos de monitoreo para mostrar.'}
              </div>
          ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={processedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
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
