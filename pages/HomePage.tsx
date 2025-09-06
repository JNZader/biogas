import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Switch } from '../components/ui/Switch';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { Button } from '../components/ui/Button';
import Page from '../components/Page';
import { BoltIcon, FireIcon, BeakerIcon, AdjustmentsHorizontalIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ArrowUpIcon, ArrowDownIcon, Cog6ToothIcon, WrenchScrewdriverIcon, AcademicCapIcon, ExclamationCircleIcon, LightBulbIcon, SunIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { supabase } from '../services/supabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { cn } from '../lib/utils';
import { useStore as useZustandStore } from 'zustand';
import { customAlertsStore } from '../stores/customAlertsStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSupabaseData } from '../contexts/SupabaseContext';
import type { Database } from '../types/database';
import { Link } from '@tanstack/react-router';

// --- Co-located API Logic ---
const fetchDashboardData = async (selectedDate: string, biodigesterId: number) => {
    const currentDate = new Date(selectedDate + 'T00:00:00');
    const previousDate = subDays(currentDate, 1);
    
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    const previousDateStr = format(previousDate, 'yyyy-MM-dd');
    const endOfCurrentDay = endOfDay(currentDate).toISOString();
    const startOfCurrentDay = startOfDay(currentDate).toISOString();

    const [
        currentEnergiaRes, prevEnergiaRes,
        currentFosTacRes, prevFosTacRes,
        currentGasRes, prevGasRes,
        pendingMaintenanceRes, completedMaintenanceRes,
        chpChangesRes, recentObservationsRes
    ] = await Promise.all([
        // Plant KPIs
        supabase.from('energia').select('*').eq('fecha', currentDateStr).maybeSingle(),
        supabase.from('energia').select('*').eq('fecha', previousDateStr).maybeSingle(),
        // Biodigester KPIs
        supabase.from('analisis_fos_tac').select('*').eq('equipo_id', biodigesterId).lte('fecha_hora', endOfCurrentDay).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('analisis_fos_tac').select('*').eq('equipo_id', biodigesterId).lt('fecha_hora', startOfCurrentDay).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('lecturas_gas').select('*').eq('equipo_id_fk', biodigesterId).lte('fecha_hora', endOfCurrentDay).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('lecturas_gas').select('*').eq('equipo_id_fk', biodigesterId).lt('fecha_hora', startOfCurrentDay).order('fecha_hora', { ascending: false }).limit(1).maybeSingle(),
        // Summary Cards Data
        supabase.from('mantenimiento_eventos').select('*, equipos(nombre_equipo)').is('fecha_fin', null).order('fecha_planificada', { ascending: true }).limit(5),
        supabase.from('mantenimiento_eventos').select('*, equipos(nombre_equipo)').not('fecha_fin', 'is', null).order('fecha_fin', { ascending: false }).limit(5),
        supabase.from('cambios_potencia_chp').select('*').order('fecha_hora', { ascending: false }).limit(5),
        supabase.from('checklist_registros').select('id, observaciones, fecha_verificacion, checklist_items ( descripcion_item )').not('observaciones', 'is', null).order('fecha_verificacion', { ascending: false }).limit(5)
    ]);

    const errors: string[] = [
      currentEnergiaRes.error, prevEnergiaRes.error, currentFosTacRes.error, prevFosTacRes.error,
      currentGasRes.error, prevGasRes.error, pendingMaintenanceRes.error, completedMaintenanceRes.error, chpChangesRes.error, recentObservationsRes.error
    ].filter(Boolean).map(e => e!.message);
    if (errors.length > 0) throw new Error(errors.join('; '));

    const calculateTrend = (current: number | null | undefined, previous: number | null | undefined) => {
        const c = current || 0;
        const p = previous || 0;
        if (p === 0) return c > 0 ? 100 : 0;
        return ((c - p) / p) * 100;
    };

    const biogasKg = currentEnergiaRes.data?.flujo_biogas_kg_dia || 0;
    const energiaKwh = currentEnergiaRes.data?.generacion_electrica_total_kwh_dia || 0;
    const consumoChp = (energiaKwh > 0) ? (biogasKg * 0.8) / (energiaKwh / 1000) : 0;

    const kpiData = {
        generacion: (energiaKwh / 1000).toFixed(1),
        biogas: biogasKg.toLocaleString('es-AR'),
        consumoChp: consumoChp.toFixed(2),
        fosTac: (currentFosTacRes.data?.relacion_fos_tac || 0).toFixed(2),
        ch4: (currentGasRes.data?.ch4_porcentaje || 0).toFixed(1),
        fos: (currentFosTacRes.data?.fos_mg_l || 0).toFixed(1),
        tac: (currentFosTacRes.data?.tac_mg_l || 0).toFixed(1),
        ph: (currentFosTacRes.data?.ph || 0).toFixed(2),
        temperatura: (currentGasRes.data?.temperatura_c || 0).toFixed(1),
        h2s: (currentGasRes.data?.h2s_ppm || 0).toFixed(0),
    };

    const prevBiogasKg = prevEnergiaRes.data?.flujo_biogas_kg_dia || 0;
    const prevEnergiaKwh = prevEnergiaRes.data?.generacion_electrica_total_kwh_dia || 0;
    const prevConsumoChp = (prevEnergiaKwh > 0) ? (prevBiogasKg * 0.8) / (prevEnergiaKwh / 1000) : 0;

    const trendData = {
        generacion: calculateTrend(energiaKwh, prevEnergiaKwh),
        biogas: calculateTrend(biogasKg, prevBiogasKg),
        consumoChp: calculateTrend(consumoChp, prevConsumoChp),
        fosTac: calculateTrend(currentFosTacRes.data?.relacion_fos_tac, prevFosTacRes.data?.relacion_fos_tac),
        ch4: calculateTrend(currentGasRes.data?.ch4_porcentaje, prevGasRes.data?.ch4_porcentaje),
        fos: calculateTrend(currentFosTacRes.data?.fos_mg_l, prevFosTacRes.data?.fos_mg_l),
        tac: calculateTrend(currentFosTacRes.data?.tac_mg_l, prevFosTacRes.data?.tac_mg_l),
        ph: calculateTrend(currentFosTacRes.data?.ph, prevFosTacRes.data?.ph),
        temperatura: calculateTrend(currentGasRes.data?.temperatura_c, prevGasRes.data?.temperatura_c),
        h2s: calculateTrend(currentGasRes.data?.h2s_ppm, prevGasRes.data?.h2s_ppm),
    };
    
    return { 
        kpiData, 
        trendData,
        maintenance: { pending: pendingMaintenanceRes.data, completed: completedMaintenanceRes.data },
        chpChanges: chpChangesRes.data,
        recentObservations: recentObservationsRes.data
    };
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
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
          <div className="text-primary">{icon}</div>
        </div>
        <CardContent className="pt-2">
          <p className="text-3xl font-bold text-text-primary">
            {value}
            {unit && <span className="text-lg font-medium text-text-secondary ml-1">{unit}</span>}
          </p>
          <div className={`flex items-center text-sm font-medium ${trendColor}`}>
            {isPositive ? <ArrowUpIcon className="h-4 w-4 mr-1" aria-hidden="true" /> : <ArrowDownIcon className="h-4 w-4 mr-1" aria-hidden="true" />}
            <span className="sr-only">{isPositive ? 'Aumento del' : 'Disminución del'}</span>
            <span>{Math.abs(trend).toFixed(1)}% vs día anterior</span>
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
        operational: { icon: <CheckCircleIcon className="h-10 w-10 text-success" />, title: "Operacional", message: "Todos los sistemas funcionan correctamente.", bgColor: "bg-success-bg", textColor: "text-success", borderColor: "border-success" },
        warning: { icon: <ExclamationTriangleIcon className="h-10 w-10 text-warning" />, title: "Advertencia", message: `Revisar FOS/TAC (${fosTac.toFixed(2)}) o Nivel de CH4 (${ch4.toFixed(1)}%).`, bgColor: "bg-warning-bg", textColor: "text-warning", borderColor: "border-warning" },
        critical: { icon: <XCircleIcon className="h-10 w-10 text-error" />, title: "Crítico", message: `FOS/TAC (${fosTac.toFixed(2)}) fuera de límites. Click para ver detalles y resolver.`, bgColor: "bg-error-bg", textColor: "text-error", borderColor: "border-error" },
    };
    const config = statusConfig[status];

    return (
        <Link to="/alarms" className="block transition-transform hover:scale-[1.02]">
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
        </Link>
    );
};

const CustomizeDashboardModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { kpis, toggleKpi } = useDashboardStore();
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Personalizar Dashboard</DialogTitle></DialogHeader>
                <div className="p-6 pt-0 space-y-4">
                    <p className="text-sm text-text-secondary">Seleccione los indicadores clave que desea ver en su dashboard.</p>
                    {kpis.map((kpi) => (
                        <div key={kpi.id} className="flex items-center justify-between p-2 rounded-md bg-background">
                            <Label htmlFor={`kpi-toggle-${kpi.id}`}>{kpi.title}</Label>
                            <Switch id={`kpi-toggle-${kpi.id}`} checked={kpi.isVisible} onCheckedChange={() => toggleKpi(kpi.id)}/>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const MaintenanceSummaryCard: React.FC<{ pending: any[], completed: any[] }> = ({ pending, completed }) => (
    <Card>
        <CardHeader><CardTitle>Resumen de Mantenimiento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="text-md font-semibold text-text-primary mb-2 flex items-center gap-2"><ExclamationCircleIcon className="h-5 w-5 text-warning"/> Tareas Pendientes</h3>
                {pending.length > 0 ? (
                    <ul className="space-y-2 text-sm">{pending.map(task => (
                        <li key={task.id} className="p-2 bg-background rounded-md"><Link to="/maintenance" className="hover:underline">{task.equipos?.nombre_equipo}: {task.descripcion_problema}</Link></li>
                    ))}</ul>
                ) : <p className="text-sm text-text-secondary">No hay tareas pendientes.</p>}
            </div>
            <div>
                <h3 className="text-md font-semibold text-text-primary mb-2 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-success"/> Últimas Tareas Realizadas</h3>
                {completed.length > 0 ? (
                    <ul className="space-y-2 text-sm">{completed.map(task => (
                        <li key={task.id} className="p-2 bg-background rounded-md"><Link to="/maintenance" className="hover:underline">{task.equipos?.nombre_equipo}: {task.descripcion_problema}</Link></li>
                    ))}</ul>
                ) : <p className="text-sm text-text-secondary">No hay tareas completadas recientemente.</p>}
            </div>
        </CardContent>
    </Card>
);

const ChpSummaryCard: React.FC<{ changes: any[] }> = ({ changes }) => (
    <Card>
        <CardHeader><CardTitle>Últimos Cambios de Potencia (CHP)</CardTitle></CardHeader>
        <CardContent>
            {changes.length > 0 ? (
                <ul className="space-y-3">{changes.map(change => (
                    <li key={change.id} className="text-sm p-2 bg-background rounded-md">
                        <Link to="/chp" className="hover:underline">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{change.motivo_cambio}</span>
                                <span className="text-xs text-text-secondary">{format(new Date(change.fecha_hora), 'dd/MM/yy HH:mm')}</span>
                            </div>
                            <p>Cambio de {change.potencia_inicial_kw}kW a {change.potencia_programada_kw}kW</p>
                        </Link>
                    </li>
                ))}</ul>
            ) : <p className="text-sm text-text-secondary">No se registraron cambios de potencia recientes.</p>}
        </CardContent>
    </Card>
);

const ShiftObservationsCard: React.FC<{ observations: any[] }> = ({ observations }) => {
    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-primary" /> Novedades del Último Turno</CardTitle></CardHeader>
            <CardContent>
                {observations.length > 0 ? (
                    <ul className="space-y-3">
                        {observations.map(obs => (
                            <li key={obs.id} className="text-sm p-2 bg-background rounded-md">
                                <p className="font-semibold text-text-primary">
                                  {(obs as any).checklist_items?.descripcion_item || 'Observación General'}
                                </p>
                                <p className="italic text-text-secondary">"{obs.observaciones}"</p>
                                <p className="text-xs text-right text-text-secondary/80 mt-1">{new Date(obs.fecha_verificacion).toLocaleString('es-AR')}</p>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-text-secondary">No hay observaciones recientes en el checklist.</p>}
            </CardContent>
        </Card>
    );
};

const HomePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
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
    queryKey: ['dashboardData', selectedDate, selectedBiodigesterId],
    queryFn: () => fetchDashboardData(selectedDate, selectedBiodigesterId!),
    enabled: !!selectedBiodigesterId,
  });

  useEffect(() => {
    if (data?.kpiData) {
        evaluateAlerts({ fosTac: parseFloat(data.kpiData.fosTac), ch4: parseFloat(data.kpiData.ch4) });
    }
  }, [data, evaluateAlerts]);

  const { kpiData, trendData, maintenance, chpChanges, recentObservations } = data || {};

  const kpiDefinitions = useMemo<Record<string, KpiCardProps>>(() => ({
    generacion: { title: 'Generación Eléctrica', value: kpiData?.generacion || '...', unit: 'MWh', trend: trendData?.generacion ?? 0, icon: <BoltIcon className="h-6 w-6" />, to: '/energy' },
    biogas: { title: 'Producción Biogás', value: kpiData?.biogas || '...', unit: 'kg/d', trend: trendData?.biogas ?? 0, icon: <FireIcon className="h-6 w-6" />, to: '/gas-quality' },
    consumoChp: { title: 'Consumo Específico CHP', value: kpiData?.consumoChp || '...', unit: 'm³/MWh', trend: trendData?.consumoChp ?? 0, icon: <LightBulbIcon className="h-6 w-6" />, to: '/chp' },
    fosTac: { title: 'Relación FOS/TAC', value: kpiData?.fosTac || '...', trend: trendData?.fosTac ?? 0, icon: <BeakerIcon className="h-6 w-6" />, to: '/pfq' },
    ch4: { title: 'Calidad Gas (CH4)', value: kpiData?.ch4 || '...', unit: '%', trend: trendData?.ch4 ?? 0, icon: <AdjustmentsHorizontalIcon className="h-6 w-6" />, to: '/gas-quality' },
    fos: { title: 'FOS', value: kpiData?.fos || '...', unit: 'mg/L', trend: trendData?.fos ?? 0, icon: <AcademicCapIcon className="h-6 w-6" />, to: '/pfq' },
    tac: { title: 'TAC', value: kpiData?.tac || '...', unit: 'mg/L', trend: trendData?.tac ?? 0, icon: <AcademicCapIcon className="h-6 w-6" />, to: '/pfq' },
    ph: { title: 'pH Digestor', value: kpiData?.ph || '...', trend: trendData?.ph ?? 0, icon: <BeakerIcon className="h-6 w-6" />, to: '/pfq' },
    temperatura: { title: 'Temp. Digestor', value: kpiData?.temperatura || '...', unit: '°C', trend: trendData?.temperatura ?? 0, icon: <SunIcon className="h-6 w-6" />, to: '/gas-quality' },
    h2s: { title: 'H₂S Biogás', value: kpiData?.h2s || '...', unit: 'ppm', trend: trendData?.h2s ?? 0, icon: <ExclamationTriangleIcon className="h-6 w-6" />, to: '/gas-quality' },
  }), [kpiData, trendData]);

  // FIX: Include the `id` in the mapped `visibleKpis` object so it can be used for filtering.
  const visibleKpis = useMemo(() => 
    dashboardKpis.filter(k => k.isVisible).map(k => ({ ...kpiDefinitions[k.id], id: k.id })),
  [dashboardKpis, kpiDefinitions]);
  
  const plantKpis = useMemo(() => visibleKpis.filter(k => ['generacion', 'biogas', 'consumoChp'].includes(k.id)), [visibleKpis]);
  const digesterKpis = useMemo(() => visibleKpis.filter(k => !['generacion', 'biogas', 'consumoChp'].includes(k.id)), [visibleKpis]);

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
    return <Page><Card><CardHeader><CardTitle className="text-error">Error al Cargar el Dashboard</CardTitle></CardHeader><CardContent><p className="text-text-secondary">No se pudieron obtener los datos. Verifique su conexión a internet.</p><pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto whitespace-pre-wrap">{error.message}</pre></CardContent></Card></Page>;
  }

  return (
    <Page>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
                <PlantStatusCard status={plantStatus} fosTac={parseFloat(kpiData?.fosTac || '0')} ch4={parseFloat(kpiData?.ch4 || '0')}/>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-grow">
                    <Label htmlFor="date-select">Fecha</Label>
                    <Input id="date-select" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsCustomizeModalOpen(true)} className="flex-shrink-0 mt-auto" aria-label="Personalizar KPIs"><Cog6ToothIcon className="h-6 w-6 text-text-secondary" /></Button>
            </div>
        </div>

        <ShiftObservationsCard observations={recentObservations || []} />

        <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Indicadores de Planta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {plantKpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
            </div>
        </div>
        
        <div>
            <div className="flex items-center gap-4 mb-2">
                <h2 className="text-lg font-semibold text-text-primary">Indicadores de Biodigestor</h2>
                <div className="flex-grow max-w-xs">
                    <Select id="biodigester-select" value={selectedBiodigesterId ?? ''} onChange={e => setSelectedBiodigesterId(Number(e.target.value))}>
                        {biodigestores.map(b => <option key={b.id} value={b.id}>{b.nombre_equipo}</option>)}
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {digesterKpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
            </div>
        </div>

        <div className="space-y-6">
            <MaintenanceSummaryCard pending={maintenance?.pending || []} completed={maintenance?.completed || []} />
            <ChpSummaryCard changes={chpChanges || []} />
        </div>
      </div>
      <CustomizeDashboardModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} />
    </Page>
  );
};

export default HomePage;
