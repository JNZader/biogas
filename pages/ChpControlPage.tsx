import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Page from '../components/Page';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { ArrowDownTrayIcon, ChevronDownIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { exportToCsv, exportToPdf, exportToXlsx } from '../lib/utils';
import { PlantaId } from '../types/branded';
import { cn } from '../lib/utils';
import { useSortableData } from '../hooks/useSortableData';
import { SortableHeader } from '../components/ui/SortableHeader';

type ChpChangeRecord = Database['public']['Tables']['cambios_potencia_chp']['Row'];
interface EnrichedChpChangeRecord extends ChpChangeRecord {
    usuarios?: { nombres: string } | null;
}


// --- Co-located Zod Schema ---
const chpSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  time: z.string().min(1, "La hora es requerida."),
  initial_power: z.coerce.number({ invalid_type_error: "Debe ser un número."}).nonnegative("El valor no puede ser negativo."),
  programmed_power: z.coerce.number({ invalid_type_error: "Debe ser un número."}).nonnegative("El valor no puede ser negativo."),
  reason: z.string().min(1, "El motivo es requerido."),
  observations: z.string().optional(),
});
type ChpFormData = z.infer<typeof chpSchema>;

// --- Co-located API Logic ---
const fetchChpHistory = async (plantaId: PlantaId): Promise<EnrichedChpChangeRecord[]> => {
    const { data, error } = await supabase
        .from('cambios_potencia_chp')
        .select('*, usuarios(nombres)')
        .eq('planta_id', plantaId)
        .order('fecha_hora', { ascending: false })
        .limit(15);
    if (error) throw error;
    return (data as EnrichedChpChangeRecord[]) || [];
};

const createChpChange = async (newData: Omit<ChpChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('cambios_potencia_chp').insert(newData);
    if (error) throw error;
};

// --- Co-located Export Component ---
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


const ChpControlPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { activePlanta, publicProfile } = useAuth();

    const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery({
        queryKey: ['chpHistory', activePlanta?.id],
        queryFn: () => fetchChpHistory(activePlanta!.id as PlantaId),
        enabled: !!activePlanta,
    });
    
    const displayHistory = useMemo(() => history.map(item => ({
        ...item,
        operador_nombre: item.usuarios?.nombres ?? 'N/A',
    })), [history]);

    const { items: sortedHistory, requestSort, sortConfig } = useSortableData(displayHistory, { key: 'fecha_hora', direction: 'descending' });

    const mutation = useMutation({
        mutationFn: createChpChange,
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Cambio de potencia guardado con éxito.' });
            queryClient.invalidateQueries({ queryKey: ['chpHistory'] });
            form.reset({
                 date: new Date().toISOString().split('T')[0],
                 time: new Date().toTimeString().slice(0, 5),
            });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: `Error al guardar: ${err.message}`, variant: 'destructive' });
        }
    });

    const form = useForm<ChpFormData>({
        resolver: zodResolver(chpSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            initial_power: undefined,
            programmed_power: undefined,
            reason: '',
            observations: '',
        }
    });

    const motivos = [
        'Corte de Luz', 'Microcorte tensión', 'Falta de gas', 'Falla Chiller', 'Falla CHP',
        'Mantenimiento CHP', 'Mantenimiento de otros equipos', 'Otro (especificar en observaciones)'
    ];
  
    const onSubmit = (formData: ChpFormData) => {
        if (!activePlanta || !publicProfile) {
            toast({ title: 'Error', description: 'No se ha podido identificar el usuario o la planta activa.', variant: 'destructive' });
            return;
        }
        
        const changeData = {
            planta_id: activePlanta.id,
            usuario_operador_id: publicProfile.id,
            fecha_hora: `${formData.date}T${formData.time}:00`,
            potencia_inicial_kw: formData.initial_power,
            potencia_programada_kw: formData.programmed_power,
            motivo_cambio: formData.reason,
            observaciones: formData.observations || null,
        };
        mutation.mutate(changeData);
    };
  
    const dataToExport = sortedHistory.map(item => ({
        fecha_hora: new Date(item.fecha_hora).toLocaleString('es-AR'),
        potencia_inicial_kw: item.potencia_inicial_kw,
        potencia_programada_kw: item.potencia_programada_kw,
        motivo: item.motivo_cambio,
        operador: item.operador_nombre,
        observaciones: item.observaciones,
    }));

    const commonTableClasses = {
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-1">Carga de Potencia del Motor (CHP)</h2>
                    <p className="text-sm text-text-secondary mb-4">Registrar los cambios de potencia y sus motivos.</p>
                    <Form {...form}>
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="time" render={({ field }) => (
                                    <FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="initial_power" render={({ field }) => (
                                    <FormItem><FormLabel>Potencia Inicial (kW)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="programmed_power" render={({ field }) => (
                                    <FormItem><FormLabel>Potencia Programada (kW)</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="reason" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo del Cambio</FormLabel>
                                    <FormControl>
                                        <Select {...field}>
                                            <option value="">Seleccione un motivo</option>
                                            {motivos.map(motivo => <option key={motivo} value={motivo}>{motivo}</option>)}
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="observations" render={({ field }) => (
                                <FormItem><FormLabel>Observaciones (Opcional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="pt-4">
                                <Button type="submit" variant="default" isLoading={mutation.isPending}>Guardar Cambio</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Historial de Cambios Recientes</h3>
                        <ExportButton data={dataToExport} filename="historial_cambios_chp" disabled={sortedHistory.length === 0} />
                    </div>
                    {historyLoading ? (
                        <p className="text-center text-text-secondary">Cargando historial...</p>
                    ) : historyError ? (
                        <p className="text-center text-red-500">Error al cargar el historial: {historyError.message}</p>
                    ) : sortedHistory.length === 0 ? (
                        <p className="text-center text-text-secondary py-4">No hay cambios de potencia registrados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <SortableHeader columnKey="fecha_hora" title="Fecha y Hora" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="potencia_inicial_kw" title="Pot. Inicial (kW)" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="potencia_programada_kw" title="Pot. Programada (kW)" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="motivo_cambio" title="Motivo" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader columnKey="operador_nombre" title="Operador" sortConfig={sortConfig} onSort={requestSort} />
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Obs.</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {sortedHistory.map(item => (
                                        <tr key={item.id}>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>
                                                {new Date(item.fecha_hora).toLocaleString('es-AR')}
                                            </td>
                                            <td className={`${commonTableClasses.cell} text-text-primary`}>
                                                {item.potencia_inicial_kw}
                                            </td>
                                             <td className={`${commonTableClasses.cell} text-text-primary`}>
                                                {item.potencia_programada_kw}
                                            </td>
                                            <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>
                                                {item.motivo_cambio}
                                            </td>
                                            <td className={`${commonTableClasses.cell} text-text-secondary`}>
                                                {item.operador_nombre}
                                            </td>
                                            <td className={`${commonTableClasses.cell} text-center`}>
                                                {item.observaciones && (
                                                    <div title={item.observaciones}>
                                                        <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-text-secondary cursor-pointer" />
                                                    </div>
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

export default ChpControlPage;