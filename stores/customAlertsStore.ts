import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Severity = 'info' | 'warning' | 'critical';
type Condition = 'gt' | 'lt' | 'eq';
type Parameter = 'fosTac' | 'ch4';

export interface AlertRule {
    id: string;
    parameter: Parameter;
    condition: Condition;
    value: number;
    severity: Severity;
}

export interface TriggeredAlert {
    id: string;
    ruleId: string;
    timestamp: string;
    description: string;
    severity: Severity;
}

interface CustomAlertsState {
    rules: AlertRule[];
    triggeredAlerts: TriggeredAlert[];
    addRule: (rule: AlertRule) => void;
    removeRule: (ruleId: string) => void;
    evaluateAlerts: (kpis: { fosTac: number; ch4: number }) => void;
}

export const customAlertsStore = create<CustomAlertsState>()(
    persist(
        (set, get) => ({
            rules: [
                // Default rule for demonstration
                {
                    id: '1',
                    parameter: 'fosTac',
                    condition: 'gt',
                    value: 0.4,
                    severity: 'critical',
                }
            ],
            triggeredAlerts: [],

            addRule: (rule) => {
                set((state) => ({
                    rules: [...state.rules, rule],
                }));
            },

            removeRule: (ruleId) => {
                set((state) => ({
                    rules: state.rules.filter((rule) => rule.id !== ruleId),
                }));
            },

            evaluateAlerts: (kpis) => {
                const { rules, triggeredAlerts } = get();
                const newAlerts: TriggeredAlert[] = [];

                const parameterLabels = { fosTac: 'FOS/TAC', ch4: 'Calidad de Gas (CH4)' };
                const conditionLabels = { gt: '>', lt: '<', eq: '=' };

                rules.forEach((rule) => {
                    const kpiValue = rule.parameter === 'fosTac' ? kpis.fosTac : kpis.ch4;
                    if (isNaN(kpiValue)) return; // Skip if KPI data is not available

                    let isTriggered = false;
                    switch (rule.condition) {
                        case 'gt':
                            if (kpiValue > rule.value) isTriggered = true;
                            break;
                        case 'lt':
                            if (kpiValue < rule.value) isTriggered = true;
                            break;
                        case 'eq':
                            if (kpiValue === rule.value) isTriggered = true;
                            break;
                    }

                    if (isTriggered) {
                        const description = `Alerta: ${parameterLabels[rule.parameter]} (${kpiValue.toFixed(2)}) es ${conditionLabels[rule.condition]} ${rule.value}.`;
                        newAlerts.push({
                            id: `triggered-${Date.now()}-${Math.random()}`,
                            ruleId: rule.id,
                            timestamp: new Date().toISOString(),
                            description,
                            severity: rule.severity,
                        });
                    }
                });

                if (newAlerts.length > 0) {
                    set({
                        triggeredAlerts: [...newAlerts, ...triggeredAlerts].slice(0, 50), // Keep last 50 triggered alerts
                    });
                }
            },
        }),
        {
            name: 'custom-alerts-storage',
        }
    )
);
