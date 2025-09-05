import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChartId = 
    'energyProduction' | 'dailySubstrate' | 'productionEfficiency' | 'chpUptime' |
    'fosTacRatio' | 'methaneTrend' | 'biogasComposition' | 'h2sTrend' | 'substrateMix' |
    'dietEvolution' | 'productionVsFeed' | 'revenueProjection' | 'organicLoadingRate' |
    'gasProductionRate' | 'specificGasProduction' | 'energyVsChpHours' | 'fosTacAbsolute' |
    'autoconsumptionTrend' | 'weeklyEnergy' | 'methaneProductionRate';

interface ChartConfig {
    id: ChartId;
    title: string;
    isVisible: boolean;
}

interface GraphsPageState {
    charts: ChartConfig[];
    toggleChart: (id: ChartId) => void;
}

export const useGraphsPageStore = create<GraphsPageState>()(
    persist(
        (set) => ({
            charts: [
                { id: 'energyProduction', title: 'Producción vs. Consumo de Energía', isVisible: true },
                { id: 'dailySubstrate', title: 'Consumo Diario de Sustrato', isVisible: true },
                { id: 'productionEfficiency', title: 'Eficiencia de Producción (con Media Móvil)', isVisible: true },
                { id: 'chpUptime', title: 'Disponibilidad Diaria del Motor (CHP)', isVisible: true },
                { id: 'fosTacRatio', title: 'Tendencia de Estabilidad (Ratio FOS/TAC con Media Móvil)', isVisible: true },
                { id: 'methaneTrend', title: 'Evolución Calidad de Biogás (% CH4)', isVisible: true },
                { id: 'biogasComposition', title: 'Composición de Biogás (CH4 vs CO2)', isVisible: false },
                { id: 'h2sTrend', title: 'Tendencia de Sulfhídrico (H2S)', isVisible: false },
                { id: 'substrateMix', title: 'Mezcla de Sustratos (Total)', isVisible: true },
                { id: 'dietEvolution', title: 'Evolución de la Dieta (t/día)', isVisible: false },
                { id: 'productionVsFeed', title: 'Correlación: Producción vs. Alimentación', isVisible: true },
                { id: 'revenueProjection', title: 'Proyección de Ingresos Estimados ($)', isVisible: true },
                { id: 'organicLoadingRate', title: 'Tasa de Carga Orgánica (Proxy)', isVisible: true },
                { id: 'gasProductionRate', title: 'Tasa de Producción de Gas', isVisible: false },
                { id: 'specificGasProduction', title: 'Producción Específica de Gas', isVisible: true },
                { id: 'energyVsChpHours', title: 'Correlación: Energía vs. Horas CHP', isVisible: false },
                { id: 'fosTacAbsolute', title: 'Tendencia de FOS y TAC (Absolutos)', isVisible: false },
                { id: 'autoconsumptionTrend', title: 'Tendencia de Autoconsumo (%)', isVisible: false },
                { id: 'weeklyEnergy', title: 'Producción Semanal de Energía', isVisible: true },
                { id: 'methaneProductionRate', title: 'Tasa de Producción de Metano', isVisible: false },
            ],
            toggleChart: (id) => {
                set((state) => ({
                    charts: state.charts.map((chart) =>
                        chart.id === id ? { ...chart, isVisible: !chart.isVisible } : chart
                    ),
                }));
            },
        }),
        {
            name: 'graphs-page-config-storage',
        }
    )
);