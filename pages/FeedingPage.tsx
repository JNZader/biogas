import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import { getAIFeedingPrediction } from '../services/geminiService';
import type { SubstrateAnalysis } from '../services/geminiService';
import * as api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import type { Database } from '../types/database';

type AlimentacionRecord = Database['public']['Tables']['alimentacion_biodigestor']['Row'];
interface EnrichedAlimentacionRecord extends AlimentacionRecord {
    equipo_origen?: { nombre_equipo: string } | null;
    equipo_destino?: { nombre_equipo: string } | null;
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

const AIPrediction: React.FC = () => {
  const [analysis, setAnalysis] = useState<SubstrateAnalysis>({
    lipids: 15,
    proteins: 20,
    carbs: 50,
    totalSolids: 25,
    volatileSolids: 80,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAnalysis(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult('');
    try {
      const prediction = await getAIFeedingPrediction(analysis);
      setResult(prediction);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

  return (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-4">Análisis de Sustrato para Predicción</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.keys(analysis).map((key) => (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-text-secondary capitalize">
              {key.replace(/([A-Z])/g, ' $1')} (%)
            </label>
            <input
              type="number"
              id={key}
              name={key}
              value={analysis[key as keyof SubstrateAnalysis]}
              onChange={handleInputChange}
              className={commonInputClasses}
              step="0.1"
            />
          </div>
        ))}
        <Button type="submit" isLoading={isLoading}>Obtener Recomendación de IA</Button>
      </form>
      {error && <div className="mt-4 text-error bg-error-bg p-3 rounded-md">{error}</div>}
      {result && (
        <div className="mt-6 p-4 bg-background rounded-lg">
          <h3 className="text-md font-semibold text-text-primary mb-2">Recomendación Generada</h3>
          <div className="prose prose-sm max-w-none text-text-primary" dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br />') }} />
        </div>
      )}
    </Card>
  );
};

const LogFeeding: React.FC = () => {
    const queryClient = useQueryClient();
    const addNotification = useNotificationStore(s => s.addNotification);

    const { data: equipos = [], isLoading: isEquiposLoading, error: equiposError } = useQuery({ queryKey: ['equipos'], queryFn: api.fetchEquipos });
    const { data: history = [], isLoading: isHistoryLoading } = useQuery({ queryKey: ['alimentacionHistory'], queryFn: api.fetchAlimentacionHistory });

    const mutation = useMutation({
        mutationFn: api.createAlimentacion,
        onSuccess: () => {
            addNotification('Registro guardado con éxito!', 'success');
            queryClient.invalidateQueries({ queryKey: ['alimentacionHistory'] });
        },
        onError: (err: Error) => {
            addNotification(`Error al guardar: ${err.message}`, 'error');
        }
    });

    const { sources, destinations } = useMemo(() => {
        const sources = equipos.filter(e => e.categoria && ['Bomba', 'Silo', 'Tanque', 'Playa de Descarga', 'Buffer', 'Hidrolizador'].includes(e.categoria)) || [];
        const destinations = equipos.filter(e => e.nombre_equipo?.toLowerCase().includes('biodigestor')) || [];
        return { sources, destinations };
    }, [equipos]);
    

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        mutation.mutate(data);
        if(!mutation.isError) {
            e.currentTarget.reset();
        }
    };

    const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    if (equiposError) {
        return <Card><p className="text-error">{equiposError.message}</p></Card>
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Registrar Alimentación Realizada</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="source" className="block text-sm font-medium text-text-secondary">Fuente</label>
                            <select id="source" name="source" required className={commonSelectClasses} disabled={isEquiposLoading}>
                                 <option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione origen'}</option>
                                 {sources.map(s => <option key={s.id} value={s.id}>{s.nombre_equipo}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="destination" className="block text-sm font-medium text-text-secondary">Destino (Biodigestor)</label>
                            <select id="destination" name="destination" required className={commonSelectClasses} disabled={isEquiposLoading}>
                                <option value="">{isEquiposLoading ? 'Cargando...' : 'Seleccione destino'}</option>
                                {destinations.map(d => <option key={d.id} value={d.id}>{d.nombre_equipo}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-text-secondary">Cantidad</label>
                        <div className="flex">
                            <input type="number" step="any" id="quantity" name="quantity" required className="mt-1 block w-2/3 px-3 py-2 bg-surface border border-border rounded-l-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            <select id="unit" name="unit" className="mt-1 block w-1/3 px-3 py-2 bg-background border border-l-0 border-border rounded-r-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                <option>kg</option>
                                <option>m³</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="observations" className="block text-sm font-medium text-text-secondary">Observaciones (Opcional)</label>
                        <textarea id="observations" name="observations" rows={3} className="mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"></textarea>
                    </div>

                    <Button type="submit" variant="secondary" isLoading={mutation.isPending || isEquiposLoading} disabled={isEquiposLoading}>Guardar Registro</Button>
                </form>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Alimentación Reciente</h3>
                {isHistoryLoading ? <p className="text-center text-text-secondary">Cargando historial...</p> : (
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-background">
                                 <tr>
                                     <th className={commonTableClasses.head}>Fecha</th>
                                     <th className={commonTableClasses.head}>Origen</th>
                                     <th className={commonTableClasses.head}>Destino</th>
                                     <th className={`${commonTableClasses.head} text-right`}>Cantidad</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-surface divide-y divide-border">
                                {history.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-text-secondary">No hay registros de alimentación.</td></tr>
                                ) : history.map(item => (
                                    <tr key={item.id}>
                                        <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(item.fecha_hora!).toLocaleString('es-AR')}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{(item as EnrichedAlimentacionRecord).equipo_origen?.nombre_equipo ?? 'N/A'}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary`}>{(item as EnrichedAlimentacionRecord).equipo_destino?.nombre_equipo ?? 'N/A'}</td>
                                        <td className={`${commonTableClasses.cell} text-text-primary font-medium text-right`}>{item.cantidad} {item.unidad}</td>
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

const FeedingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'log'>('ai');

  return (
    <Page>
      <div className="mb-4 border-b border-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>
            Predicción con IA
          </TabButton>
          <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')}>
            Registrar Alimentación
          </TabButton>
        </nav>
      </div>
      <div>
        {activeTab === 'ai' ? <AIPrediction /> : <LogFeeding />}
      </div>
    </Page>
  );
};

export default FeedingPage;