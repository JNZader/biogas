import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Page from '../components/Page';
import { useThemeColors } from '../stores/useThemeColors';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { useAuthorization } from '../hooks/useAuthorization';
import { cn } from '../lib/utils';


// --- Co-located API Logic ---
const fetchGraphData = async (biodigesterId: number) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const [fosTacRes, gasRes, substrateRes, energyRes, gasHistoryRes] = await Promise.all([
        supabase.from('analisis_fos_tac').select('fecha_hora, fos_mg_l, tac_mg_l, relacion_fos_tac').eq('equipo_id', biodigesterId).not('relacion_fos_tac', 'is', null).order('fecha_hora', { ascending: true }).limit(10),
        supabase.from('lecturas_gas').select('ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm').eq('equipo_id_fk', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).single(),
        supabase.from('detalle_ingreso_sustrato').select('cantidad_kg, sustratos ( nombre )').gte('created_at', thirtyDaysAgoISO),
        supabase.from('energia').select('fecha, generacion_electrica_total_kwh_dia, autoconsumo_porcentaje, horas_funcionamiento_motor_chp_dia').gte('fecha', thirtyDaysAgoISO).order('fecha', { ascending: true }),
        supabase.from('lecturas_gas').select('fecha_hora, ch4_porcentaje, co2_porcentaje, h2s_ppm').eq('equipo_id_fk', biodigesterId).gte('fecha_hora', thirtyDaysAgoISO).order('fecha_hora', { ascending: true })
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
type RawSubstrateItem = { cantidad_kg: number; sustratos: { nombre: string; } | null; };

// --- Co-located Component ---
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


const GraphsPage: React.FC = () => {
    const themeColors = useThemeColors();
    const { equipos } = useSupabaseData();
    const biodigestores = useMemo(() => equipos.filter(e => e.categoria?.toLowerCase().includes('biodigestor')), [equipos]);
    const [selectedBiodigesterId, setSelectedBiodigesterId] = React.useState<number | null>(null);

    const { role, isLoading: isAuthLoading } = useAuthorization();
    const [view, setView] = useState<'operativa' | 'gerencial'>('operativa');

    React.useEffect(() => {
        if (!selectedBiodigesterId && biodigestores.length > 0) {
            setSelectedBiodigesterId(biodigestores[0].id);
        }
    }, [biodigestores, selectedBiodigesterId]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['graphData', selectedBiodigesterId],
        queryFn: () => fetchGraphData(selectedBiodigesterId!),
        enabled: !!selectedBiodigesterId,
    });

    const { fosTacData, gasCompositionData, substrateMixData, energyProductionData, biogasQualityData, chpUptimeData } = useMemo(() => {
        if (!data) return { fosTacData: [], gasCompositionData: [], substrateMixData: [], energyProductionData: [], biogasQualityData: [], chpUptimeData: [] };

        const formattedFosTac = (data.fosTacData || []).map(d => ({
            date: format(new Date(d.fecha_hora), 'dd/MM'), FOS: d.fos_mg_l, TAC: d.tac_mg_l, Ratio: d.relacion_fos_tac
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
        
        const mix: { [key: string]: number } = {};
        (data.substrateData as RawSubstrateItem[] | null || []).forEach((item) => {
            if (item.sustratos) {
                const name = item.sustratos.nombre;
                mix[name] = (mix[name] || 0) + item.cantidad_kg;
            }
        });
        const formattedSubstrateMix: SubstrateMixData[] = Object.entries(mix).map(([name, value]) => ({ name, value }));

        const formattedEnergy = (data.energyData || []).map(d => {
            const total = d.generacion_electrica_total_kwh_dia || 0;
            const autoconsumoPerc = d.autoconsumo_porcentaje || 0;
            const autoconsumo = total * (autoconsumoPerc / 100);
            const exportada = total - autoconsumo;
            return {
                date: format(new Date(d.fecha + "T00:00:00"), 'dd/MM'),
                'Energía Exportada': parseFloat(exportada.toFixed(1)),
                'Autoconsumo': parseFloat(autoconsumo.toFixed(1)),
            };
        });

        const formattedBiogasQuality = (data.gasHistoryData || []).map(d => ({
            date: format(new Date(d.fecha_hora), 'dd/MM'),
            'CH4 (%)': d.ch4_porcentaje,
            'CO2 (%)': d.co2_porcentaje,
            'H2S (ppm)': d.h2s_ppm,
        }));
        
        const formattedChpUptime = (data.energyData || []).map(d => ({
            date: format(new Date(d.fecha + "T00:00:00"), 'dd/MM'),
            'Horas de Funcionamiento': d.horas_funcionamiento_motor_chp_dia,
        }));

        return { fosTacData: formattedFosTac, gasCompositionData: formattedGas, substrateMixData: formattedSubstrateMix, energyProductionData: formattedEnergy, biogasQualityData: formattedBiogasQuality, chpUptimeData: formattedChpUptime };
    }, [data]);
    
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = role === 'Admin';
    const isOperator = role === 'Operador';
    const showOperativa = isOperator || (isSuperAdmin && view === 'operativa');
    const showGerencial = isAdmin || (isSuperAdmin && view === 'gerencial');

    const renderChartOrMessage = (chartData: unknown[], chart: React.ReactNode, title: string) => {
        if (isLoading || isAuthLoading) return <p className="text-center text-text-secondary py-10">Cargando {title.toLowerCase()}...</p>;
        if (chartData.length === 0) return <p className="text-center text-text-secondary py-10">No hay datos disponibles para {title.toLowerCase()}.</p>;
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {showOperativa && (
            <>
                <Card>
                  <CardHeader><CardTitle>Tendencia FOS/TAC</CardTitle></CardHeader>
                  <CardContent>{renderChartOrMessage(fosTacData, (<ResponsiveContainer><LineChart data={fosTacData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))"/><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis yAxisId="left" stroke={themeColors.textSecondary} label={{ value: 'mg/L', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><YAxis yAxisId="right" orientation="right" domain={[0, 1]} stroke={themeColors.textSecondary} label={{ value: 'Ratio', angle: 90, position: 'insideRight', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))'}} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Line yAxisId="left" type="monotone" dataKey="FOS" stroke={themeColors.primary} name="FOS (mg/L)" dot={false} /><Line yAxisId="left" type="monotone" dataKey="TAC" stroke={themeColors.textSecondary} name="TAC (mg/L)" dot={false}/><Line yAxisId="right" type="monotone" dataKey="Ratio" stroke={themeColors.red} strokeDasharray="5 5" name="Ratio" dot={false}/></LineChart></ResponsiveContainer>), "Tendencia FOS/TAC")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Composición del Biogás (Última Medición)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(gasCompositionData, (<ResponsiveContainer><PieChart><Pie data={gasCompositionData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedPieLabel} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">{gasCompositionData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={GAS_CHART_COLORS[index % GAS_CHART_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))'}} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /></PieChart></ResponsiveContainer>), "Composición del Biogás")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Tendencia de Calidad de Biogás</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(biogasQualityData, (<ResponsiveContainer><LineChart data={biogasQualityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis yAxisId="left" domain={[40, 70]} stroke={themeColors.textSecondary} label={{ value: '%', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 50']} stroke={themeColors.textSecondary} label={{ value: 'ppm', angle: 90, position: 'insideRight', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Line yAxisId="left" type="monotone" dataKey="CH4 (%)" stroke={themeColors.secondary} dot={false} /><Line yAxisId="left" type="monotone" dataKey="CO2 (%)" stroke={themeColors.primary} dot={false} /><Line yAxisId="right" type="monotone" dataKey="H2S (ppm)" stroke={themeColors.accent} dot={false} /></LineChart></ResponsiveContainer>), "Tendencia de Calidad de Biogás")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Horas de Funcionamiento del Motor (CHP)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(chpUptimeData, (<ResponsiveContainer><AreaChart data={chpUptimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><defs><linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.8}/><stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis domain={[0, 24]} stroke={themeColors.textSecondary} label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} formatter={(value: number) => `${value.toFixed(1)} hrs`} /><Area type="monotone" dataKey="Horas de Funcionamiento" stroke={themeColors.primary} fillOpacity={1} fill="url(#colorUptime)" /></AreaChart></ResponsiveContainer>), "Horas de Funcionamiento del Motor (CHP)")}</CardContent>
                </Card>
            </>
        )}
        {showGerencial && (
            <>
                <Card>
                    <CardHeader><CardTitle>Mezcla de Sustratos (Últimos 30 Días)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(substrateMixData, (<ResponsiveContainer><PieChart><Pie data={substrateMixData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">{substrateMixData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={SUBSTRATE_CHART_COLORS[index % SUBSTRATE_CHART_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `${value.toLocaleString('es-AR')} kg`} contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))'}} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /></PieChart></ResponsiveContainer>), "Mezcla de Sustratos")}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Producción vs. Consumo de Energía (kWh)</CardTitle></CardHeader>
                    <CardContent>{renderChartOrMessage(energyProductionData, (<ResponsiveContainer><BarChart data={energyProductionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" /><XAxis dataKey="date" stroke={themeColors.textSecondary} /><YAxis stroke={themeColors.textSecondary} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(var(--color-surface), 0.8)', backdropFilter: 'blur(5px)', border: '1px solid rgb(var(--color-border))', borderRadius: '0.5rem', color: 'rgb(var(--color-text-primary))' }} formatter={(value: number) => `${value.toLocaleString('es-AR')} kWh`} /><Legend wrapperStyle={{ color: themeColors.textSecondary }} /><Bar dataKey="Energía Exportada" stackId="a" fill={themeColors.primary} radius={[0, 0, 0, 0]} /><Bar dataKey="Autoconsumo" stackId="a" fill={themeColors.secondary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>), "Producción de Energía")}</CardContent>
                </Card>
            </>
        )}
      </div>
    </Page>
  );
};

export default GraphsPage;