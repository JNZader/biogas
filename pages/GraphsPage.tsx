import React, { useMemo, useState } from 'react';
// FIX: Removed non-existent 'StackedCarousel' from 'recharts' import.
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar, AreaChart, Area, ReferenceLine } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Page from '../components/Page';
import { useThemeColors } from '../stores/useThemeColors';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { format, parseISO } from 'date-fns';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { useAuthorization } from '../hooks/useAuthorization';
import { cn } from '../lib/utils';


// --- Co-located API Logic ---
const fetchGraphData = async (biodigesterId: number, timeRange: number) => {
    const timeRangeAgo = new Date();
    timeRangeAgo.setDate(timeRangeAgo.getDate() - timeRange);
    const timeRangeAgoISO = timeRangeAgo.toISOString();

    const [fosTacRes, gasRes, substrateRes, energyRes, gasHistoryRes] = await Promise.all([
        supabase.from('analisis_fos_tac').select('fecha_hora, fos_mg_l, tac_mg_l, relacion_fos_tac').eq('equipo_id', biodigesterId).not('relacion_fos_tac', 'is', null).gte('fecha_hora', timeRangeAgoISO).order('fecha_hora', { ascending: true }),
        supabase.from('lecturas_gas').select('ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm').eq('equipo_id_fk', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).single(),
        supabase.from('detalle_ingreso_sustrato').select('created_at, cantidad_kg, sustratos ( nombre )').gte('created_at', timeRangeAgoISO),
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, autoconsumo_porcentaje, horas_funcionamiento_motor_chp_dia').gte('fecha', timeRangeAgoISO).order('fecha', { ascending: true }),
        supabase.from('lecturas_gas').select('fecha_hora, ch4_porcentaje, co2_porcentaje, h2s_ppm').eq('equipo_id_fk', biodigesterId).gte('fecha_hora', timeRangeAgoISO).order('fecha_hora', { ascending: true })
    ]);

    if (fosTacRes.error) throw new Error(`FOS/TAC: ${fosTacRes.error.message}`);
    if (gasRes.error && gasRes.error.code !== 'PGRST116') throw new Error(`Gas (single): ${gasRes.error.message}`);
    if (gasHistoryRes.error) throw new Error(`Gas (history): ${gasHistoryRes.error.message}`);
    if (substrateRes.error) throw new Error(`Substrate: ${substrateRes.error.message}`);
    if (energyRes.error) throw new Error(`Energy: ${energyRes.error.message}`);

    return { fosTacData: fosTacRes.data, gasData: gasRes.data, substrateData: substrateRes.data, energyData: energyRes.data, gasHistoryData: gasHistoryRes.data };
};

// --- Co-located Type Definitions ---
interface GasCompositionData { name: string; value: number; }
interface SubstrateMixData { name: string; value: number; }
interface PieLabelRenderProps { cx: number; cy: number; midAngle?: number; innerRadius: number; outerRadius: number; percent?: number; index?: number; }
type RawSubstrateItem = { created_at: string; cantidad_kg: number; sustratos: { nombre: string; } | null; };

// --- Co-located Components ---
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

const TimeRangeButton: React.FC<{ range: number; activeRange: number; setRange: (range: number) => void; children: React.ReactNode; }> = ({ range, activeRange, setRange, children }) => (
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

const KpiCard: React.FC<{ title: string; value: string; unit?: string; }> = ({ title, value, unit }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold text-text-primary">
                {value}
                {unit && <span className="text-lg font-medium text-text-secondary ml-1">{unit}</span>}
            </p>
        </CardContent>
    </Card>
);

const GraphsPage: React.FC = () => {
    const themeColors = useThemeColors();
    const { equipos } = useSupabaseData();
    const biodigestores = useMemo(() => equipos.filter(e => e.categoria?.toLowerCase().includes('biodigestor')), [equipos]);
    const [selectedBiodigesterId, setSelectedBiodigesterId] = React.useState<number | null>(null);
    const [timeRange, setTimeRange] = useState<number>(30);

    const { role, isLoading: isAuthLoading } = useAuthorization();
    const [view, setView] = useState<'operativa' | 'gerencial'>('operativa');

    React.useEffect(() => {
        if (!selectedBiodigesterId && biodigestores.length > 0) {
            setSelectedBiodigesterId(biodigestores[0].id);
        }
    }, [biodigestores, selectedBiodigesterId]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['graphData', selectedBiodigesterId, timeRange],
        queryFn: () => fetchGraphData(selectedBiodigesterId!, timeRange),
        enabled: !!selectedBiodigesterId,
    });

    const memoizedData = useMemo(() => {
        if (!data) return { 
            fosTacData: [], gasCompositionData: [], substrateMixData: [], 
            energyProductionData: [], biogasQualityData: [], chpUptimeData: [], 
            kpiData: null, productionEfficiencyData: [], fosTacRatioData: [], methaneTrendData: [],
            dailySubstrateData: [], chpDailyUptimeData: [], biogasCompositionRatioData: [], h2sTrendData: [], dietEvolutionData: [],
// FIX: Added 'totalSubstrateMix' to the default returned object to prevent access errors on the initial render.
            totalSubstrateMix: {}
        };

        const formattedFosTac = (data.fosTacData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM'), FOS: d.fos_mg_l, TAC: d.tac_mg_l, Ratio: d.relacion_fos_tac
        }));
        
        let formattedGas: GasCompositionData[] = [];
        if (data.gasData) {
            const { ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm } = data.gasData;
            const h2s_percentage = h2s_ppm ? (h2s_ppm / 10000) : 0;
            formattedGas = [
                { name: 'CH4', value: ch4_porcentaje || 0 }, { name: 'CO2', value: co2_porcentaje || 0 },
                { name: 'O2', value: o2_porcentaje || 0 }, { name: 'H2S', value: h2s_percentage },
            ];
            const knownGasSum = formattedGas.reduce((acc, curr) => acc + curr.value, 0);
            const otherGases = Math.max(0, 100 - knownGasSum);
            if (otherGases > 0.1) formattedGas.push({ name: 'Otros', value: parseFloat(otherGases.toFixed(2)) });
        }
        
        const totalSubstrateMix: { [key: string]: number } = {};
        (data.substrateData as RawSubstrateItem[] | null || []).forEach((item) => {
            if (item.sustratos) {
                const name = item.sustratos.nombre;
                totalSubstrateMix[name] = (totalSubstrateMix[name] || 0) + item.cantidad_kg;
            }
        });
        const formattedSubstrateMix: SubstrateMixData[] = Object.entries(totalSubstrateMix).map(([name, value]) => ({ name, value }));
        
        let totalEnergyKWh = 0;
        let totalChpHours = 0;
        const formattedEnergy = (data.energyData || []).map(d => {
            const total = d.generacion_electrica_total_kwh_dia || 0;
            totalEnergyKWh += total;
            totalChpHours += d.horas_funcionamiento_motor_chp_dia || 0;
            const autoconsumoPerc = d.autoconsumo_porcentaje || 0;
            const autoconsumo = total * (autoconsumoPerc / 100);
            const exportada = total - autoconsumo;
            return {
                date: format(new Date(d.fecha + "T00:00:00"), 'dd/MM'),
                'Energía Exportada': parseFloat(exportada.toFixed(1)),
                'Autoconsumo': parseFloat(autoconsumo.toFixed(1)),
                'Producción Total': total
            };
        });

        const formattedBiogasQuality = (data.gasHistoryData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'),
            'CH4 (%)': d.ch4_porcentaje,
            'CO2 (%)': d.co2_porcentaje,
            'H2S (ppm)': d.h2s_ppm,
        }));
        
        const formattedChpUptime = (data.energyData || []).map(d => ({
            date: format(new Date(d.fecha + "T00:00:00"), 'dd/MM'),
            'Horas de Funcionamiento': d.horas_funcionamiento_motor_chp_dia,
        }));
        
        const avgCh4 = data.gasHistoryData && data.gasHistoryData.length > 0
            ? data.gasHistoryData.reduce((sum, d) => sum + (d.ch4_porcentaje || 0), 0) / data.gasHistoryData.length
            : 0;
        
        const dailyData: Record<string, { energy: number, substrate: number }> = {};
        (data.energyData || []).forEach(e => {
            const dateStr = e.fecha;
            dailyData[dateStr] = { ...dailyData[dateStr], energy: e.generacion_electrica_total_kwh_dia || 0, substrate: 0 };
        });
        (data.substrateData as RawSubstrateItem[] || []).forEach(s => {
            const dateStr = s.created_at.split('T')[0];
            if (!dailyData[dateStr]) dailyData[dateStr] = { energy: 0, substrate: 0 };
            dailyData[dateStr].substrate = (dailyData[dateStr].substrate || 0) + s.cantidad_kg;
        });

        const formattedProductionEfficiency = Object.entries(dailyData)
            .map(([date, values]) => {
                if (values.substrate > 0 && values.energy > 0) {
                    const efficiency = values.energy / (values.substrate / 1000); // kWh per ton
                    return {
                        date: format(new Date(date + "T00:00:00"), 'dd/MM'),
                        'Eficiencia (kWh/t)': parseFloat(efficiency.toFixed(1)),
                    };
                }
                return null;
            })
            .filter((d): d is { date: string; 'Eficiencia (kWh/t)': number } => d !== null)
            .sort((a,b) => a.date.localeCompare(b.date));

        const totalSubstrateKg = Object.values(dailyData).reduce((sum, d) => sum + d.substrate, 0);
        const totalSubstrateTon = totalSubstrateKg / 1000;
        const efficiencyKwhPerTon = totalSubstrateTon > 0 ? totalEnergyKWh / totalSubstrateTon : 0;
        const chpUptimePercentage = timeRange > 0 ? (totalChpHours / (timeRange * 24)) * 100 : 0;
        
        const calculatedKpiData = {
            totalEnergyMWh: (totalEnergyKWh / 1000).toFixed(1),
            efficiency: efficiencyKwhPerTon.toFixed(0),
            avgCh4: avgCh4.toFixed(1),
            chpUptime: chpUptimePercentage,
        };
        
        const formattedFosTacRatio = formattedFosTac.map(d => ({ date: d.date, Ratio: d.Ratio }));
        const formattedMethaneTrend = (data.gasHistoryData || []).map(d => ({ date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'), 'CH4 (%)': d.ch4_porcentaje, }));

        const formattedDailySubstrate = Object.entries(dailyData)
            .map(([date, values]) => ({
                date: format(new Date(date + "T00:00:00"), 'dd/MM'),
                'Sustrato (t)': parseFloat((values.substrate / 1000).toFixed(1)),
            }))
            .sort((a,b) => a.date.localeCompare(b.date));
        
        const formattedBiogasCompositionRatio = (data.gasHistoryData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'),
            CH4: d.ch4_porcentaje || 0,
            CO2: d.co2_porcentaje || 0,
        }));
        
        const formattedH2STrend = (data.gasHistoryData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'),
            'H2S (ppm)': d.h2s_ppm,
        }));
        
        const dailyMix: Record<string, Record<string, number>> = {};
        (data.substrateData as RawSubstrateItem[] | null || []).forEach((item) => {
            if (item.sustratos) {
                const dateStr = item.created_at.split('T')[0];
                if (!dailyMix[dateStr]) {
                    dailyMix[dateStr] = {};
                }
                const name = item.sustratos.nombre;
                dailyMix[dateStr][name] = (dailyMix[dateStr][name] || 0) + item.cantidad_kg;
            }
        });
        const formattedDietEvolution = Object.entries(dailyMix)
            .map(([date, substrates]) => {
                const entry: Record<string, any> = { date: format(new Date(date + "T00:00:00"), 'dd/MM') };
                for (const [name, qty] of Object.entries(substrates)) {
                    entry[name] = parseFloat((qty / 1000).toFixed(1)); // tons
                }
                return entry;
            })
            .sort((a,b) => a.date.localeCompare(b.date));


        return { 
            fosTacData: formattedFosTac, gasCompositionData: formattedGas, substrateMixData: formattedSubstrateMix, 
            energyProductionData: formattedEnergy, biogasQualityData: formattedBiogasQuality, chpUptimeData: formattedChpUptime, 
            kpiData: calculatedKpiData, productionEfficiencyData: formattedProductionEfficiency, fosTacRatioData: formattedFosTacRatio,
            methaneTrendData: formattedMethaneTrend, dailySubstrateData: formattedDailySubstrate, chpDailyUptimeData: formattedChpUptime,
            biogasCompositionRatioData: formattedBiogasCompositionRatio, h2sTrendData: formattedH2STrend, dietEvolutionData: formattedDietEvolution,
// FIX: Added 'totalSubstrateMix' to the returned object, making it accessible outside the 'useMemo' hook.
            totalSubstrateMix
        };
    }, [data, timeRange]);
    
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = role === 'Admin';
    const isOperator = role === 'Operador';
    const showOperativa = isOperator || (isSuperAdmin && view === 'operativa');
    const showGerencial = isAdmin || (isSuperAdmin && view === 'gerencial');

    const renderChartOrMessage = (chartData: unknown[], chart: React.ReactNode, title: string) => {
        if (isLoading || isAuthLoading) return <p className="text-center text-text-secondary py-10">Cargando {title.toLowerCase()}...</p>;
        if (!chartData || chartData.length === 0) return <p className="text-center text-text-secondary py-10">No hay datos disponibles para {title.toLowerCase()}.</p>;
        return <div style={{ width: '100%', height: 300 }}>{chart}</div>;
    };
    
    if (error && !isLoading) {
        return (
            <Page><Card><CardHeader><CardTitle className="text-error">Error al Cargar Gráficos</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-text-secondary">No se pudieron obtener los datos. Verifique la configuración de la base de datos y su conexión a internet.</p>
                    <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto whitespace-pre-wrap">{error.message}</pre>
                </CardContent></Card></Page>
        );
    }
    
    const GAS_CHART_COLORS = [themeColors.secondary, themeColors.textSecondary, themeColors.accent, themeColors.red, '#A8A29E'];
    const SUBSTRATE_CHART_COLORS = [themeColors.primary, themeColors.secondary, themeColors.accent, themeColors.textSecondary, '#3B82F6', '#F97316'];
    const DIET_COLORS = SUBSTRATE_CHART_COLORS;

    const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
        if (midAngle === undefined || percent === undefined) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent < 0.05) return null;
        return (<text x={x} y={y} fill="white" fontSize="12px" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">{`${(percent * 100).toFixed(0)}%`}</text>);
    };

  return (
    <Page>
        <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4">
            <div className="max-w-xs">
                <Label htmlFor="biodigester-select">Seleccionar Biodigestor</Label>
                <Select id="biodigester-select" value={selectedBiodigesterId ?? ''} onChange={e => setSelectedBiodigesterId(Number(e.target.value))} disabled={biodigestores.length === 0}>
                    {biodigestores.length === 0 && <option>Cargando biodigestores...</option>}
                    {biodigestores.map(b => (<option key={b.id} value={b.id}>{b.nombre_equipo}</option>))}
                </Select>
            </div>
             {isSuperAdmin && (
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <TabButton active={view === 'operativa'} onClick={() => setView('operativa')}>Vista Operativa</TabButton>
                        <TabButton active={view === 'gerencial'} onClick={() => setView('gerencial')}>Vista Gerencial</TabButton>
                    </nav>
                </div>
            )}
        </div>
      
      <div className={cn({ "grid grid-cols-1 lg:grid-cols-2 gap-8": showOperativa })}>
        {showOperativa && (
            <>
                <Card>
                  <CardHeader><CardTitle>Tendencia FOS/TAC</CardTitle></CardHeader>
                  <CardContent>{renderChartOrMessage(memoizedData.fosTacData, (<ResponsiveContainer><LineChart data={memoizedData.fosTacData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))"/><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis yAxisId="left" stroke={themeColors.textSecondary} label={{ value: 'mg/L', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><YAxis yAxisId="right" orientation="right" domain={[0, 1]} stroke={themeColors.textSecondary} label={{ value: 'Ratio', angle: 90, position: 'insideRight', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))'}} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Line yAxisId="left" type="monotone" dataKey="FOS" stroke={themeColors.primary} name="FOS (mg/L)" dot={false} /><Line yAxisId="left" type="monotone" dataKey="TAC" stroke={themeColors.textSecondary} name="TAC (mg/L)" dot={false}/><Line yAxisId="right" type="monotone" dataKey="Ratio" stroke={themeColors.red} strokeDasharray="5 5" name="Ratio" dot={false}/></LineChart></ResponsiveContainer>), "Tendencia FOS/TAC")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Composición del Biogás (Última Medición)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(memoizedData.gasCompositionData, (<ResponsiveContainer><PieChart><Pie data={memoizedData.gasCompositionData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedPieLabel} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">{memoizedData.gasCompositionData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={GAS_CHART_COLORS[index % GAS_CHART_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))'}} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /></PieChart></ResponsiveContainer>), "Composición del Biogás")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Tendencia de Calidad de Biogás</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(memoizedData.biogasQualityData, (<ResponsiveContainer><LineChart data={memoizedData.biogasQualityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis yAxisId="left" domain={[40, 70]} stroke={themeColors.textSecondary} label={{ value: '%', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 50']} stroke={themeColors.textSecondary} label={{ value: 'ppm', angle: 90, position: 'insideRight', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Line yAxisId="left" type="monotone" dataKey="CH4 (%)" stroke={themeColors.secondary} dot={false} /><Line yAxisId="left" type="monotone" dataKey="CO2 (%)" stroke={themeColors.primary} dot={false} /><Line yAxisId="right" type="monotone" dataKey="H2S (ppm)" stroke={themeColors.accent} dot={false} /></LineChart></ResponsiveContainer>), "Tendencia de Calidad de Biogás")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Horas de Funcionamiento del Motor (CHP)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(memoizedData.chpUptimeData, (<ResponsiveContainer><AreaChart data={memoizedData.chpUptimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><defs><linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.8}/><stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis domain={[0, 24]} stroke={themeColors.textSecondary} label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} formatter={(value: number) => `${value.toFixed(1)} hrs`} /><Area type="monotone" dataKey="Horas de Funcionamiento" stroke={themeColors.primary} fillOpacity={1} fill="url(#colorUptime)" /></AreaChart></ResponsiveContainer>), "Horas de Funcionamiento del Motor (CHP)")}</CardContent>
                </Card>
            </>
        )}
        </div>
        {showGerencial && (
            <div className="bg-background p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-text-primary">Dashboard Gerencial</h2>
                     <div className="flex items-center space-x-1 bg-surface p-1 rounded-lg">
                        <TimeRangeButton range={7} activeRange={timeRange} setRange={setTimeRange}>7D</TimeRangeButton>
                        <TimeRangeButton range={30} activeRange={timeRange} setRange={setTimeRange}>30D</TimeRangeButton>
                        <TimeRangeButton range={90} activeRange={timeRange} setRange={setTimeRange}>90D</TimeRangeButton>
                    </div>
                </div>
                {isLoading || isAuthLoading || !memoizedData.kpiData ? <p className="text-center text-text-secondary py-10">Cargando dashboard gerencial...</p> : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <KpiCard title="Energía Total Producida" value={memoizedData.kpiData.totalEnergyMWh} unit="MWh" />
                            <KpiCard title="Eficiencia de Producción" value={memoizedData.kpiData.efficiency} unit="kWh/t" />
                            <KpiCard title="Calidad Media Biogás" value={memoizedData.kpiData.avgCh4} unit="% CH4" />
                            <KpiCard title="Disponibilidad Motor (CHP)" value={memoizedData.kpiData.chpUptime.toFixed(1)} unit="%" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Card>
                                <CardHeader><CardTitle>Producción vs. Consumo de Energía (kWh)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.energyProductionData, (<ResponsiveContainer><BarChart data={memoizedData.energyProductionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis stroke={themeColors.textSecondary} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} formatter={(value: number) => `${value.toLocaleString('es-AR')} kWh`} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Bar dataKey="Energía Exportada" stackId="a" fill={themeColors.primary} radius={[0, 0, 0, 0]} /><Bar dataKey="Autoconsumo" stackId="a" fill={themeColors.secondary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>), "Producción de Energía")}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Consumo Diario de Sustrato (t)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.dailySubstrateData, (<ResponsiveContainer><BarChart data={memoizedData.dailySubstrateData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis stroke={themeColors.textSecondary} label={{ value: 'toneladas', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Bar dataKey="Sustrato (t)" fill={themeColors.accent} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>), "Consumo de Sustrato")}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Eficiencia de Producción (kWh/t)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.productionEfficiencyData, (<ResponsiveContainer><AreaChart data={memoizedData.productionEfficiencyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><defs><linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.accent} stopOpacity={0.8}/><stop offset="95%" stopColor={themeColors.accent} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis stroke={themeColors.textSecondary} label={{ value: 'kWh/t', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Area type="monotone" dataKey="Eficiencia (kWh/t)" stroke={themeColors.accent} fillOpacity={1} fill="url(#colorEfficiency)" /></AreaChart></ResponsiveContainer>), "Eficiencia de Producción")}</CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Disponibilidad Diaria del Motor (CHP)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.chpDailyUptimeData, (<ResponsiveContainer><BarChart data={memoizedData.chpDailyUptimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis domain={[0, 24]} stroke={themeColors.textSecondary} label={{ value: 'horas', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><ReferenceLine y={24} stroke="rgb(var(--color-border))" strokeDasharray="3 3" /><Bar dataKey="Horas de Funcionamiento" fill={themeColors.primary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>), "Disponibilidad del Motor")}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Tendencia de Estabilidad (Ratio FOS/TAC)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.fosTacRatioData, (<ResponsiveContainer><LineChart data={memoizedData.fosTacRatioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis domain={[0, 0.8]} stroke={themeColors.textSecondary} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><ReferenceLine y={0.4} label={{ value: 'Alerta', position: 'insideTopLeft', fill: themeColors.red }} stroke={themeColors.red} strokeDasharray="3 3" /><Line type="monotone" dataKey="Ratio" stroke={themeColors.primary} dot={false} /></LineChart></ResponsiveContainer>), "Tendencia de Estabilidad")}</CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Evolución Calidad de Biogás (% CH4)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.methaneTrendData, (<ResponsiveContainer><LineChart data={memoizedData.methaneTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis domain={[50, 70]} stroke={themeColors.textSecondary} label={{ value: '% CH4', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Line type="monotone" dataKey="CH4 (%)" stroke={themeColors.secondary} dot={false} /></LineChart></ResponsiveContainer>), "Calidad de Biogás")}</CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Composición de Biogás (CH4 vs CO2)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.biogasCompositionRatioData, (<ResponsiveContainer><AreaChart data={memoizedData.biogasCompositionRatioData} stackOffset="expand" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis tickFormatter={(tick) => `${tick * 100}%`} stroke={themeColors.textSecondary} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} formatter={(value, name) => `${(value as number).toFixed(1)}%`}/><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Area type="monotone" dataKey="CH4" stackId="1" stroke={themeColors.secondary} fill={themeColors.secondary} /><Area type="monotone" dataKey="CO2" stackId="1" stroke={themeColors.textSecondary} fill={themeColors.textSecondary} /></AreaChart></ResponsiveContainer>), "Composición de Biogás")}</CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Tendencia de Sulfhídrico (H2S)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.h2sTrendData, (<ResponsiveContainer><LineChart data={memoizedData.h2sTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis domain={[0, 'dataMax + 50']} stroke={themeColors.textSecondary} label={{ value: 'ppm', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }}/><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><ReferenceLine y={200} label={{ value: 'Límite', position: 'insideTopLeft', fill: themeColors.red }} stroke={themeColors.red} strokeDasharray="3 3" /><Line type="monotone" dataKey="H2S (ppm)" stroke={themeColors.accent} dot={false} /></LineChart></ResponsiveContainer>), "Tendencia de H2S")}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Mezcla de Sustratos (Total)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.substrateMixData, (<ResponsiveContainer><PieChart><Pie data={memoizedData.substrateMixData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">{memoizedData.substrateMixData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={SUBSTRATE_CHART_COLORS[index % SUBSTRATE_CHART_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `${value.toLocaleString('es-AR')} kg`} contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))'}} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /></PieChart></ResponsiveContainer>), "Mezcla de Sustratos")}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Evolución de la Dieta (t/día)</CardTitle></CardHeader>
                                <CardContent>{renderChartOrMessage(memoizedData.dietEvolutionData, (<ResponsiveContainer><BarChart data={memoizedData.dietEvolutionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis stroke={themeColors.textSecondary} label={{ value: 'toneladas', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} />{Object.keys(memoizedData.totalSubstrateMix).map((sustrato, i) => (<Bar key={sustrato} dataKey={sustrato} stackId="a" fill={DIET_COLORS[i % DIET_COLORS.length]} />))}</BarChart></ResponsiveContainer>), "Evolución de la Dieta")}</CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        )}
      
    </Page>
  );
};

export default GraphsPage;
