import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChartId = 
    'energyProduction' | 'dailySubstrate' | 'productionEfficiency' | 'chpUptime' |
    'fosTacRatio' | 'methaneTrend' | 'biogasComposition' | 'h2sTrend' | 'substrateMix' |
    'dietEvolution' | 'productionVsFeed' | 'revenueProjection' | 'organicLoadingRate' |
    'gasProductionRate' | 'specificGasProduction' | 'energyVsChpHours' | 'fosTacAbsolute' |
    'autoconsumptionTrend' | 'weeklyEnergy' | 'methaneProductionRate' | 'substrateCost' | 
    'engineAvailability' | 'substrateCompositionTimeline' | 'materialBalance' |
    // FIX: Added 'substrateEvolution' to the ChartId union type to resolve the type error.
    'contractPerformance' | 'annualGoalGauge' | 'substrateEvolution';

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
                { id: 'materialBalance', title: 'Balance de Materiales (Anual)', isVisible: true },
                { id: 'engineAvailability', title: 'Disponibilidad del Motor (%)', isVisible: true },
                { id: 'contractPerformance', title: 'Rendimiento de Contratos (MWh)', isVisible: true },
                { id: 'annualGoalGauge', title: 'Progreso vs Objetivo Anual', isVisible: true },
                { id: 'substrateEvolution', title: 'Evolución de Sustratos (Tn)', isVisible: true },
                { id: 'substrateCost', title: 'Costos de Sustrato vs Ingresos (USD)', isVisible: true },
                { id: 'substrateCompositionTimeline', title: 'Composición de la Dieta (t/día)', isVisible: false },
                { id: 'energyProduction', title: 'Producción vs. Consumo de Energía', isVisible: false },
                { id: 'chpUptime', title: 'Disponibilidad Diaria del Motor (CHP)', isVisible: false },
                { id: 'fosTacAbsolute', title: 'Tendencia de FOS y TAC (Absolutos)', isVisible: false },
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