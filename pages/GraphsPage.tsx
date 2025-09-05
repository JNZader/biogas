import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar, AreaChart, Area, ReferenceLine, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Page from '../components/Page';
import { useThemeColors } from '../stores/useThemeColors';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { format, parseISO, getWeek } from 'date-fns';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { useAuthorization } from '../hooks/useAuthorization';
import { cn } from '../lib/utils';
import { useGraphsPageStore } from '../stores/graphsPageStore';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Switch } from '../components/ui/Switch';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';


// --- Co-located API Logic ---
const fetchGraphData = async (biodigesterId: number, timeRange: number) => {
    const timeRangeAgo = new Date();
    timeRangeAgo.setDate(timeRangeAgo.getDate() - timeRange);
    const timeRangeAgoISO = timeRangeAgo.toISOString();

    const [fosTacRes, gasRes, substrateRes, energyRes, gasHistoryRes] = await Promise.all([
        supabase.from('analisis_fos_tac').select('fecha_hora, fos_mg_l, tac_mg_l, relacion_fos_tac').eq('equipo_id', biodigesterId).not('relacion_fos_tac', 'is', null).gte('fecha_hora', timeRangeAgoISO).order('fecha_hora', { ascending: true }),
        supabase.from('lecturas_gas').select('ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm').eq('equipo_id_fk', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).single(),
        supabase.from('detalle_ingreso_sustrato').select('created_at, cantidad_kg, sustratos ( nombre )').gte('created_at', timeRangeAgoISO),
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, autoconsumo_porcentaje, horas_funcionamiento_motor_chp_dia, flujo_biogas_kg_dia').gte('fecha', timeRangeAgoISO).order('fecha', { ascending: true }),
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

const CustomizeGraphsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { charts, toggleChart } = useGraphsPageStore();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Personalizar Vista Gerencial</DialogTitle>
                </DialogHeader>
                <div className="p-6 pt-0 space-y-2 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-text-secondary pb-2">Seleccione los gráficos que desea visualizar.</p>
                    {charts.map((chart) => (
                        <div key={chart.id} className="flex items-center justify-between p-2 rounded-md bg-background">
                            <Label htmlFor={`chart-toggle-${chart.id}`}>{chart.title}</Label>
                            <Switch
                                id={`chart-toggle-${chart.id}`}
                                checked={chart.isVisible}
                                onCheckedChange={() => toggleChart(chart.id)}
                            />
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const GraphsPage: React.FC = () => {
    const themeColors = useThemeColors();
    const { equipos } = useSupabaseData();
    const biodigestores = useMemo(() => equipos.filter(e => e.categoria?.toLowerCase().includes('biodigestor')), [equipos]);
    const [selectedBiodigesterId, setSelectedBiodigesterId] = React.useState<number | null>(null);
    const [timeRange, setTimeRange] = useState<number>(30);

    const { role, isLoading: isAuthLoading } = useAuthorization();
    const [view, setView] = useState<'operativa' | 'gerencial'>('operativa');
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [energyPrice, setEnergyPrice] = useState<number>(0.15);
    const { charts } = useGraphsPageStore();

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
        if (!data) return null;

        const DIGESTER_VOLUME_M3 = 5000;
        const BIOGAS_DENSITY_KG_M3 = 1.2;

        const calculateMovingAverage = (data: any[], key: string, window: number) => {
            const result = [];
            for (let i = 0; i < data.length; i++) {
                const slice = data.slice(Math.max(0, i - window + 1), i + 1);
                const sum = slice.reduce((acc, item) => acc + (item[key] || 0), 0);
                const avg = sum / slice.length;
                result.push({ ...data[i], [`${key}_MA`]: parseFloat(avg.toFixed(2)) });
            }
            return result;
        };

        const formattedFosTac = (data.fosTacData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM'), FOS: d.fos_mg_l, TAC: d.tac_mg_l, Ratio: d.relacion_fos_tac
        }));
        
        const formattedGas = (data.gasData) 
            ? [{ name: 'CH4', value: data.gasData.ch4_porcentaje || 0 }, { name: 'CO2', value: data.gasData.co2_porcentaje || 0 }]
            : [];
        
        const totalSubstrateMix: { [key: string]: number } = {};
        (data.substrateData as RawSubstrateItem[] | null || []).forEach((item) => {
            if (item.sustratos) {
                totalSubstrateMix[item.sustratos.nombre] = (totalSubstrateMix[item.sustratos.nombre] || 0) + item.cantidad_kg;
            }
        });
        const formattedSubstrateMix: SubstrateMixData[] = Object.entries(totalSubstrateMix).map(([name, value]) => ({ name, value }));
        
        let totalEnergyKWh = 0;
        let totalChpHours = 0;
        const formattedEnergy = (data.energyData || []).map(d => {
            const total = d.generacion_electrica_total_kwh_dia || 0;
            totalEnergyKWh += total;
            totalChpHours += d.horas_funcionamiento_motor_chp_dia || 0;
            const autoconsumo = total * ((d.autoconsumo_porcentaje || 0) / 100);
            return {
                date: format(new Date(d.fecha + "T00:00:00"), 'dd/MM'),
                'Energía Exportada': parseFloat((total - autoconsumo).toFixed(1)),
                'Autoconsumo': parseFloat(autoconsumo.toFixed(1)),
            };
        });

        const formattedBiogasQuality = (data.gasHistoryData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'),
            'CH4 (%)': d.ch4_porcentaje, 'CO2 (%)': d.co2_porcentaje, 'H2S (ppm)': d.h2s_ppm,
        }));
        
        const formattedChpUptime = (data.energyData || []).map(d => ({
            date: format(new Date(d.fecha + "T00:00:00"), 'dd/MM'),
            'Horas de Funcionamiento': d.horas_funcionamiento_motor_chp_dia,
        }));
        
        const avgCh4 = data.gasHistoryData && data.gasHistoryData.length > 0
            ? data.gasHistoryData.reduce((sum, d) => sum + (d.ch4_porcentaje || 0), 0) / data.gasHistoryData.length : 0;
        
        const dailyData: Record<string, { energy: number, substrate: number, biogasKg: number, chpHours: number, autoconsumoPerc: number }> = {};
        (data.energyData || []).forEach(e => {
            dailyData[e.fecha] = { ...dailyData[e.fecha], energy: e.generacion_electrica_total_kwh_dia || 0, substrate: 0, biogasKg: e.flujo_biogas_kg_dia || 0, chpHours: e.horas_funcionamiento_motor_chp_dia || 0, autoconsumoPerc: e.autoconsumo_porcentaje || 0 };
        });
        (data.substrateData as RawSubstrateItem[] || []).forEach(s => {
            const dateStr = s.created_at.split('T')[0];
            if (!dailyData[dateStr]) dailyData[dateStr] = { energy: 0, substrate: 0, biogasKg: 0, chpHours: 0, autoconsumoPerc: 0 };
            dailyData[dateStr].substrate += s.cantidad_kg;
        });

        const dailyArray = Object.entries(dailyData).map(([date, values]) => ({ date, ...values })).sort((a,b) => a.date.localeCompare(b.date));

        const formattedProductionEfficiency = dailyArray.map(d => ({
            date: format(new Date(d.date + "T00:00:00"), 'dd/MM'),
            'Eficiencia (kWh/t)': d.substrate > 0 ? parseFloat((d.energy / (d.substrate / 1000)).toFixed(1)) : 0,
        }));

        const totalSubstrateKg = Object.values(dailyData).reduce((sum, d) => sum + d.substrate, 0);
        const efficiencyKwhPerTon = totalSubstrateKg > 0 ? totalEnergyKWh / (totalSubstrateKg / 1000) : 0;
        
        const formattedFosTacRatio = formattedFosTac.map(d => ({ date: d.date, Ratio: d.Ratio }));
        const formattedMethaneTrend = (data.gasHistoryData || []).map(d => ({ date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'), 'CH4 (%)': d.ch4_porcentaje, }));

        const formattedDailySubstrate = dailyArray.map(d => ({
            date: format(new Date(d.date + "T00:00:00"), 'dd/MM'),
            'Sustrato (t)': parseFloat((d.substrate / 1000).toFixed(1)),
        }));
        
        const formattedBiogasCompositionRatio = (data.gasHistoryData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'), CH4: d.ch4_porcentaje || 0, CO2: d.co2_porcentaje || 0,
        }));
        
        const formattedH2STrend = (data.gasHistoryData || []).map(d => ({
            date: format(parseISO(d.fecha_hora), 'dd/MM HH:mm'), 'H2S (ppm)': d.h2s_ppm,
        }));
        
        const dailyMix: Record<string, Record<string, number>> = {};
        (data.substrateData as RawSubstrateItem[] || []).forEach((item) => {
            if (item.sustratos) {
                const dateStr = item.created_at.split('T')[0];
                if (!dailyMix[dateStr]) dailyMix[dateStr] = {};
                dailyMix[dateStr][item.sustratos.nombre] = (dailyMix[dateStr][item.sustratos.nombre] || 0) + item.cantidad_kg;
            }
        });
        const formattedDietEvolution = Object.entries(dailyMix).map(([date, substrates]) => {
            const entry: Record<string, any> = { date: format(new Date(date + "T00:00:00"), 'dd/MM') };
            for (const [name, qty] of Object.entries(substrates)) entry[name] = parseFloat((qty / 1000).toFixed(1));
            return entry;
        }).sort((a,b) => a.date.localeCompare(b.date));

        const productionVsFeed = dailyArray.map(d => ({ x: d.substrate / 1000, y: d.energy, z: d.energy / (d.substrate / 1000) || 0 }));
        const revenueProjection = formattedEnergy.map(d => ({ date: d.date, 'Ingresos ($)': parseFloat(((d['Energía Exportada'] || 0) * energyPrice).toFixed(2)) }));
        const organicLoadingRate = dailyArray.map(d => ({ date: format(new Date(d.date + "T00:00:00"), 'dd/MM'), 'OLR (kg/m³/d)': parseFloat((d.substrate / DIGESTER_VOLUME_M3).toFixed(2))}));
        const gasProductionRate = dailyArray.map(d => ({ date: format(new Date(d.date + "T00:00:00"), 'dd/MM'), 'GPR (m³/m³/d)': parseFloat(((d.biogasKg / BIOGAS_DENSITY_KG_M3) / DIGESTER_VOLUME_M3).toFixed(2))}));
        const specificGasProduction = dailyArray.map(d => ({ date: format(new Date(d.date + "T00:00:00"), 'dd/MM'), 'SGP (m³/t)': d.substrate > 0 ? parseFloat(((d.biogasKg / BIOGAS_DENSITY_KG_M3) / (d.substrate / 1000)).toFixed(1)) : 0 }));
        const energyVsChpHours = dailyArray.map(d => ({ x: d.chpHours, y: d.energy, z: d.chpHours > 0 ? d.energy / d.chpHours : 0 }));
        const autoconsumptionTrend = dailyArray.map(d => ({ date: format(new Date(d.date + "T00:00:00"), 'dd/MM'), 'Autoconsumo (%)': parseFloat(d.autoconsumoPerc.toFixed(1)) }));
        
        const gasHistoryByDate: Record<string, { ch4: number }> = {};
        (data.gasHistoryData || []).forEach(d => {
            const date = format(parseISO(d.fecha_hora), 'yyyy-MM-dd');
            if(!gasHistoryByDate[date]) gasHistoryByDate[date] = { ch4: 0 };
            gasHistoryByDate[date].ch4 = Math.max(gasHistoryByDate[date].ch4, d.ch4_porcentaje || 0); // Use max for the day
        });
        const methaneProductionRate = dailyArray.map(d => {
            const date = format(new Date(d.date + "T00:00:00"), 'yyyy-MM-dd');
            const ch4Perc = gasHistoryByDate[date]?.ch4 || avgCh4;
            return { date: format(new Date(d.date + "T00:00:00"), 'dd/MM'), 'Producción CH4 (kg/d)': parseFloat((d.biogasKg * (ch4Perc / 100)).toFixed(0)) };
        });

        const weeklyEnergy: Record<string, { week: string, 'Producción Semanal': number }> = {};
        dailyArray.forEach(d => {
            const weekDate = parseISO(d.date);
            const weekNumber = getWeek(weekDate, { weekStartsOn: 1 });
            const weekLabel = `Sem ${weekNumber}`;
            if(!weeklyEnergy[weekLabel]) weeklyEnergy[weekLabel] = { week: weekLabel, 'Producción Semanal': 0 };
            weeklyEnergy[weekLabel]['Producción Semanal'] += d.energy;
        });

        return { 
            fosTacData: formattedFosTac, gasCompositionData: formattedGas, substrateMixData: formattedSubstrateMix, 
            energyProductionData: formattedEnergy, biogasQualityData: formattedBiogasQuality, chpUptimeData: formattedChpUptime, 
            kpiData: {
                totalEnergyMWh: (totalEnergyKWh / 1000).toFixed(1),
                efficiency: efficiencyKwhPerTon.toFixed(0),
                avgCh4: avgCh4.toFixed(1),
                chpUptime: timeRange > 0 ? (totalChpHours / (timeRange * 24)) * 100 : 0,
            },
            productionEfficiencyData: calculateMovingAverage(formattedProductionEfficiency, 'Eficiencia (kWh/t)', 7),
            fosTacRatioData: calculateMovingAverage(formattedFosTacRatio, 'Ratio', 7),
            methaneTrendData: formattedMethaneTrend, dailySubstrateData: formattedDailySubstrate, 
            biogasCompositionRatioData: formattedBiogasCompositionRatio, h2sTrendData: formattedH2STrend, dietEvolutionData: formattedDietEvolution, totalSubstrateMix,
            // New charts data
            productionVsFeed, revenueProjection, organicLoadingRate, gasProductionRate, specificGasProduction, energyVsChpHours,
            autoconsumptionTrend, weeklyEnergyData: Object.values(weeklyEnergy), methaneProductionRate
        };
    }, [data, timeRange, energyPrice]);
    
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = role === 'Admin';
    const isOperator = role === 'Operador';
    const showOperativa = isOperator || (isSuperAdmin && view === 'operativa');
    const showGerencial = isAdmin || (isSuperAdmin && view === 'gerencial');

    const renderChartOrMessage = (chartData: unknown[] | undefined, chart: React.ReactNode, title: string) => {
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

    const chartComponents: Record<string, React.ReactNode> = memoizedData ? {
        energyProduction: <Card><CardHeader><CardTitle>Producción vs. Consumo de Energía (kWh)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.energyProductionData, <ResponsiveContainer><BarChart data={memoizedData.energyProductionData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="Energía Exportada" stackId="a" fill={themeColors.primary} /><Bar dataKey="Autoconsumo" stackId="a" fill={themeColors.secondary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>, "Producción de Energía")}</CardContent></Card>,
        dailySubstrate: <Card><CardHeader><CardTitle>Consumo Diario de Sustrato (t)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.dailySubstrateData, <ResponsiveContainer><BarChart data={memoizedData.dailySubstrateData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis label={{ value: 't', angle: -90, position: 'insideLeft' }} /><Tooltip /><Bar dataKey="Sustrato (t)" fill={themeColors.accent} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>, "Consumo de Sustrato")}</CardContent></Card>,
        productionEfficiency: <Card><CardHeader><CardTitle>Eficiencia de Producción (kWh/t)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.productionEfficiencyData, <ResponsiveContainer><LineChart data={memoizedData.productionEfficiencyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="Eficiencia (kWh/t)" stroke={themeColors.accent} dot={false} /><Line type="monotone" dataKey="Eficiencia (kWh/t)_MA" stroke={themeColors.accent} strokeDasharray="5 5" dot={false} name="Media Móvil 7D" /></LineChart></ResponsiveContainer>, "Eficiencia de Producción")}</CardContent></Card>,
        chpUptime: <Card><CardHeader><CardTitle>Disponibilidad Diaria del Motor (CHP)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.chpUptimeData, <ResponsiveContainer><BarChart data={memoizedData.chpUptimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 24]} /><Tooltip /><ReferenceLine y={24} strokeDasharray="3 3" /><Bar dataKey="Horas de Funcionamiento" fill={themeColors.primary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>, "Disponibilidad del Motor")}</CardContent></Card>,
        fosTacRatio: <Card><CardHeader><CardTitle>Tendencia de Estabilidad (Ratio FOS/TAC)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.fosTacRatioData, <ResponsiveContainer><LineChart data={memoizedData.fosTacRatioData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 0.8]} /><Tooltip /><Legend /><ReferenceLine y={0.4} label="Alerta" stroke={themeColors.red} strokeDasharray="3 3" /><Line type="monotone" dataKey="Ratio" stroke={themeColors.primary} dot={false} /><Line type="monotone" dataKey="Ratio_MA" stroke={themeColors.primary} strokeDasharray="5 5" dot={false} name="Media Móvil 7D" /></LineChart></ResponsiveContainer>, "Tendencia de Estabilidad")}</CardContent></Card>,
        methaneTrend: <Card><CardHeader><CardTitle>Evolución Calidad de Biogás (% CH4)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.methaneTrendData, <ResponsiveContainer><LineChart data={memoizedData.methaneTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[50, 70]} /><Tooltip /><Line type="monotone" dataKey="CH4 (%)" stroke={themeColors.secondary} dot={false} /></LineChart></ResponsiveContainer>, "Calidad de Biogás")}</CardContent></Card>,
        biogasComposition: <Card><CardHeader><CardTitle>Composición de Biogás (CH4 vs CO2)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.biogasCompositionRatioData, <ResponsiveContainer><AreaChart data={memoizedData.biogasCompositionRatioData} stackOffset="expand"><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(tick) => `${tick * 100}%`} /><Tooltip /><Legend /><Area type="monotone" dataKey="CH4" stackId="1" stroke={themeColors.secondary} fill={themeColors.secondary} /><Area type="monotone" dataKey="CO2" stackId="1" stroke={themeColors.textSecondary} fill={themeColors.textSecondary} /></AreaChart></ResponsiveContainer>, "Composición de Biogás")}</CardContent></Card>,
        h2sTrend: <Card><CardHeader><CardTitle>Tendencia de Sulfhídrico (H2S)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.h2sTrendData, <ResponsiveContainer><LineChart data={memoizedData.h2sTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 'dataMax + 50']} /><Tooltip /><ReferenceLine y={200} label="Límite" stroke={themeColors.red} strokeDasharray="3 3" /><Line type="monotone" dataKey="H2S (ppm)" stroke={themeColors.accent} dot={false} /></LineChart></ResponsiveContainer>, "Tendencia de H2S")}</CardContent></Card>,
        substrateMix: <Card><CardHeader><CardTitle>Mezcla de Sustratos (Total)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.substrateMixData, <ResponsiveContainer><PieChart><Pie data={memoizedData.substrateMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>{memoizedData.substrateMixData.map((_entry, index) => <Cell key={`cell-${index}`} fill={SUBSTRATE_CHART_COLORS[index % SUBSTRATE_CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>, "Mezcla de Sustratos")}</CardContent></Card>,
        dietEvolution: <Card><CardHeader><CardTitle>Evolución de la Dieta (t/día)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.dietEvolutionData, <ResponsiveContainer><BarChart data={memoizedData.dietEvolutionData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />{Object.keys(memoizedData.totalSubstrateMix).map((sustrato, i) => <Bar key={sustrato} dataKey={sustrato} stackId="a" fill={DIET_COLORS[i % DIET_COLORS.length]} />)}</BarChart></ResponsiveContainer>, "Evolución de la Dieta")}</CardContent></Card>,
        productionVsFeed: <Card><CardHeader><CardTitle>Correlación: Producción vs. Alimentación</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.productionVsFeed, <ResponsiveContainer><ScatterChart><CartesianGrid /><XAxis type="number" dataKey="x" name="Alimentación (t)" unit="t" /><YAxis type="number" dataKey="y" name="Producción (kWh)" unit="kWh" /><ZAxis type="number" dataKey="z" range={[50, 500]} name="Eficiencia (kWh/t)" /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter name="Días" data={memoizedData.productionVsFeed} fill={themeColors.primary} /></ScatterChart></ResponsiveContainer>, "Correlación Producción vs Alimentación")}</CardContent></Card>,
        revenueProjection: <Card><CardHeader><CardTitle>Proyección de Ingresos Estimados ($)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.revenueProjection, <ResponsiveContainer><BarChart data={memoizedData.revenueProjection}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} /><Bar dataKey="Ingresos ($)" fill={themeColors.secondary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>, "Proyección de Ingresos")}</CardContent></Card>,
        organicLoadingRate: <Card><CardHeader><CardTitle>Tasa de Carga Orgánica (Proxy)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.organicLoadingRate, <ResponsiveContainer><LineChart data={memoizedData.organicLoadingRate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="OLR (kg/m³/d)" stroke={themeColors.accent} dot={false} /></LineChart></ResponsiveContainer>, "Tasa de Carga Orgánica")}</CardContent></Card>,
        gasProductionRate: <Card><CardHeader><CardTitle>Tasa de Producción de Gas</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.gasProductionRate, <ResponsiveContainer><LineChart data={memoizedData.gasProductionRate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="GPR (m³/m³/d)" stroke={themeColors.secondary} dot={false} /></LineChart></ResponsiveContainer>, "Tasa de Producción de Gas")}</CardContent></Card>,
        specificGasProduction: <Card><CardHeader><CardTitle>Producción Específica de Gas</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.specificGasProduction, <ResponsiveContainer><LineChart data={memoizedData.specificGasProduction}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="SGP (m³/t)" stroke={themeColors.secondary} dot={false} /></LineChart></ResponsiveContainer>, "Producción Específica de Gas")}</CardContent></Card>,
        energyVsChpHours: <Card><CardHeader><CardTitle>Correlación: Energía vs. Horas CHP</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.energyVsChpHours, <ResponsiveContainer><ScatterChart><CartesianGrid /><XAxis type="number" dataKey="x" name="Horas CHP" unit="h" /><YAxis type="number" dataKey="y" name="Producción (kWh)" unit="kWh" /><ZAxis type="number" dataKey="z" range={[50, 500]} name="Potencia Media (kW)" /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter name="Días" data={memoizedData.energyVsChpHours} fill={themeColors.primary} /></ScatterChart></ResponsiveContainer>, "Correlación Energía vs Horas CHP")}</CardContent></Card>,
        fosTacAbsolute: <Card><CardHeader><CardTitle>Tendencia de FOS y TAC (Absolutos)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.fosTacData, <ResponsiveContainer><LineChart data={memoizedData.fosTacData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="FOS" stroke={themeColors.primary} dot={false} /><Line type="monotone" dataKey="TAC" stroke={themeColors.textSecondary} dot={false} /></LineChart></ResponsiveContainer>, "Tendencia FOS y TAC")}</CardContent></Card>,
        autoconsumptionTrend: <Card><CardHeader><CardTitle>Tendencia de Autoconsumo (%)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.autoconsumptionTrend, <ResponsiveContainer><AreaChart data={memoizedData.autoconsumptionTrend}><defs><linearGradient id="colorAutoconsumo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.secondary} stopOpacity={0.8}/><stop offset="95%" stopColor={themeColors.secondary} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis unit="%" /><Tooltip /><Area type="monotone" dataKey="Autoconsumo (%)" stroke={themeColors.secondary} fillOpacity={1} fill="url(#colorAutoconsumo)" /></AreaChart></ResponsiveContainer>, "Tendencia de Autoconsumo")}</CardContent></Card>,
        weeklyEnergy: <Card><CardHeader><CardTitle>Producción Semanal de Energía (kWh)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.weeklyEnergyData, <ResponsiveContainer><BarChart data={memoizedData.weeklyEnergyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Bar dataKey="Producción Semanal" fill={themeColors.primary} /></BarChart></ResponsiveContainer>, "Producción Semanal")}</CardContent></Card>,
        methaneProductionRate: <Card><CardHeader><CardTitle>Tasa de Producción de Metano (kg/d)</CardTitle></CardHeader><CardContent>{renderChartOrMessage(memoizedData.methaneProductionRate, <ResponsiveContainer><LineChart data={memoizedData.methaneProductionRate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="Producción CH4 (kg/d)" stroke={themeColors.secondary} dot={false} /></LineChart></ResponsiveContainer>, "Tasa de Producción de Metano")}</CardContent></Card>,
    } : {};
    
    const visibleCharts = charts.filter(c => c.isVisible);

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
        {showOperativa && memoizedData && (
            <>
                <Card>
                  <CardHeader><CardTitle>Tendencia FOS/TAC</CardTitle></CardHeader>
                  <CardContent>{renderChartOrMessage(memoizedData.fosTacData, (<ResponsiveContainer><LineChart data={memoizedData.fosTacData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis yAxisId="left" label={{ value: 'mg/L', angle: -90, position: 'insideLeft' }} /><YAxis yAxisId="right" orientation="right" domain={[0, 1]} label={{ value: 'Ratio', angle: 90, position: 'insideRight' }} /><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="FOS" stroke={themeColors.primary} dot={false} /><Line yAxisId="left" type="monotone" dataKey="TAC" stroke={themeColors.textSecondary} dot={false}/><Line yAxisId="right" type="monotone" dataKey="Ratio" stroke={themeColors.red} strokeDasharray="5 5" dot={false}/></LineChart></ResponsiveContainer>), "Tendencia FOS/TAC")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Composición del Biogás (Última Medición)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(memoizedData.gasCompositionData, (<ResponsiveContainer><PieChart><Pie data={memoizedData.gasCompositionData} labelLine={false} label={renderCustomizedPieLabel} outerRadius={100} dataKey="value" nameKey="name">{memoizedData.gasCompositionData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={GAS_CHART_COLORS[index % GAS_CHART_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} /><Legend /></PieChart></ResponsiveContainer>), "Composición del Biogás")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Tendencia de Calidad de Biogás</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(memoizedData.biogasQualityData, (<ResponsiveContainer><LineChart data={memoizedData.biogasQualityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis yAxisId="left" domain={[40, 70]} label={{ value: '%', angle: -90, position: 'insideLeft' }} /><YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 50']} label={{ value: 'ppm', angle: 90, position: 'insideRight' }} /><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="CH4 (%)" stroke={themeColors.secondary} dot={false} /><Line yAxisId="left" type="monotone" dataKey="CO2 (%)" stroke={themeColors.primary} dot={false} /><Line yAxisId="right" type="monotone" dataKey="H2S (ppm)" stroke={themeColors.accent} dot={false} /></LineChart></ResponsiveContainer>), "Tendencia de Calidad de Biogás")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Horas de Funcionamiento del Motor (CHP)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(memoizedData.chpUptimeData, (<ResponsiveContainer><AreaChart data={memoizedData.chpUptimeData}><defs><linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.8}/><stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 24]} label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} /><Tooltip /><Area type="monotone" dataKey="Horas de Funcionamiento" stroke={themeColors.primary} fillOpacity={1} fill="url(#colorUptime)" /></AreaChart></ResponsiveContainer>), "Horas de Funcionamiento del Motor (CHP)")}</CardContent>
                </Card>
            </>
        )}
        </div>
        {showGerencial && (
            <div className="bg-background p-4 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-text-primary">Dashboard Gerencial</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="energy-price" className="text-sm">Precio Energía ($/kWh)</Label>
                            <Input id="energy-price" type="number" value={energyPrice} onChange={e => setEnergyPrice(parseFloat(e.target.value) || 0)} step="0.01" className="w-24 h-8"/>
                        </div>
                        <div className="flex items-center space-x-1 bg-surface p-1 rounded-lg">
                            <TimeRangeButton range={7} activeRange={timeRange} setRange={setTimeRange}>7D</TimeRangeButton>
                            <TimeRangeButton range={30} activeRange={timeRange} setRange={setTimeRange}>30D</TimeRangeButton>
                            <TimeRangeButton range={90} activeRange={timeRange} setRange={setTimeRange}>90D</TimeRangeButton>
                        </div>
                         <Button variant="ghost" size="icon" onClick={() => setIsCustomizeModalOpen(true)} className="ml-2">
                            <Cog6ToothIcon className="h-5 w-5 text-text-secondary" />
                         </Button>
                    </div>
                </div>
                {!memoizedData ? <p className="text-center text-text-secondary py-10">Cargando dashboard gerencial...</p> : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <KpiCard title="Energía Total Producida" value={memoizedData.kpiData.totalEnergyMWh} unit="MWh" />
                            <KpiCard title="Eficiencia de Producción" value={memoizedData.kpiData.efficiency} unit="kWh/t" />
                            <KpiCard title="Calidad Media Biogás" value={memoizedData.kpiData.avgCh4} unit="% CH4" />
                            <KpiCard title="Disponibilidad Motor (CHP)" value={memoizedData.kpiData.chpUptime.toFixed(1)} unit="%" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {visibleCharts.length === 0 ? (
                                <p className="md:col-span-2 text-center text-text-secondary py-10">No hay gráficos seleccionados. Haz clic en el ícono de engranaje para personalizar tu vista.</p>
                            ) : (
                                visibleCharts.map(chart => (
                                    <React.Fragment key={chart.id}>
                                        {chartComponents[chart.id]}
                                    </React.Fragment>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        )}
      <CustomizeGraphsModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} />
    </Page>
  );
};

export default GraphsPage;