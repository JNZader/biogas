import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type KpiId = 'generacion' | 'biogas' | 'fosTac' | 'ch4' | 'consumoChp' | 'fos' | 'tac' | 'ph' | 'temperatura' | 'h2s';

interface KpiConfig {
    id: KpiId;
    title: string;
    isVisible: boolean;
}

interface DashboardState {
    kpis: KpiConfig[];
    toggleKpi: (id: KpiId) => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            kpis: [
                { id: 'generacion', title: 'Generación Eléctrica', isVisible: true },
                { id: 'biogas', title: 'Producción Biogás', isVisible: true },
                { id: 'consumoChp', title: 'Consumo Específico CHP', isVisible: true },
                { id: 'fosTac', title: 'Relación FOS/TAC', isVisible: true },
                { id: 'ch4', title: 'Calidad Gas (CH4)', isVisible: true },
                { id: 'fos', title: 'FOS', isVisible: false },
                { id: 'tac', title: 'TAC', isVisible: false },
                { id: 'ph', title: 'pH Digestor', isVisible: false },
                { id: 'temperatura', title: 'Temp. Digestor', isVisible: false },
                { id: 'h2s', title: 'H₂S Biogás', isVisible: false },
            ],
            toggleKpi: (id) => {
                set((state) => ({
                    kpis: state.kpis.map((kpi) =>
                        kpi.id === id ? { ...kpi, isVisible: !kpi.isVisible } : kpi
                    ),
                }));
            },
        }),
        {
            name: 'dashboard-config-storage',
        }
    )
);
