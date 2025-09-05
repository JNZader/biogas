import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChartId = 
    'energyProduction' | 'dailySubstrate' | 'productionEfficiency' | 'chpUptime' |
    'fosTacRatio' | 'methaneTrend' | 'biogasComposition' | 'h2sTrend' | 'substrateMix' |
    'dietEvolution' | 'productionVsFeed' | 'revenueProjection' | 'organicLoadingRate' |
    'gasProductionRate' | 'specificGasProduction' | 'energyVsChpHours' | 'fosTacAbsolute' |
    'autoconsumptionTrend' | 'weeklyEnergy' | 'methaneProductionRate' | 'substrateCost' | 
    'engineAvailability' | 'substrateCompositionTimeline';

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
                { id: 'substrateCost', title: 'Costos de Sustrato vs Ingresos (USD)', isVisible: true },
                { id: 'engineAvailability', title: 'Disponibilidad del Motor (%)', isVisible: true },
                { id: 'substrateCompositionTimeline', title: 'Composición de la Dieta (Timeline)', isVisible: true },
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
