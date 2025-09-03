import React, { useState, useMemo } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { supabase } from '../services/supabaseClient';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import type { Database } from '../types/database';

type Tab = 'sustratos' | 'proveedores' | 'camiones' | 'lugaresDescarga' | 'equipos';
type Sustrato = Database['public']['Tables']['sustratos']['Row'];
type Proveedor = Database['public']['Tables']['empresa']['Row'];
type Camion = Database['public']['Tables']['camiones']['Row'];
type LugarDescarga = Database['public']['Tables']['lugares_descarga']['Row'];
type Equipo = Database['public']['Tables']['equipos']['Row'];

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none whitespace-nowrap ${
        active
          ? 'border-b-2 border-primary text-primary bg-blue-50'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
);

const ManagementPage: React.FC = () => {
    const { sustratos, proveedores, camiones, lugaresDescarga, equipos, loading: dataLoading, error: dataError, refreshData } = useSupabaseData();
    const [activeTab, setActiveTab] = useState<Tab>('sustratos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    
    const getTableName = (tab: Tab): 'sustratos' | 'empresa' | 'camiones' | 'lugares_descarga' | 'equipos' => {
        if (tab === 'proveedores') return 'empresa';
        if (tab === 'lugaresDescarga') return 'lugares_descarga';
        return tab;
    };

    const handleOpenModal = (mode: 'add' | 'edit', item: any | null = null) => {
        setModalMode(mode);
        setCurrentItem(item);
        setFormError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleDelete = async (id: number) => {
        const entityName = activeTab.slice(0, -1);
        const tableName = getTableName(activeTab);

        if (window.confirm(`¿Está seguro de que desea eliminar este ${entityName}?`)) {
            try {
                const { error } = await supabase.from(tableName).delete().eq('id', id);
                if (error) throw error;
                await refreshData();
            } catch (error: any) {
                alert(`Error al eliminar: ${error.message}`);
            }
        }
    };
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        const tableName = getTableName(activeTab);
        
        // Data transformations for specific tables
        if(activeTab === 'proveedores'){
            data.tipo_empresa = 'proveedor';
        }
        if(activeTab === 'camiones') {
            data.transportista_empresa_id = '1'; // Hardcoded for now
        }
        if(activeTab === 'equipos') {
            data.planta_id = '1'; // Hardcoded for demo
        }
        if(activeTab === 'lugaresDescarga' || activeTab === 'sustratos'){
            // No specific transformations needed for these tables from the form
        }

        try {
            let error;
            if (modalMode === 'add') {
                ({ error } = await supabase.from(tableName).insert(data as any));
            } else {
                ({ error } = await supabase.from(tableName).update(data as any).eq('id', currentItem.id));
            }
            if (error) throw error;
            
            await refreshData();
            handleCloseModal();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const renderTable = () => {
        const commonClasses = "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider";
        switch (activeTab) {
            case 'sustratos':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>Categoría</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {sustratos.map((item: Sustrato) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.categoria}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'proveedores':
                 return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>CUIT</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {proveedores.map((item: Proveedor) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.cuit}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
             case 'camiones':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Patente</th><th className={commonClasses}>Marca</th><th className={commonClasses}>Modelo</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {camiones.map((item: Camion) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.patente}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.marca}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.modelo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'lugaresDescarga':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>Tipo</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {lugaresDescarga.map((item: LugarDescarga) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.tipo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'equipos':
                return (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background"><tr><th className={commonClasses}>Nombre</th><th className={commonClasses}>Categoría</th><th className={commonClasses}>Código</th><th className={commonClasses}></th></tr></thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {equipos.map((item: Equipo) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{item.nombre_equipo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.categoria}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.codigo_equipo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <button onClick={() => handleOpenModal('edit', item)} className="p-1 text-primary hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default: return null;
        }
    };
    
    const renderModalForm = () => {
        switch (activeTab) {
            case 'sustratos':
                return (
                    <>
                        <InputField label="Nombre" id="nombre" name="nombre" type="text" defaultValue={currentItem?.nombre} required/>
                        <InputField label="Categoría" id="categoria" name="categoria" type="text" defaultValue={currentItem?.categoria} />
                        <InputField label="Descripción" id="descripcion" name="descripcion" type="textarea" defaultValue={currentItem?.descripcion} />
                    </>
                );
            case 'proveedores':
                return (
                     <>
                        <InputField label="Nombre" id="nombre" name="nombre" type="text" defaultValue={currentItem?.nombre} required/>
                        <InputField label="Razón Social" id="razon_social" name="razon_social" type="text" defaultValue={currentItem?.razon_social} />
                        <InputField label="CUIT" id="cuit" name="cuit" type="text" defaultValue={currentItem?.cuit} />
                    </>
                );
            case 'camiones':
                return (
                     <>
                        <InputField label="Patente" id="patente" name="patente" type="text" defaultValue={currentItem?.patente} required/>
                        <InputField label="Marca" id="marca" name="marca" type="text" defaultValue={currentItem?.marca} />
                        <InputField label="Modelo" id="modelo" name="modelo" type="text" defaultValue={currentItem?.modelo} />
                        <InputField label="Año" id="año" name="año" type="number" defaultValue={currentItem?.año} />
                    </>
                );
             case 'lugaresDescarga':
                return (
                     <>
                        <InputField label="Nombre" id="nombre" name="nombre" type="text" defaultValue={currentItem?.nombre} required/>
                        <InputField label="Tipo" id="tipo" name="tipo" type="text" defaultValue={currentItem?.tipo} placeholder="Ej: Playa, Tolva, Tanque"/>
                        <InputField label="Capacidad (m³)" id="capacidad_m3" name="capacidad_m3" type="number" defaultValue={currentItem?.capacidad_m3} />
                    </>
                );
            case 'equipos':
                return (
                    <>
                        <InputField label="Nombre del Equipo" id="nombre_equipo" name="nombre_equipo" type="text" defaultValue={currentItem?.nombre_equipo} required />
                        <InputField label="Categoría" id="categoria" name="categoria" type="text" defaultValue={currentItem?.categoria} placeholder="Ej: Bomba, Agitador" />
                        <InputField label="Código / Tag" id="codigo_equipo" name="codigo_equipo" type="text" defaultValue={currentItem?.codigo_equipo} placeholder="Ej: P-001" />
                        <InputField label="Marca" id="marca" name="marca" type="text" defaultValue={currentItem?.marca} />
                        <InputField label="Modelo" id="modelo" name="modelo" type="text" defaultValue={currentItem?.modelo} />
                    </>
                );
            default: return null;
        }
    };

    const { title, data } = useMemo(() => {
        switch (activeTab) {
            case 'sustratos': return { title: 'Sustratos', data: sustratos };
            case 'proveedores': return { title: 'Proveedores', data: proveedores };
            case 'camiones': return { title: 'Camiones', data: camiones };
            case 'lugaresDescarga': return { title: 'Lugares de Descarga', data: lugaresDescarga };
            case 'equipos': return { title: 'Equipos', data: equipos };
        }
    }, [activeTab, sustratos, proveedores, camiones, lugaresDescarga, equipos]);

    return (
        <Page>
            <div className="mb-4 border-b border-gray-200">
                <div className="overflow-x-auto">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <TabButton active={activeTab === 'sustratos'} onClick={() => setActiveTab('sustratos')}>Sustratos</TabButton>
                        <TabButton active={activeTab === 'proveedores'} onClick={() => setActiveTab('proveedores')}>Proveedores</TabButton>
                        <TabButton active={activeTab === 'camiones'} onClick={() => setActiveTab('camiones')}>Camiones</TabButton>
                        <TabButton active={activeTab === 'lugaresDescarga'} onClick={() => setActiveTab('lugaresDescarga')}>Lugares Descarga</TabButton>
                        <TabButton active={activeTab === 'equipos'} onClick={() => setActiveTab('equipos')}>Equipos</TabButton>
                    </nav>
                </div>
            </div>

            {dataError && <Card><p className="text-red-500">{dataError}</p></Card>}

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-text-primary">Gestionar {title}</h2>
                    <Button onClick={() => handleOpenModal('add')} variant="secondary" className="w-auto px-4 py-2 text-sm flex items-center gap-2">
                        <PlusCircleIcon className="h-5 w-5" />
                        Añadir Nuevo
                    </Button>
                </div>

                {dataLoading ? <p>Cargando datos...</p> : (
                    <div className="overflow-x-auto">
                        {data.length > 0 ? renderTable() : <p className="text-center text-text-secondary py-4">No hay {title.toLowerCase()} para mostrar.</p>}
                    </div>
                )}
            </Card>
            
            <Modal title={`${modalMode === 'add' ? 'Añadir' : 'Editar'} ${title.slice(0, -1)}`} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {renderModalForm()}
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal} className="w-auto bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</Button>
                        <Button type="submit" variant="primary" className="w-auto" isLoading={formLoading}>
                            {modalMode === 'add' ? 'Guardar' : 'Actualizar'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Page>
    );
};

export default ManagementPage;