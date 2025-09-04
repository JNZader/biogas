import React, { useState, useMemo } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import EmptyState from '../EmptyState';
import { ArchiveBoxIcon } from '@heroicons/react/24/solid';

export interface ColumnDef<T> {
    header: string;
    accessorKey: keyof T;
    cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    filterColumn: keyof T;
    onEdit: (item: T) => void;
    onDelete: (item: T) => void;
}

export function DataTable<T extends { id: any }>({ columns, data, filterColumn, onEdit, onDelete }: DataTableProps<T>) {
    const [filter, setFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredData = useMemo(() => {
        if (!filter) return data;
        return data.filter(item => {
            const value = item[filterColumn];
            // Ensure value is a string before calling toLowerCase
            return value && typeof value === 'string' && value.toLowerCase().includes(filter.toLowerCase());
        });
    }, [data, filter, filterColumn]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const commonClasses = "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider";

    return (
        <div className="space-y-4">
            <Input
                placeholder={`Filtrar por ${String(filterColumn)}...`}
                value={filter}
                onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1); // Reset to first page on filter change
                }}
                className="max-w-sm"
            />
            <div className="overflow-x-auto border border-border rounded-lg">
                 <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                        <tr>
                            {columns.map(col => <th key={String(col.accessorKey)} className={commonClasses}>{col.header}</th>)}
                            <th className="relative px-4 py-3"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {paginatedData.length === 0 ? (
                             <tr>
                                <td colSpan={columns.length + 1}>
                                     <EmptyState
                                        icon={<ArchiveBoxIcon className="mx-auto h-12 w-12" />}
                                        title="No se encontraron resultados"
                                        message={filter ? "Intente ajustar su búsqueda." : "No hay datos para mostrar."}
                                    />
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((item) => (
                                <tr key={item.id}>
                                    {columns.map(col => (
                                        <td key={String(col.accessorKey)} className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                                            {col.cell ? col.cell(item) : <span className="text-text-primary">{String(item[col.accessorKey] ?? '')}</span>}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label={`Editar ${item.id}`}><PencilIcon className="h-5 w-5"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="text-error" aria-label={`Eliminar ${item.id}`}><TrashIcon className="h-5 w-5"/></Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
             {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-text-secondary">
                        Página {currentPage} de {totalPages}
                    </span>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                    </div>
                </div>
            )}
        </div>
    );
}