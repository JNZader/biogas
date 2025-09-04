import React, { useState, useEffect, useCallback } from 'react';
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
  
  const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
  const commonTableClasses = {
      head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
      cell: "px-4 py-3 whitespace-nowrap text-sm",
  };

  return (
    <Page className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Carga de Potencia del Motor (CHP)</h2>
          <p className="text-sm text-text-secondary mb-4">Registrar los cambios de potencia y sus motivos.</p>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="date">Fecha</Label><Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className={commonInputClasses} /></div>
              <div><Label htmlFor="time">Hora</Label><Input id="time" name="time" type="time" defaultValue={new Date().toTimeString().slice(0, 5)} required className={commonInputClasses} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="initial_power">Potencia Inicial (kW)</Label><Input id="initial_power" name="initial_power" type="number" min="0" required className={commonInputClasses}/></div>
              <div><Label htmlFor="programmed_power">Potencia Programada (kW)</Label><Input id="programmed_power" name="programmed_power" type="number" min="0" required className={commonInputClasses}/></div>
            </div>

            <div>
                <Label htmlFor="reason">Motivo del Cambio</Label>
                <Select id="reason" name="reason" required className={commonInputClasses}>
                    {motivos.map(motivo => <option key={motivo} value={motivo}>{motivo}</option>)}
                </Select>
            </div>
            <div>
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea id="observations" name="observations" className={commonInputClasses} />
            </div>
            
            {message && <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-success-bg text-success'}`}>{message}</div>}

            <div className="pt-4">
              {/* FIX: Changed button variant from "primary" to "default" to match the available variants in the Button component. */}
              <Button type="submit" variant="default" isLoading={isLoading}>Guardar Cambio</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </Page>
  );
};

export default ChpControlPage;