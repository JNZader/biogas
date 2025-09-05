import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Switch } from '../components/ui/Switch';
import { Select } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { Button } from '../components/ui/Button';
import Page from '../components/Page';
import { BoltIcon, FireIcon, BeakerIcon, AdjustmentsHorizontalIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ArrowUpIcon, ArrowDownIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useThemeColors } from '../stores/useThemeColors';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { cn } from '../lib/utils';
import { useStore as useZustandStore } from 'zustand';
import { customAlertsStore } from '../stores/customAlertsStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSupabaseData } from '../contexts/SupabaseContext';
import type { Database } from '../types/database';

// --- Co-located API Logic ---
// FIX: Typed the 'table' parameter to be a valid table name from the database schema to satisfy Supabase's typed client.
type TableName = keyof Database['public']['Tables'];

const fetchDashboardData = async (timeRange: number, biodigesterId: number) => {
    // FIX: Removed generic helper functions that were causing a "Type instantiation is excessively deep" error.
    // Replaced them with direct Supabase calls for clearer type inference.
    const [kpiResults, chartRes] = await Promise.all([
        Promise.all([
            supabase.from('energia').select('generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').order('fecha', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('analisis_fos_tac').select('relacion_fos_tac').eq('equipo_id', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('lecturas_gas').select('ch4_porcentaje').eq('equipo_id_fk', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
        ]),
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').gte('fecha', new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('fecha', { ascending: true }),
    ]);

    const kpiErrors: string[] = kpiResults.map((res, i) => res.error ? `KPI ${i}: ${res.error.message}` : '').filter(Boolean);
    if (chartRes.error) kpiErrors.push(`Chart: ${chartRes.error.message}`);
    if (kpiErrors.length > 0) throw new Error(kpiErrors.join('; '));

    const [energiaRes, fosTacRes, gasRes] = kpiResults;
    const kpiData = {
        generacion: ((energiaRes.data?.generacion_electrica_total_kwh_dia || 0) / 1000).toFixed(1),
        biogas: (energiaRes.data?.flujo_biogas_kg_dia || 0).toLocaleString('es-AR'),
        // FIX: Type inference is now correct after removing the problematic generic helper functions, resolving the property access errors.
        fosTac: (fosTacRes.data?.relacion_fos_tac || 0).toFixed(2),
        ch4: (gasRes.data?.ch4_porcentaje || 0).toFixed(1),
    };
    const chartData = (chartRes.data || []).map(d => ({
        name: format(new Date(d.fecha), 'dd/MM', { locale: es }),
        'Biogás (kg)': d.flujo_biogas_kg_dia || 0,
        'Electricidad (kWh)': d.generacion_electrica_total_kwh_dia || 0,
    }));

    return { kpiData, chartData };
};


// --- Co-located Component & Type Definition ---
export interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  trend: number; // percentage change, e.g., 5 for +5%, -2 for -2%
  icon: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, trend, icon }) => {
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'text-success' : 'text-error';

  return (
    <Card>
      <div className="flex items-center justify-between mb-2 p-4">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <div className="text-primary">{icon}</div>
      </div>
      <CardContent className="pt-0">
        <p className="text-3xl font-bold text-text-primary">
          {value}
          {unit && <span className="text-lg font-medium text-text-secondary ml-1">{unit}</span>}
        </p>
        <div className={`flex items-center text-sm font-medium ${trendColor}`}>
          {isPositive ? <ArrowUpIcon className="h-4 w-4 mr-1" aria-hidden="true" /> : <ArrowDownIcon className="h-4 w-4 mr-1" aria-hidden="true" />}
          <span className="sr-only">{isPositive ? 'Aumento del' : 'Disminución del'}</span>
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
};


// --- Feature Components ---

type PlantStatus = 'operational' | 'warning' | 'critical';

const PlantStatusCard: React.FC<{ status: PlantStatus; fosTac: number; ch4: number }> = ({ status, fosTac, ch4 }) => {
    const statusConfig = {
        operational: {
            icon: <CheckCircleIcon className="h-10 w-10 text-success" />,
            title: "Operacional",
            message: "Todos los sistemas funcionan correctamente.",
            bgColor: "bg-success-bg",
            textColor: "text-success",
            borderColor: "border-success",
        },
        warning: {
            icon: <ExclamationTriangleIcon className="h-10 w-10 text-warning" />,
            title: "Advertencia",
            message: `Revisar FOS/TAC (${fosTac.toFixed(2)}) o Nivel de CH4 (${ch4.toFixed(1)}%).`,
            bgColor: "bg-warning-bg",
            textColor: "text-warning",
            borderColor: "border-warning",
        },
        critical: {
            icon: <XCircleIcon className="h-10 w-10 text-error" />,
            title: "Crítico",
            message: `FOS/TAC (${fosTac.toFixed(2)}) fuera de los límites seguros.`,
            bgColor: "bg-error-bg",
            textColor: "text-error",
            borderColor: "border-error",
        },
    };

    const config = statusConfig[status];

    return (
        <Card className={`${config.bgColor} border-l-4 ${config.borderColor} shadow-md`}>
            <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                    <div>{config.icon}</div>
                    <div>
                        <h2 className={`text-lg font-bold ${config.textColor}`}>{config.title}</h2>
                        <p className={`text-sm ${config.textColor}`}>{config.message}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const TimeRangeButton: React.FC<{
    range: number;
    activeRange: number;
    setRange: (range: number) => void;
    children: React.ReactNode;
}> = ({ range, activeRange, setRange, children }) => (
    <button
        onClick={() => setRange(range)}
        className={cn(
            "px-3 py-1 text-sm font-medium rounded-md transition-colors",
            activeRange === range ? "bg-primary text-primary-contrast shadow-sm" : "text-text-secondary hover:bg-surface",
        )}
    >
        {children}
    </button>
);

const CustomizeDashboardModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { kpis, toggleKpi } = useDashboardStore();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Personalizar Dashboard</DialogTitle>
                </DialogHeader>
                <div className="p-6 pt-0 space-y-4">
                    <p className="text-sm text-text-secondary">Seleccione los indicadores clave que desea ver en su dashboard.</p>
                    {kpis.map((kpi) => (
                        <div key={kpi.id} className="flex items-center justify-between p-2 rounded-md bg-background">
                            <Label htmlFor={`kpi-toggle-${kpi.id}`}>{kpi.title}</Label>
                            <Switch
                                id={`kpi-toggle-${kpi.id}`}
                                checked={kpi.isVisible}
                                onCheckedChange={() => toggleKpi(kpi.id)}
                            />
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};


const HomePage: React.FC = () => {
  const themeColors = useThemeColors();
  const [timeRange, setTimeRange] = useState<number>(7);
  const { equipos } = useSupabaseData();
  const biodigestores = useMemo(() => equipos.filter(e => e.categoria?.toLowerCase().includes('biodigestor')), [equipos]);
  const [selectedBiodigesterId, setSelectedBiodigesterId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedBiodigesterId && biodigestores.length > 0) {
        setSelectedBiodigesterId(biodigestores[0].id);
    }
  }, [biodigestores, selectedBiodigesterId]);
  
  const { evaluateAlerts } = useZustandStore(customAlertsStore);
  const { kpis: dashboardKpis } = useDashboardStore();
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData', timeRange, selectedBiodigesterId],
    queryFn: () => fetchDashboardData(timeRange, selectedBiodigesterId!),
    enabled: !!selectedBiodigesterId,
  });

  useEffect(() => {
    if (data?.kpiData) {
        evaluateAlerts({
            fosTac: parseFloat(data.kpiData.fosTac),
            ch4: parseFloat(data.kpiData.ch4),
        });
    }
  }, [data, evaluateAlerts]);

  const { kpiData, chartData } = data || { kpiData: null, chartData: [] };

  const kpiDefinitions = useMemo<Record<string, KpiCardProps>>(() => ({
    generacion: { title: 'Generación Eléctrica', value: kpiData?.generacion || '...', unit: 'MWh', trend: 2.5, icon: <BoltIcon className="h-6 w-6" /> },
    biogas: { title: 'Producción Biogás', value: kpiData?.biogas || '...', unit: 'kg/d', trend: -1.2, icon: <FireIcon className="h-6 w-6" /> },
    fosTac: { title: 'FOS/TAC', value: kpiData?.fosTac || '...', trend: 5.0, icon: <BeakerIcon className="h-6 w-6" /> },
    ch4: { title: 'Calidad Gas (CH4)', value: kpiData?.ch4 || '...', unit: '%', trend: 0.5, icon: <AdjustmentsHorizontalIcon className="h-6 w-6" /> },
  }), [kpiData]);

  const visibleKpis = useMemo(() => 
    dashboardKpis.filter(k => k.isVisible).map(k => kpiDefinitions[k.id]),
  [dashboardKpis, kpiDefinitions]);

  const plantStatus: PlantStatus = useMemo(() => {
    if (!kpiData) return 'warning';
    const fosTac = parseFloat(kpiData.fosTac);
    const ch4 = parseFloat(kpiData.ch4);
    
    if (fosTac > 0.45) return 'critical';
    if (fosTac > 0.35 || ch4 < 52) return 'warning';
    return 'operational';
  }, [kpiData]);

  if (isLoading || !selectedBiodigesterId) {
    return <Page><Card><CardContent><p className="text-center text-text-secondary p-4">Cargando dashboard...</p></CardContent></Card></Page>
  }

  if (error) {
    return (
        <Page>
            <Card>
                <CardHeader>
                    <CardTitle className="text-error">Error al Cargar el Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-text-secondary">No se pudieron obtener los datos. Verifique la configuración de la base de datos y su conexión a internet.</p>
                    <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto whitespace-pre-wrap">{error.message}</pre>
                </CardContent>
            </Card>
        </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <PlantStatusCard 
                    status={plantStatus}
                    fosTac={parseFloat(kpiData?.fosTac || '0')}
                    ch4={parseFloat(kpiData?.ch4 || '0')}
                />
            </div>
            <div>
                <Label htmlFor="biodigester-select">Seleccionar Biodigestor</Label>
                <Select id="biodigester-select" value={selectedBiodigesterId ?? ''} onChange={e => setSelectedBiodigesterId(Number(e.target.value))}>
                    {biodigestores.map(b => (
                        <option key={b.id} value={b.id}>{b.nombre_equipo}</option>
                    ))}
                </Select>
                <p className="text-xs text-text-secondary mt-1">Los KPIs de proceso se actualizarán según su selección.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {visibleKpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </div>

        <div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <CardTitle>Producción Diaria</CardTitle>
                      <div className="flex items-center space-x-1 bg-background p-1 rounded-lg">
                          <TimeRangeButton range={7} activeRange={timeRange} setRange={setTimeRange}>7D</TimeRangeButton>
                          <TimeRangeButton range={14} activeRange={timeRange} setRange={setTimeRange}>14D</TimeRangeButton>
                          <TimeRangeButton range={30} activeRange={timeRange} setRange={setTimeRange}>30D</TimeRangeButton>
                          <Button variant="ghost" size="icon" onClick={() => setIsCustomizeModalOpen(true)} className="ml-2">
                              <Cog6ToothIcon className="h-5 w-5 text-text-secondary" />
                          </Button>
                      </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))"/>
                                <XAxis dataKey="name" stroke={themeColors.textSecondary} fontSize={12}/>
                                <YAxis stroke={themeColors.textSecondary} fontSize={12} />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(var(--color-surface), 0.8)',
                                        backdropFilter: 'blur(5px)',
                                        border: '1px solid rgb(var(--color-border))',
                                        borderRadius: '0.5rem',
                                        color: 'rgb(var(--color-text-primary))',
                                     }}
                                />
                                <Legend wrapperStyle={{fontSize: '14px', color: themeColors.textSecondary}}/>
                                <Bar dataKey="Biogás (kg)" fill={themeColors.secondary} name="Biogás" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Electricidad (kWh)" fill={themeColors.primary} name="Electricidad" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      <CustomizeDashboardModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} />
    </Page>
  );
};

export default HomePage;