import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import type { SortConfig } from '../../hooks/useSortableData';


interface SortableHeaderProps<T> {
    columnKey: keyof T;
    title: string;
    sortConfig: SortConfig<T> | null;
    onSort: (key: keyof T) => void;
    className?: string;
}

export const SortableHeader = <T extends object>({ columnKey, title, sortConfig, onSort, className }: SortableHeaderProps<T>) => {
    const isSorted = sortConfig?.key === columnKey;
    const Icon = isSorted ? (sortConfig?.direction === 'ascending' ? ArrowUpIcon : ArrowDownIcon) : ChevronUpDownIcon;
    const commonClasses = "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider";

    return (
        <th className={cn(commonClasses, className)}>
            <button className="flex items-center gap-1 hover:text-text-primary transition-colors" onClick={() => onSort(columnKey)}>
                {title}
                <Icon className="h-4 w-4" />
            </button>
        </th>
    );
};
