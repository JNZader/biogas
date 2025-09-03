import React from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';

const InputsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const addNotification = useNotificationStore(s => s.addNotification);

    const { data: sustratos = [], isLoading: sustratosLoading, error: sustratosError } = useQuery({ queryKey: ['sustratos'], queryFn: api.fetchSustratos });
    const { data: proveedores = [], isLoading: proveedoresLoading, error: proveedoresError } = useQuery({ queryKey: ['proveedores'], queryFn: api.fetchProveedores });
    const { data: lugaresDescarga = [], isLoading: lugaresLoading, error: lugaresError } = useQuery({ queryKey: ['lugaresDescarga'], queryFn: api.fetchLugaresDescarga });
    const { data: camiones = [], isLoading: camionesLoading, error: camionesError } = useQuery({ queryKey: ['camiones'], queryFn: api.fetchCamiones });
    
    const dataLoading = sustratosLoading || proveedoresLoading || lugaresLoading || camionesLoading;
    const error = sustratosError || proveedoresError || lugaresError || camionesError;

    const mutation = useMutation({
        mutationFn: api.createIngresoSustrato,
        onSuccess: () => {
            addNotification('Ingreso registrado con éxito!', 'success');
            queryClient.invalidateQueries({ queryKey: ['ingresos'] }); // Invalidate if there's a history list
        },
        onError: (err: Error) => {
            addNotification(`Error al registrar: ${err.message}`, 'error');
            console.error(err);
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        mutation.mutate(data);
        if(!mutation.isError) {
            e.currentTarget.reset();
        }
    };

    const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    if (error) {
        return (
            <Page>
                <Card>
                    <h2 className="text-lg font-semibold text-error mb-2">Error de Carga</h2>
                    <p className="text-text-secondary">No se pudieron cargar los datos necesarios para el formulario (sustratos, proveedores, etc.).</p>
                    <pre className="mt-4 p-2 bg-background text-error text-xs rounded overflow-x-auto">{error.message}</pre>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            <Card>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Registro de Ingreso de Sustratos</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <fieldset>
                        <legend className="text-base font-semibold text-text-primary">Datos del Viaje</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                             <div>
                                <label htmlFor="camion_id" className="block text-sm font-medium text-text-secondary">Camión</label>
                                <select id="camion_id" name="camion_id" required className={commonSelectClasses} disabled={dataLoading}>
                                    <option value="">{dataLoading ? 'Cargando...' : 'Seleccione patente'}</option>
                                    {camiones.map(c => <option key={c.id} value={c.id}>{c.patente}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="remito" className="block text-sm font-medium text-text-secondary">N° Remito</label>
                                <input type="text" id="remito" name="remito" required className={commonInputClasses} />
                            </div>
                        </div>
                    </fieldset>
                    
                    <fieldset>
                        <legend className="text-base font-semibold text-text-primary">Detalle de la Carga</legend>
                        <div className="space-y-4 mt-2">
                             <div>
                                <label htmlFor="provider" className="block text-sm font-medium text-text-secondary">Proveedor</label>
                                <select id="provider" name="provider" required className={commonSelectClasses} disabled={dataLoading}>
                                    <option value="">{dataLoading ? 'Cargando...' : 'Seleccione proveedor'}</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="substrate" className="block text-sm font-medium text-text-secondary">Sustrato</label>
                                <select id="substrate" name="substrate" required className={commonSelectClasses} disabled={dataLoading}>
                                    <option value="">{dataLoading ? 'Cargando...' : 'Seleccione sustrato'}</option>
                                    {sustratos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-text-secondary">Cantidad (Peso Neto kg)</label>
                                <input type="number" id="quantity" name="quantity" required className={commonInputClasses} />
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-text-secondary">Lugar de Descarga</label>
                                <select id="location" name="location" required className={commonSelectClasses} disabled={dataLoading}>
                                    <option value="">{dataLoading ? 'Cargando...' : 'Seleccione lugar'}</option>
                                    {lugaresDescarga.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    </fieldset>
                                        
                    <Button type="submit" variant="primary" isLoading={mutation.isPending || dataLoading} disabled={dataLoading}>Registrar Ingreso</Button>
                </form>
            </Card>
        </Page>
    );
};

export default InputsPage;