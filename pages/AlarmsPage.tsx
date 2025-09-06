import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { cn, exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { useToast } from '../hooks/use-toast';
import { customAlertsStore } from '../stores/customAlertsStore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { Label } from '../components/ui/Label';
import { useSortableData } from '../hooks/useSortableData';
import { SortableHeader } from '../components/ui/SortableHeader';


import { 
    BellAlertIcon, 
    TrashIcon,
    ArrowDownTrayIcon,
    WrenchScrewdriverIcon,
    ChevronDownIcon,
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

// --- Co-located Zod Schema ---
// FIX: Replaced `z.coerce.number()` with `z.number()` to resolve type inference issues with react-hook-form. The `onChange` handler for the input already provides a numeric value using `e.target.valueAsNumber`, so the previous schema was causing a type mismatch.
const alertRuleSchema = z.object({
  parameter: z.enum(['fosTac', 'ch4']),
  condition: z.enum(['gt', 'lt', 'eq']),
  value: z.number({invalid_type_error: "El valor debe ser un número."}).positive("El valor debe ser positivo."),
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

const ExportButton: React.FC<{ data: Record<string, any>[]; filename: string; disabled?: boolean; }> = ({ data, filename, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
        setIsOpen(false);
        if (format === 'csv') {
            exportToCsv(`${filename}.csv`, data);
        } else if (format === 'xlsx') {
            exportToXlsx(filename, data);
        } else if (format === 'pdf') {
            exportToPdf(filename, data);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={disabled}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDownIcon className={cn("h-4 w-4 ml-1 transition-transform", { "rotate-180": isOpen })} />
            </Button>
            <div className={cn(
                "absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 z-10 transition-all duration-100 ease-out",
                isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}>
                <div className="py-1" role="menu" aria-orientation="vertical">
                    <button onClick={() => handleExport('csv')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                        Exportar como CSV
                    </button>
                    <button onClick={() => handleExport('xlsx')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                        Exportar como XLSX
                    </button>
                    <button onClick={() => handleExport('pdf')} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background" role="menuitem">
                        Exportar como PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <span className={cn('px-2 inline-flex text-xs leading-5 font-semibold rounded-full', className)}>
        {children}
    </span>
);


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
    
    // Combine and normalize system and custom alerts
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
        
        return [...normalizedSystemAlarms, ...normalizedCustomAlerts];
    }, [systemAlarms, triggeredAlerts]);

    const filteredAlarms = useMemo(() => {
        return allAlarms.filter(alarm => {
            const severityMatch = severityFilter === 'all' || alarm.severity === severityFilter;
            const statusMatch = statusFilter === 'all' || (statusFilter === 'resolved' ? alarm.isResolved : !alarm.isResolved);
            return severityMatch && statusMatch;
        });
    }, [allAlarms, severityFilter, statusFilter]);

    const { items: sortedAlarms, requestSort, sortConfig } = useSortableData(filteredAlarms, { key: 'timestamp', direction: 'descending' });

    const getSeverityBadgeClass = useCallback((severity: Severity) => {
        switch (severity) {
            case 'critical': return 'bg-error-bg text-error';
            case 'warning': return 'bg-warning-bg text-warning';
            default: return 'bg-info-bg text-info';
        }
    }, []);

    const handleCreateTask = (alarm: AlarmDisplayItem) => {
        // FIX: Used an updater function for the 'state' property to comply with TanStack Router's type definitions and resolve the 'prefillTask' property error.
        navigate({
            to: '/maintenance',
            state: (old) => ({
                ...old,
                prefillTask: {
                    descripcion_problema: `Basado en la alarma: ${alarm.alarmType} - ${alarm.description}`,
                    equipo_id: alarm.equipoId
                }
            })
        });
    };
    
    const dataToExport = useMemo(() => sortedAlarms.map(item => ({
        Fecha: new Date(item.timestamp).toLocaleString('es-AR'),
        Tipo: item.alarmType,
        Severidad: item.severity.toUpperCase(),
        Descripción: item.description,
        Estado: item.isResolved ? 'Resuelta' : 'Activa',
    })), [sortedAlarms]);

    const commonTableClasses = {
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    if (isLoading) {
        return <Page><Card><CardContent className="pt-6"><p className="text-center text-text-secondary">Cargando alarmas...</p></CardContent></Card></Page>;
    }

    return (
        <Page className="space-y-6">
            <CustomAlertsConfig />
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <CardTitle>Historial de Alarmas</CardTitle>
                        <div className="flex items-center gap-4">
                             <div>
                                <Label htmlFor="severity-filter">Severidad</Label>
                                <Select id="severity-filter" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                                    <option value="all">Todas</option>
                                    <option value="critical">Crítica</option>
                                    <option value="warning">Advertencia</option>
                                    <option value="info">Info</option>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="status-filter">Estado</Label>
                                <Select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="all">Todos</option>
                                    <option value="active">Activas</option>
                                    <option value="resolved">Resueltas</option>
                                </Select>
                            </div>
                            <ExportButton data={dataToExport} filename="historial_alarmas" disabled={sortedAlarms.length === 0} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* FIX: Use error.message to display the error string instead of passing the Error object directly as a ReactNode. */}
                    {error && <p className="text-center text-error mb-4">{error.message}</p>}
                    {sortedAlarms.length === 0 ? (
                        <EmptyState
                            icon={<BellAlertIcon className="mx-auto h-12 w-12" />}
                            title="Sin Alarmas"
                            message="No hay alarmas que coincidan con los filtros seleccionados."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-border">
                               <thead className="bg-background">
                                   <tr>
                                       <SortableHeader columnKey="timestamp" title="Fecha y Hora" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="alarmType" title="Tipo de Alarma" sortConfig={sortConfig} onSort={requestSort} />
                                       <SortableHeader columnKey="severity" title="Severidad" sortConfig={sortConfig} onSort={requestSort} />
                                       <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Descripción</th>
                                       <th className="relative px-4 py-3"><span className="sr-only">Acciones</span></th>
                                   </tr>
                               </thead>
                               <tbody className="bg-surface divide-y divide-border">
                                   {sortedAlarms.map(alarm => (
                                       <tr key={alarm.id} className={cn({ 'bg-amber-50': !alarm.isResolved && alarm.severity === 'warning', 'bg-red-50': !alarm.isResolved && alarm.severity === 'critical' })}>
                                           <td className={`${commonTableClasses.cell} text-text-secondary`}>{new Date(alarm.timestamp).toLocaleString('es-AR')}</td>
                                           <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{alarm.alarmType}</td>
                                           <td className={commonTableClasses.cell}><Badge className={getSeverityBadgeClass(alarm.severity)}>{alarm.severity.toUpperCase()}</Badge></td>
                                           <td className={`${commonTableClasses.cell} text-text-primary max-w-sm truncate`}>{alarm.description}</td>
                                           <td className={`${commonTableClasses.cell} text-right`}>
                                                {!alarm.isResolved && !alarm.isCustom && (
                                                    <Button variant="outline" size="sm" onClick={() => handleCreateTask(alarm)}>
                                                        <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                                                        Crear Tarea
                                                    </Button>
                                                )}
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
