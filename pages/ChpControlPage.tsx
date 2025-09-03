import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';

type ChpChangeRecord = Database['public']['Tables']['cambios_potencia_chp']['Row'];

const ChpControlPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChpChangeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const motivos = [
    'Corte de Luz',
    'Microcorte tensión',
    'Falta de gas',
    'Falla Chiller',
    'Falla CHP',
    'Mantenimiento CHP',
    'Mantenimiento de otros equipos',
    'Otro (especificar en observaciones)'
  ];

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
        const { data, error } = await supabase
            .from('cambios_potencia_chp')
            .select('*')
            .order('fecha_hora', { ascending: false })
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

    const fecha_hora = `${data.date}T${data.time}:00`;

    const { error } = await supabase.from('cambios_potencia_chp').insert({
        planta_id: 1, // Hardcoded for demo
        usuario_operador_id: 1, // Hardcoded for demo
        fecha_hora,
        potencia_inicial_kw: Number(data.initial_power),
        potencia_programada_kw: Number(data.programmed_power),
        motivo_cambio: data.reason.toString(),
        observaciones: data.observations ? data.observations.toString() : null,
    });

    setIsLoading(false);
    if (error) {
        setMessage(`Error al guardar el cambio: ${error.message}`);
    } else {
        setMessage('Cambio de potencia guardado con éxito!');
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
        <h2 className="text-lg font-semibold text-text-primary mb-1">Carga de Potencia del Motor (CHP)</h2>
        <p className="text-sm text-text-secondary mb-4">Registrar los cambios de potencia y sus motivos.</p>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Fecha" id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
            <InputField label="Hora" id="time" name="time" type="time" defaultValue={new Date().toTimeString().slice(0, 5)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Potencia Inicial" id="initial_power" name="initial_power" type="number" unit="kW" required/>
            <InputField label="Potencia Programada" id="programmed_power" name="programmed_power" type="number" unit="kW" required/>
          </div>

          <InputField label="Motivo del Cambio" id="reason" name="reason" type="select" options={motivos} required />
          <InputField label="Observaciones" id="observations" name="observations" type="textarea" />
          
          {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

          <div className="pt-4">
            <Button type="submit" variant="primary" isLoading={isLoading}>Guardar Cambio</Button>
          </div>
        </form>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Historial de Cambios Recientes</h3>
        {historyLoading ? (
            <p className="text-center text-text-secondary">Cargando historial...</p>
        ) : historyError ? (
            <p className="text-center text-red-500">{historyError}</p>
        ) : history.length === 0 ? (
            <p className="text-center text-text-secondary py-4">No hay cambios de potencia registrados.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                        <tr>
                            <th className={commonTableClasses.head}>Fecha y Hora</th>
                            <th className={commonTableClasses.head}>Potencia (kW)</th>
                            <th className={commonTableClasses.head}>Motivo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {history.map(item => (
                            <tr key={item.id}>
                                <td className={`${commonTableClasses.cell} text-text-secondary`}>
                                    {new Date(item.fecha_hora).toLocaleString('es-AR')}
                                </td>
                                <td className={`${commonTableClasses.cell} text-text-primary`}>
                                    {item.potencia_inicial_kw} → {item.potencia_programada_kw}
                                </td>
                                <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>
                                    {item.motivo_cambio}
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

export default ChpControlPage;