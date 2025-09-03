import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import KpiCard from '../components/KpiCard';
import Card from '../components/Card';
import Page from '../components/Page';
import { BoltIcon, FireIcon, BeakerIcon, AdjustmentsHorizontalIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import type { KpiCardProps } from '../types';
import * as api from '../services/api';
import { useThemeColors } from '../stores/useThemeColors';

type KpiData = {
  generacion: string;
  biogas: string;
  fosTac: string;
  ch4: string;
};

type PlantStatus = 'operational' | 'warning' | 'critical';

const PlantStatusCard: React.FC<{ status: PlantStatus; fosTac: number; ch4: number }> = ({ status, fosTac, ch4 }) => {
    const statusConfig = {
        operational: {
            icon: <CheckCircleIcon className="h-10 w-10 text-success" />,
            title: "Operacional",
            message: "Todos los sistemas funcionan correctamente.",
            bgColor: "bg-success-bg",
            textColor: "text-success",
            borderColor: "border-success",
        },
        warning: {
            icon: <ExclamationTriangleIcon className="h-10 w-10 text-warning" />,
            title: "Advertencia",
            message: `Revisar FOS/TAC (${fosTac.toFixed(2)}) o Nivel de CH4 (${ch4.toFixed(1)}%).`,
            bgColor: "bg-warning-bg",
            textColor: "text-warning",
            borderColor: "border-warning",
        },
        critical: {
            icon: <XCircleIcon className="h-10 w-10 text-error" />,
            title: "Crítico",
            message: `FOS/TAC (${fosTac.toFixed(2)}) fuera de los límites seguros.`,
            bgColor: "bg-error-bg",
            textColor: "text-error",
            borderColor: "border-error",
        }
    };

    const config = statusConfig[status];

    return (
        <Card className={`${config.bgColor} border-l-4 ${config.borderColor}`}>
            <div className="flex items-center space-x-4">
                <div>{config.icon}</div>
                <div>
                    <h2 className={`text-lg font-bold ${config.textColor}`}>{config.title}</h2>
                    <p className={`text-sm ${config.textColor}`}>{config.message}</p>
                </div>
            </div>
        </Card>
    );
};


const HomePage: React.FC = () => {
  const themeColors = useThemeColors();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: api.fetchDashboardData,
  });

  const { kpiData, chartData } = data || { kpiData: null, chartData: [] };

  const kpis: KpiCardProps[] = [
    { title: 'Generación Eléctrica', value: kpiData?.generacion || '...', unit: 'MWh', trend: 2.5, icon: <BoltIcon className="h-6 w-6" /> },
    { title: 'Producción Biogás', value: kpiData?.biogas || '...', unit: 'kg/d', trend: -1.2, icon: <FireIcon className="h-6 w-6" /> },
    { title: 'FOS/TAC', value: kpiData?.fosTac || '...', trend: 5.0, icon: <BeakerIcon className="h-6 w-6" /> },
    { title: 'Calidad Gas (CH4)', value: kpiData?.ch4 || '...', unit: '%', trend: 0.5, icon: <AdjustmentsHorizontalIcon className="h-6 w-6" /> },
  ];

  const plantStatus: PlantStatus = useMemo(() => {
    if (!kpiData) return 'warning';
    const fosTac = parseFloat(kpiData.fosTac);
    const ch4 = parseFloat(kpiData.ch4);
    
    if (fosTac > 0.45) return 'critical';
    if (fosTac > 0.35 || ch4 < 52) return 'warning';
    return 'operational';
  }, [kpiData]);

  if (isLoading) {
    return <Page><Card><p className="text-center text-text-secondary">Cargando dashboard...</p></Card></Page>
  }

  if (error) {
    return (
        <Page>
            <Card>
                <h2 className="text-lg font-semibold text-error mb-2">Error al Cargar el Dashboard</h2>
                <p className="text-text-secondary">No se pudieron obtener los datos. Verifique la configuración de la base de datos y su conexión a internet.</p>
                <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto whitespace-pre-wrap">{error.message}</pre>
            </Card>
        </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-6">
        <PlantStatusCard 
            status={plantStatus}
            fosTac={parseFloat(kpiData?.fosTac || '0')}
            ch4={parseFloat(kpiData?.ch4 || '0')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </div>

        <div>
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Producción Semanal</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))"/>
                            <XAxis dataKey="name" stroke={themeColors.textSecondary} fontSize={12}/>
                            <YAxis stroke={themeColors.textSecondary} fontSize={12} />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: 'rgba(var(--color-surface), 0.8)',
                                    backdropFilter: 'blur(5px)',
                                    border: '1px solid rgb(var(--color-border))',
                                    borderRadius: '0.5rem',
                                    color: 'rgb(var(--color-text-primary))'
                                 }}
                            />
                            <Legend wrapperStyle={{fontSize: '14px', color: themeColors.textSecondary}}/>
                            <Bar dataKey="Biogás (kg)" fill={themeColors.secondary} name="Biogás" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Electricidad (kWh)" fill={themeColors.primary} name="Electricidad" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
      </div>
    </Page>
  );
};

export default HomePage;