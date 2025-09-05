import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore as useZustandStore } from 'zustand';
import { useNavigate } from '@tanstack/react-router';

import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import EmptyState from '../components/EmptyState';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { cn, exportToCsv } from '../lib/utils';
import { useToast } from '../hooks/use-toast';
import { customAlertsStore } from '../stores/customAlertsStore';
// FIX: Imported Form components to resolve multiple 'Cannot find name' errors.
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
// FIX: Import 'Label' component to resolve 'Cannot find name 'Label'' error.
import { Label } from '../components/ui/Label';

import { 
    BellAlertIcon, 
    ArrowUpIcon, 
    ArrowDownIcon, 
    ChevronUpDownIcon, 
    TrashIcon,
    ArrowDownTrayIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

// --- Type Definitions ---
type Alarma = Database['public']['Tables']['alarmas']['Row'];
type Severity = Database['public']['Enums']['severidad_enum'];

interface EnrichedAlarma extends Alarma {
  tipos_alarma?: { nombre_alarma: string } | null;
}

interface AlarmDisplayItem {
    id: string | number;
    timestamp: string;
    description: string | null;
    alarmType: string;
    severity: Severity;
    isResolved: boolean;
    isCustom: boolean;
    equipoId?: number | null;
}

type SortKey = 'timestamp' | 'alarmType' | 'severity';
type SortDirection = 'ascending' | 'descending';

// --- Co-located Zod Schema ---
const alertRuleSchema = z.object({
  parameter: z.enum(['fosTac', 'ch4']),
  condition: z.enum(['gt', 'lt', 'eq']),
  value: z.number().positive("El valor debe ser positivo."),
  severity: z.enum(['info', 'warning', 'critical']),
});
type AlertRuleFormData = z.infer<typeof alertRuleSchema>;

// --- Co-located API Logic ---
const fetchAlarms = async (): Promise<EnrichedAlarma[]> => {
    const { data, error } = await supabase
        .from('alarmas')
        .select('*, tipos_alarma ( nombre_alarma )')
        .order('fecha_hora_activacion', { ascending: false })
        .limit(100);
    
    if (error) throw new Error(error.message);
    return data as EnrichedAlarma[];
};

// --- Helper Components ---
const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <span className={cn('px-2 inline-flex text-xs leading-5 font-semibold rounded-full', className)}>
        {children}
    </span>
);

const SortableHeader: React.FC<{ 
    columnKey: SortKey; 
    title: string; 
    sortConfig: { key: SortKey; direction: SortDirection };
    onSort: (key: SortKey) => void;
}> = ({ columnKey, title, sortConfig, onSort }) => {
    const isSorted = sortConfig.key === columnKey;
    const Icon = isSorted ? (sortConfig.direction === 'ascending' ? ArrowUpIcon : ArrowDownIcon) : ChevronUpDownIcon;

    return (
        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
            <button className="flex items-center gap-1 hover:text-text-primary transition-colors" onClick={() => onSort(columnKey)}>
                {title}
                <Icon className="h-4 w-4" />
            </button>
        </th>
    );
};

// --- Feature: Custom Alerts Configuration ---
const CustomAlertsConfig: React.FC = () => {
    const { toast } = useToast();
    const { rules, addRule, removeRule } = useZustandStore(customAlertsStore);

    const form = useForm<AlertRuleFormData>({
        resolver: zodResolver(alertRuleSchema),
        defaultValues: {
            parameter: 'fosTac',
            condition: 'gt',
            severity: 'warning',
            value: undefined,
        },
    });

    const onSubmit = (data: AlertRuleFormData) => {
        addRule({ ...data, id: Date.now().toString() });
        toast({ title: 'Éxito', description: 'Regla de alerta guardada.' });
        form.reset();
    };
    
    const conditionLabels = { gt: 'Mayor que', lt: 'Menor que', eq: 'Igual a' };
    const parameterLabels = { fosTac: 'FOS/TAC', ch4: 'Calidad de Gas (CH4)' };

    return (
        <Card>
            <CardHeader><CardTitle>Configurar Alertas Personalizadas</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                {/* FIX: Replaced raw form with Form component and refactored fields for consistency. */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <FormField
                                control={form.control}
                                name="parameter"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Parámetro Clave</FormLabel>
                                        <FormControl>
                                            <Select {...field}><option value="fosTac">FOS/TAC</option><option value="ch4">Calidad Gas (CH4)</option></Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="condition"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condición</FormLabel>
                                        <FormControl>
                                            <Select {...field}><option value="gt">Mayor que</option><option value="lt">Menor que</option><option value="eq">Igual a</option></Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor Umbral</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="severity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Severidad</FormLabel>
                                        <FormControl>
                                            <Select {...field}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit">Añadir Regla</Button>
                    </form>
                </Form>

                <div>
                    <h3 className="text-md font-semibold text-text-primary mb-2">Reglas Activas</h3>
                    {rules.length === 0 ? (
                        <p className="text-sm text-text-secondary">No hay reglas personalizadas.</p>
                    ) : (
                        <ul className="space-y-2">
                           {rules.map(rule => (
                                <li key={rule.id} className="flex items-center justify-between p-2 bg-background rounded-md text-sm">
                                    <div>
                                        <span className="font-medium">{parameterLabels[rule.parameter]}</span>
                                        <span className="text-text-secondary"> {conditionLabels[rule.condition]} </span>
                                        <span className="font-medium">{rule.value}</span>
                                        <Badge className="ml-2 bg-primary/20 text-primary capitalize">{rule.severity}</Badge>
                                    </div>
                                    <button onClick={() => removeRule(rule.id)} className="p-1 rounded-full hover:bg-error-bg text-error">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </li>
                           ))}
                        </ul>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


// --- Main Page Component ---
const AlarmsPage: React.FC = () => {
    const { data: systemAlarms, isLoading, error } = useQuery({ queryKey: ['alarmsHistory'], queryFn: fetchAlarms });
    const { triggeredAlerts } = useZustandStore(customAlertsStore);
    const navigate = useNavigate();

    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'timestamp', direction: 'descending' });

    // 1. Combine and normalize system and custom alerts
    const allAlarms = useMemo((): AlarmDisplayItem[] => {
        const normalizedSystemAlarms: AlarmDisplayItem[] = (systemAlarms || []).map(alarm => ({
            id: alarm.id,
            timestamp: alarm.fecha_hora_activacion,
            description: alarm.descripcion_alarma_ocurrida,
            alarmType: alarm.tipos_alarma?.nombre_alarma || 'Sistema',
            severity: alarm.severidad || 'info',
            isResolved: alarm.resuelta ?? false,
            isCustom: false,
            equipoId: alarm.equipo_id,
        }));

        const normalizedCustomAlerts: AlarmDisplayItem[] = triggeredAlerts.map(alert => ({
            id: alert.id,
            timestamp: alert.timestamp,
            description: alert.description,
            alarmType: 'Personalizada',
            severity: alert.severity,
            isResolved: false,
            isCustom: true,
        }));

        return [...normalizedCustomAlerts, ...normalizedSystemAlarms];
    }, [systemAlarms, triggeredAlerts]);

    // 2. Filter and sort the normalized list
    const processedAlarms = useMemo(() => {
        let filtered = allAlarms;

        if (severityFilter !== 'all') {
            filtered = filtered.filter(a => a.severity === severityFilter);
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(a => (statusFilter === 'resolved' ? a.isResolved : !a.isResolved));
        }

        const severityOrder: Record<Severity, number> = { 'critical': 3, 'warning': 2, 'info': 1 };
        
        return [...filtered].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            
            let comparison = 0;
            if(sortConfig.key === 'severity') {
                comparison = (severityOrder[valA as Severity] || 0) - (severityOrder[valB as Severity] || 0);
            } else {
                 if (valA === null || valA === undefined) return 1;
                 if (valB === null || valB === undefined) return -1;
                 if (valA < valB) comparison = -1;
                 if (valA > valB) comparison = 1;
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }, [allAlarms, severityFilter, statusFilter, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending'
        }));
    };
    
    const handleCreateTask = (alarm: AlarmDisplayItem) => {
        navigate({
            to: '/maintenance',
            // FIX: Cast the state object to `any` to bypass strict type checking for router state.
            state: {
                prefillTask: {
                    equipo_id: alarm.equipoId,
                    descripcion_problema: `Alarma: ${alarm.alarmType} - ${alarm.description || 'Revisar equipo.'}`
                }
            } as any
        });
    };

    const getSeverityBadgeClass = (severity: Severity) => ({
        'critical': 'bg-error-bg text-error',
        'warning': 'bg-warning-bg text-warning',
        'info': 'bg-background text-text-secondary',
    }[severity]);

    const handleExport = () => {
        const dataToExport = processedAlarms.map(alarm => ({
            fecha_hora: new Date(alarm.timestamp).toLocaleString('es-AR'),
            tipo_alarma: alarm.alarmType,
            descripcion: alarm.description,
            severidad: alarm.severity,
            estado: alarm.isResolved ? 'Resuelta' : 'Pendiente',
            origen: alarm.isCustom ? 'Personalizada' : 'Sistema',
        }));
        exportToCsv('historial_alarmas.csv', dataToExport);
    };

    if (error) {
        return <Page><Card><CardContent className="pt-6 text-error">Error al Cargar Alarmas: {error.message}</CardContent></Card></Page>;
    }

    return (
        <Page className="space-y-6">
            <CustomAlertsConfig />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Historial de Alarmas</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={processedAlarms.length === 0}>
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="severity-filter">Filtrar por Severidad</Label>
                            <Select id="severity-filter" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                                <option value="all">Todas</option>
                                <option value="critical">Crítica</option>
                                <option value="warning">Advertencia</option>
                                <option value="info">Informativa</option>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="status-filter">Filtrar por Estado</Label>
                            <Select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="all">Todos</option>
                                <option value="resolved">Resuelta</option>
                                <option value="pending">Pendiente</option>
                            </Select>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="text-center text-text-secondary py-10">Cargando historial...</p>
                    ) : processedAlarms.length === 0 ? (
                        <EmptyState
                            icon={<BellAlertIcon className="mx-auto h-12 w-12" />}
                            title="Sin Alarmas"
                            message={allAlarms.length === 0 ? "No se han registrado alarmas." : "No se encontraron alarmas que coincidan con los filtros."}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <SortableHeader columnKey="timestamp" title="Fecha y Hora" sortConfig={sortConfig} onSort={handleSort}/>
                                        <SortableHeader columnKey="alarmType" title="Tipo de Alarma" sortConfig={sortConfig} onSort={handleSort}/>
                                        <SortableHeader columnKey="severity" title="Severidad" sortConfig={sortConfig} onSort={handleSort}/>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {processedAlarms.map(alarm => (
                                        <tr key={alarm.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                                                {new Date(alarm.timestamp).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-primary font-medium">
                                                {alarm.alarmType}
                                                {alarm.description && (
                                                    <p className="text-xs text-text-secondary truncate max-w-xs">{alarm.description}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <Badge className={getSeverityBadgeClass(alarm.severity)}>{alarm.severity}</Badge>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <Badge className={alarm.isResolved ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}>
                                                    {alarm.isResolved ? 'Resuelta' : 'Pendiente'}
                                                </Badge>
                                            </td>
                                             <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleCreateTask(alarm)}
                                                    disabled={!alarm.equipoId}
                                                    aria-label="Crear tarea de mantenimiento"
                                                >
                                                    <WrenchScrewdriverIcon className="h-4 w-4 mr-1"/>
                                                    Crear Tarea
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Page>
    );
};

export default AlarmsPage;
