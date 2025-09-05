import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type KpiId = 'generacion' | 'biogas' | 'fosTac' | 'ch4';

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
                { id: 'fosTac', title: 'FOS/TAC', isVisible: true },
                { id: 'ch4', title: 'Calidad Gas (CH4)', isVisible: true },
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