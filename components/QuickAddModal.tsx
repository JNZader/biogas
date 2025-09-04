import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';

type TableName = keyof Database['public']['Tables'];

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select';
    required?: boolean;
    options?: { value: string; label: string }[];
    defaultValue?: any;
}

interface QuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityName: string;
    tableName: TableName;
    formFields: FormField[];
    onSuccess: () => void;
    extraData?: { [key: string]: any };
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, entityName, tableName, formFields, onSuccess, extraData = {} }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const data: { [key: string]: any } = Object.fromEntries(formData.entries());
        
        // Convert number fields and foreign keys from selects
        formFields.forEach(field => {
            if (field.type === 'number' && data[field.name]) {
                data[field.name] = Number(data[field.name]);
            }
             // Heuristic: if a select's name ends with _id, it's likely a foreign key.
            if (field.type === 'select' && data[field.name] && field.name.endsWith('_id')) {
                data[field.name] = Number(data[field.name]);
            }
        });

        // Add any hardcoded values needed, e.g., planta_id
        if (['equipos', 'lugares_descarga'].includes(tableName)) {
            (data as any).planta_id = 1;
        }
       
        const dataToInsert = { ...data, ...extraData };

        try {
            const { error: insertError } = await supabase.from(tableName).insert(dataToInsert as any);
            if (insertError) throw insertError;

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(`Error al guardar: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Nuevo {entityName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                    {formFields.map((field) => (
                        <div key={field.name}>
                            <Label htmlFor={field.name}>{field.label}</Label>
                            {field.type === 'textarea' ? (
                                <Textarea id={field.name} name={field.name} required={field.required} className="mt-1" defaultValue={field.defaultValue}/>
                            ) : field.type === 'select' ? (
                                <Select id={field.name} name={field.name} required={field.required} className="mt-1" defaultValue={field.defaultValue}>
                                    <option value="">Seleccione una opción</option>
                                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Select>
                            ) : (
                                <Input id={field.name} name={field.name} type={field.type} required={field.required} className="mt-1" min={field.type === 'number' ? '0' : undefined} defaultValue={field.defaultValue}/>
                            )}
                        </div>
                    ))}

                    {error && <p className="text-sm text-error bg-error-bg p-2 rounded-md">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="default" isLoading={isLoading}>Guardar</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default QuickAddModal;