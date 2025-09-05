import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Page from '../components/Page';
import { useThemeColors } from '../stores/useThemeColors';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { format } from 'date-fns';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';


// --- Co-located API Logic ---
const fetchGraphData = async (biodigesterId: number) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [fosTacRes, gasRes, substrateRes] = await Promise.all([
        supabase.from('analisis_fos_tac').select('fecha_hora, fos_mg_l, tac_mg_l, relacion_fos_tac').eq('equipo_id', biodigesterId).not('relacion_fos_tac', 'is', null).order('fecha_hora', { ascending: true }).limit(10),
        supabase.from('lecturas_gas').select('ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm').eq('equipo_id_fk', biodigesterId).order('fecha_hora', { ascending: false }).limit(1).single(),
        supabase.from('detalle_ingreso_sustrato').select('cantidad_kg, sustratos ( nombre )').gte('created_at', sevenDaysAgo.toISOString())
    ]);

    if (fosTacRes.error) throw new Error(`FOS/TAC: ${fosTacRes.error.message}`);
    if (gasRes.error && gasRes.error.code !== 'PGRST116') throw new Error(`Gas: ${gasRes.error.message}`);
    if (substrateRes.error) throw new Error(`Substrate: ${substrateRes.error.message}`);

    return { fosTacData: fosTacRes.data, gasData: gasRes.data, substrateData: substrateRes.data };
};

// --- Co-located Type Definitions ---
interface GasCompositionData {
    name: string;
    value: number;
}

interface SubstrateMixData {
    name: string;
    value: number;
}

interface PieLabelRenderProps {
    cx: number;
    cy: number;
    midAngle?: number;
    innerRadius: number;
    outerRadius: number;
    percent?: number;
    index?: number;
}

type RawSubstrateItem = {
    cantidad_kg: number;
    sustratos: {
        nombre: string;
    } | null;
};


const GraphsPage: React.FC = () => {
    const themeColors = useThemeColors();
    const { equipos } = useSupabaseData();
    const biodigestores = useMemo(() => equipos.filter(e => e.categoria?.toLowerCase().includes('biodigestor')), [equipos]);
    const [selectedBiodigesterId, setSelectedBiodigesterId] = React.useState<number | null>(null);

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

    const { fosTacData, gasCompositionData, substrateMixData } = useMemo(() => {
        if (!data) return { fosTacData: [], gasCompositionData: [], substrateMixData: [] };

        const formattedFosTac = (data.fosTacData || []).map(d => ({
            date: format(new Date(d.fecha_hora), 'dd/MM'),
            FOS: d.fos_mg_l,
            TAC: d.tac_mg_l,
            Ratio: d.relacion_fos_tac
        }));
        
        let formattedGas: GasCompositionData[] = [];
        if (data.gasData) {
            const { ch4_porcentaje, co2_porcentaje, o2_porcentaje, h2s_ppm } = data.gasData;
            const h2s_percentage = h2s_ppm ? (h2s_ppm / 10000) : 0;
            formattedGas = [
                { name: 'CH4', value: ch4_porcentaje || 0 },
                { name: 'CO2', value: co2_porcentaje || 0 },
                { name: 'O2', value: o2_porcentaje || 0 },
                { name: 'H2S', value: h2s_percentage },
            ];
            const knownGasSum = formattedGas.reduce((acc, curr) => acc + curr.value, 0);
            const otherGases = Math.max(0, 100 - knownGasSum);
            if (otherGases > 0.1) {
                formattedGas.push({ name: 'Otros', value: parseFloat(otherGases.toFixed(2)) });
            }
        }
        
        const mix: { [key: string]: number } = {};
        (data.substrateData as RawSubstrateItem[] | null || []).forEach((item) => {
            if (item.sustratos) {
                const name = item.sustratos.nombre;
                mix[name] = (mix[name] || 0) + item.cantidad_kg;
            }
        });
        const formattedSubstrateMix: SubstrateMixData[] = Object.entries(mix).map(([name, value]) => ({ name, value }));

        return { fosTacData: formattedFosTac, gasCompositionData: formattedGas, substrateMixData: formattedSubstrateMix };
    }, [data]);

    const renderChartOrMessage = (chartData: unknown[], chart: React.ReactNode, title: string) => {
        if (isLoading) {
            return <p className="text-center text-text-secondary py-10">Cargando {title.toLowerCase()}...</p>;
        }
        if (chartData.length === 0) {
            return <p className="text-center text-text-secondary py-10">No hay datos disponibles para {title.toLowerCase()}.</p>;
        }
        return <div style={{ width: '100%', height: 300 }}>{chart}</div>;
    };
    
    if (error && !isLoading) {
        return (
            <Page>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-error">Error al Cargar Gráficos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-text-secondary">No se pudieron obtener los datos. Verifique la configuración de la base de datos y su conexión a internet.</p>
                        <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto whitespace-pre-wrap">{error.message}</pre>
                    </CardContent>
                </Card>
            </Page>
        );
    }
    
    const GAS_CHART_COLORS = [themeColors.secondary, themeColors.textSecondary, themeColors.accent, themeColors.red, '#A8A29E'];
    const SUBSTRATE_CHART_COLORS = [themeColors.primary, themeColors.secondary, themeColors.accent, themeColors.textSecondary, '#3B82F6', '#F97316'];

    const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
        if (midAngle === undefined || percent === undefined) {
            return null;
        }
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
        if (percent < 0.05) return null; // Do not render label for very small slices
    
        return (
          <text x={x} y={y} fill="white" fontSize="12px" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        );
      };

  return (
    <Page>
      <div className="mb-6 max-w-xs">
        <Label htmlFor="biodigester-select">Seleccionar Biodigestor</Label>
        <Select id="biodigester-select" value={selectedBiodigesterId ?? ''} onChange={e => setSelectedBiodigesterId(Number(e.target.value))} disabled={biodigestores.length === 0}>
            {biodigestores.length === 0 && <option>Cargando biodigestores...</option>}
            {biodigestores.map(b => (
                <option key={b.id} value={b.id}>{b.nombre_equipo}</option>
            ))}
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>Tendencia FOS/TAC</CardTitle></CardHeader>
          <CardContent>
            {renderChartOrMessage(fosTacData, (
                <ResponsiveContainer>
                <LineChart data={fosTacData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))"/>
                    <XAxis dataKey="date" stroke={themeColors.textSecondary} />
                    <YAxis yAxisId="left" stroke={themeColors.textSecondary} label={{ value: 'mg/L', angle: -90, position: 'insideLeft', fill: themeColors.textSecondary }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 1]} stroke={themeColors.textSecondary} label={{ value: 'Ratio', angle: 90, position: 'insideRight', fill: themeColors.textSecondary }} />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'rgba(var(--color-surface), 0.8)',
                            backdropFilter: 'blur(5px)',
                            border: '1px solid rgb(var(--color-border))',
                            borderRadius: '0.5rem',
                            color: 'rgb(var(--color-text-primary))'
                        }}
                    />
                    <Legend wrapperStyle={{ color: themeColors.textSecondary }} />
                    <Line yAxisId="left" type="monotone" dataKey="FOS" stroke={themeColors.primary} name="FOS (mg/L)" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="TAC" stroke={themeColors.textSecondary} name="TAC (mg/L)" dot={false}/>
                    <Line yAxisId="right" type="monotone" dataKey="Ratio" stroke={themeColors.red} strokeDasharray="5 5" name="Ratio" dot={false}/>
                </LineChart>
                </ResponsiveContainer>
            ), "Tendencia FOS/TAC")}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Composición del Biogás (Última Medición)</CardTitle></CardHeader>
            <CardContent>
                {renderChartOrMessage(gasCompositionData, (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={gasCompositionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedPieLabel}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {gasCompositionData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={GAS_CHART_COLORS[index % GAS_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => `${value.toFixed(2)}%`}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(var(--color-surface), 0.8)',
                                    backdropFilter: 'blur(5px)',
                                    border: '1px solid rgb(var(--color-border))',
                                    borderRadius: '0.5rem',
                                    color: 'rgb(var(--color-text-primary))'
                                }}
                            />
                            <Legend wrapperStyle={{ color: themeColors.textSecondary }} />
                        </PieChart>
                    </ResponsiveContainer>
                ), "Composición del Biogás")}
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Mezcla de Sustratos (Últimos 7 Días)</CardTitle></CardHeader>
            <CardContent>
                {renderChartOrMessage(substrateMixData, (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={substrateMixData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {substrateMixData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={SUBSTRATE_CHART_COLORS[index % SUBSTRATE_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => `${value.toLocaleString('es-AR')} kg`}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(var(--color-surface), 0.8)',
                                    backdropFilter: 'blur(5px)',
                                    border: '1px solid rgb(var(--color-border))',
                                    borderRadius: '0.5rem',
                                    color: 'rgb(var(--color-text-primary))'
                                }}
                            />
                            <Legend wrapperStyle={{ color: themeColors.textSecondary }} />
                        </PieChart>
                    </ResponsiveContainer>
                ), "Mezcla de Sustratos")}
            </CardContent>
        </Card>

      </div>
    </Page>
  );
};

export default GraphsPage;