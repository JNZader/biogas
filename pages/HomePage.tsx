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
import { BoltIcon, FireIcon, BeakerIcon, AdjustmentsHorizontalIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ArrowUpIcon, ArrowDownIcon, Cog6ToothIcon, CpuChipIcon, DocumentPlusIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
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
import { Link } from '@tanstack/react-router';

// --- Co-located API Logic ---
// FIX: Typed the 'table' parameter to be a valid table name from the database schema to satisfy Supabase's typed client.
type TableName = keyof Database['public']['Tables'];

const fetchDashboardData = async (timeRange: number, biodigesterId: number) => {
    // 1. Define date ranges for trend calculation
    const onePeriodAgoDate = new Date();
    onePeriodAgoDate.setDate(onePeriodAgoDate.getDate() - timeRange);
    const twoPeriodsAgoDate = new Date();
    twoPeriodsAgoDate.setDate(twoPeriodsAgoDate.getDate() - timeRange * 2);

    const onePeriodAgoISO = onePeriodAgoDate.toISOString();
    const twoPeriodsAgoISO = twoPeriodsAgoDate.toISOString();

    // 2. Fetch all data in parallel
    const [
        kpiResults,
        chartRes,
        energiaTrendRes,
        fosTacTrendRes,
        gasTrendRes
    ] = await Promise.all([
        // A. Latest KPI values for display
        Promise.all([
            supabase.from('energia').select('generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').order('fecha', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('analisis_fos_tac').select('relacion_fos_tac').eq('equipo_id', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('lecturas_gas').select('ch4_porcentaje').eq('equipo_id_fk', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
        ]),
        // B. Chart data for the current period
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').gte('fecha', onePeriodAgoDate.toISOString().split('T')[0]).order('fecha', { ascending: true }),
        // C. Data for trend calculation (last two periods)
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, flujo_biogas_kg_dia').gte('fecha', twoPeriodsAgoISO.split('T')[0]),
        supabase.from('analisis_fos_tac').select('fecha_hora, relacion_fos_tac').eq('equipo_id', biodigesterId).gte('fecha_hora', twoPeriodsAgoISO),
        supabase.from('lecturas_gas').select('fecha_hora, ch4_porcentaje').eq('equipo_id_fk', biodigesterId).gte('fecha_hora', twoPeriodsAgoISO),
    ]);

    // 3. Error handling
    const errors: string[] = kpiResults.map((res, i) => res.error ? `KPI ${i}: ${res.error.message}` : '').filter(Boolean);
    if (chartRes.error) errors.push(`Chart: ${chartRes.error.message}`);
    if (energiaTrendRes.error) errors.push(`Energia Trend: ${energiaTrendRes.error.message}`);
    if (fosTacTrendRes.error) errors.push(`FosTac Trend: ${fosTacTrendRes.error.message}`);
    if (gasTrendRes.error) errors.push(`Gas Trend: ${gasTrendRes.error.message}`);
    if (errors.length > 0) throw new Error(errors.join('; '));

    // 4. Process latest KPI values and chart data
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
    
    // 5. Calculate trends
    const calculateAverage = (data: any[] | null, key: string) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, item) => acc + (item[key] || 0), 0);
        return sum / data.length;
    };
    
    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0; // Avoid division by zero
        return ((current - previous) / previous) * 100;
    };

    // Split data into current and previous periods
    const currentEnergia = (energiaTrendRes.data || []).filter(d => new Date(d.fecha) >= onePeriodAgoDate);
    const previousEnergia = (energiaTrendRes.data || []).filter(d => new Date(d.fecha) < onePeriodAgoDate);
    
    const currentFosTac = (fosTacTrendRes.data || []).filter(d => new Date(d.fecha_hora) >= onePeriodAgoDate);
    const previousFosTac = (fosTacTrendRes.data || []).filter(d => new Date(d.fecha_hora) < onePeriodAgoDate);

    const currentGas = (gasTrendRes.data || []).filter(d => new Date(d.fecha_hora) >= onePeriodAgoDate);
    const previousGas = (gasTrendRes.data || []).filter(d => new Date(d.fecha_hora) < onePeriodAgoDate);
    
    // Calculate and format trends
    const trendData = {
        generacion: calculateTrend(
            calculateAverage(currentEnergia, 'generacion_electrica_total_kwh_dia'),
            calculateAverage(previousEnergia, 'generacion_electrica_total_kwh_dia')
        ),
        biogas: calculateTrend(
            calculateAverage(currentEnergia, 'flujo_biogas_kg_dia'),
            calculateAverage(previousEnergia, 'flujo_biogas_kg_dia')
        ),
        fosTac: calculateTrend(
            calculateAverage(currentFosTac, 'relacion_fos_tac'),
            calculateAverage(previousFosTac, 'relacion_fos_tac')
        ),
        ch4: calculateTrend(
            calculateAverage(currentGas, 'ch4_porcentaje'),
            calculateAverage(previousGas, 'ch4_porcentaje')
        ),
    };

    return { kpiData, chartData, trendData };
};


// --- Co-located Component & Type Definition ---
export interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  trend: number; // percentage change, e.g., 5 for +5%, -2 for -2%
  icon: React.ReactNode;
  to: string; // The destination path for navigation
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, trend, icon, to }) => {
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'text-success' : 'text-error';

  return (
    <Link to={to} className="block">
      <Card className="h-full transition-shadow duration-200 hover:shadow-lg hover:border-primary/30">
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
            <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
          </div>
        </CardContent>
      </Card>
    </Link>
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

const ActionButton: React.FC<{ to: string; icon: React.ReactNode; label: string; description: string }> = ({ to, icon, label, description }) => (
    <Link to={to} className="group flex flex-col items-center justify-center p-4 bg-background rounded-lg text-center transition-all duration-200 hover:bg-primary/10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        <div className="p-3 bg-primary/20 rounded-full text-primary transition-colors group-hover:bg-primary group-hover:text-primary-contrast">
            {icon}
        </div>
        <h3 className="mt-2 font-semibold text-text-primary">{label}</h3>
        <p className="text-xs text-text-secondary">{description}</p>
    </Link>
);

const QuickActionsCard: React.FC = () => {
    const iconClass = "h-6 w-6";
    const actions = [
        { to: '/feeding', icon: <CpuChipIcon className={iconClass} />, label: 'Alimentación', description: 'Registrar la dieta diaria' },
        { to: '/inputs', icon: <DocumentPlusIcon className={iconClass} />, label: 'Ingresos', description: 'Anotar entrada de sustrato' },
        { to: '/gas-quality', icon: <FireIcon className={iconClass} />, label: 'Calidad de Gas', description: 'Mediciones del analizador' },
        { to: '/maintenance', icon: <WrenchScrewdriverIcon className={iconClass} />, label: 'Mantenimiento', description: 'Ver checklist y tareas' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Acciones Frecuentes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {actions.map(action => <ActionButton key={action.to} {...action} />)}
                </div>
            </CardContent>
        </Card>
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

  const { kpiData, chartData, trendData } = data || { kpiData: null, chartData: [], trendData: null };

  const kpiDefinitions = useMemo<Record<string, KpiCardProps>>(() => ({
    generacion: { title: 'Generación Eléctrica', value: kpiData?.generacion || '...', unit: 'MWh', trend: trendData?.generacion ?? 0, icon: <BoltIcon className="h-6 w-6" />, to: '/energy' },
    biogas: { title: 'Producción Biogás', value: kpiData?.biogas || '...', unit: 'kg/d', trend: trendData?.biogas ?? 0, icon: <FireIcon className="h-6 w-6" />, to: '/gas-quality' },
    fosTac: { title: 'FOS/TAC', value: kpiData?.fosTac || '...', trend: trendData?.fosTac ?? 0, icon: <BeakerIcon className="h-6 w-6" />, to: '/pfq' },
    ch4: { title: 'Calidad Gas (CH4)', value: kpiData?.ch4 || '...', unit: '%', trend: trendData?.ch4 ?? 0, icon: <AdjustmentsHorizontalIcon className="h-6 w-6" />, to: '/gas-quality' },
  }), [kpiData, trendData]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
                <PlantStatusCard 
                    status={plantStatus}
                    fosTac={parseFloat(kpiData?.fosTac || '0')}
                    ch4={parseFloat(kpiData?.ch4 || '0')}
                />
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-grow">
                    <Label htmlFor="biodigester-select">Seleccionar Biodigestor</Label>
                    <Select id="biodigester-select" value={selectedBiodigesterId ?? ''} onChange={e => setSelectedBiodigesterId(Number(e.target.value))}>
                        {biodigestores.map(b => (
                            <option key={b.id} value={b.id}>{b.nombre_equipo}</option>
                        ))}
                    </Select>
                </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsCustomizeModalOpen(true)} className="flex-shrink-0 mt-auto" aria-label="Personalizar KPIs">
                    <Cog6ToothIcon className="h-6 w-6 text-text-secondary" />
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {visibleKpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </div>

        <div>
           <QuickActionsCard />
        </div>
      </div>
      <CustomizeDashboardModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} />
    </Page>
  );
};

export default HomePage;