
import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../contexts/SupabaseContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { PlusCircleIcon, UsersIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useToast } from '../hooks/use-toast';
import EmptyState from '../components/EmptyState';
import { cn } from '../lib/utils';
import ProtectedRoute from '../components/ProtectedRoute.tsx';


const UserManagementPage: React.FC = () => {
    const { activePlanta } = useAuth();
    const { modulos } = useSupabaseData();
    const { toast } = useToast();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'invite' | 'edit'>('invite');
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [userPermissions, setUserPermissions] = useState<Set<number>>(new Set());
    const [formLoading, setFormLoading] = useState(false);

    const ROLES = ['Super Admin', 'Admin', 'Operador', 'Visualizador'];

    const fetchUsers = useCallback(async () => {
        if (!activePlanta) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('usuarios_plantas')
                .select('rol, usuarios (*)')
                .eq('planta_id', activePlanta.id);

            if (fetchError) throw fetchError;
            setUsers(data.map(d => ({ ...d.usuarios, rol: d.rol })));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activePlanta]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenModal = async (mode: 'invite' | 'edit', user: any | null = null) => {
        setModalMode(mode);
        setCurrentUser(user);
        setUserPermissions(new Set());
        if (mode === 'edit' && user) {
            // Fetch current permissions for the user
            const { data, error } = await supabase
                .from('permisos')
                .select('idmodulo')
                .eq('id_usuario', user.id);
            
            if (error) {
                toast({ title: 'Error', description: 'No se pudieron cargar los permisos del usuario.', variant: 'destructive' });
            } else {
                setUserPermissions(new Set(data.map(p => p.idmodulo).filter(id => id !== null) as number[]));
            }
        }
        setIsModalOpen(true);
    };

    const handlePermissionChange = (moduleId: number) => {
        setUserPermissions(prev => {
            const newPermissions = new Set(prev);
            if (newPermissions.has(moduleId)) {
                newPermissions.delete(moduleId);
            } else {
                newPermissions.add(moduleId);
            }
            return newPermissions;
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const rol = formData.get('rol') as string;
        const selectedPermissions = Array.from(userPermissions);
        
        // SECURITY WARNING: In a real application, this is a highly insecure operation.
        // User creation and permission management must be handled by a secure backend endpoint
        // (like a Supabase Edge Function) that uses the service_role key.
        // The client should never have permissions to create users or assign roles directly.
        // This implementation is for demonstration purposes only within this sandboxed environment.
        toast({ title: 'Función no implementada', description: 'La invitación de usuarios debe realizarse desde un backend seguro. Esta es una demostración de la interfaz de usuario.' });
        console.log({ email, rol, permissions: selectedPermissions });

        // Here you would call your backend function. For the demo, we'll just close the modal.
        // e.g., await inviteUser({ email, rol, permissions: selectedPermissions });
        
        setFormLoading(false);
        setIsModalOpen(false);
    };
    
    if (loading) {
        return <Page><p className="text-center text-text-secondary">Cargando...</p></Page>;
    }
    
    const commonTableClasses = {
        head: "px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider",
        cell: "px-4 py-3 whitespace-nowrap text-sm",
    };

    return (
        <ProtectedRoute requiredPermission="user_management">
            <Page>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Gestión de Usuarios</CardTitle>
                        <Button onClick={() => handleOpenModal('invite')} variant="default" size="sm">
                            <PlusCircleIcon className="h-5 w-5 mr-2" />
                            Invitar Usuario
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {error && <p className="text-center text-error mb-4">{error}</p>}
                        {!users || users.length === 0 ? (
                            <EmptyState
                                icon={<UsersIcon className="mx-auto h-12 w-12" />}
                                title="No hay usuarios"
                                message="Invita a tu primer miembro del equipo para empezar."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className={commonTableClasses.head}>Nombre</th>
                                            <th className={commonTableClasses.head}>Rol</th>
                                            <th className={cn(commonTableClasses.head, "hidden sm:table-cell")}>Correo</th>
                                            <th className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td className={`${commonTableClasses.cell} text-text-primary font-medium`}>{user.nombres}</td>
                                                <td className={`${commonTableClasses.cell} text-text-secondary`}>{user.rol}</td>
                                                <td className={cn(commonTableClasses.cell, "text-text-secondary hidden sm:table-cell")}>{user.correo}</td>
                                                <td className={`${commonTableClasses.cell} text-right space-x-2`}>
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal('edit', user)}><PencilIcon className="h-5 w-5" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-error"><TrashIcon className="h-5 w-5" /></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{modalMode === 'invite' ? 'Invitar Nuevo Usuario' : 'Editar Usuario'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-2">
                            <div>
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input id="email" name="email" type="email" required defaultValue={currentUser?.correo} disabled={modalMode === 'edit'}/>
                            </div>
                            <div>
                                <Label htmlFor="rol">Rol</Label>
                                <Select id="rol" name="rol" required defaultValue={currentUser?.rol || 'Operador'}>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </Select>
                            </div>

                            <fieldset>
                                <legend className="text-sm font-medium text-text-primary">Permisos Granulares</legend>
                                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {modulos.map(mod => (
                                        <div key={mod.id} className="flex items-center justify-between p-2 rounded-md bg-background">
                                            <Label htmlFor={`perm-${mod.id}`} className="capitalize">{mod.nombre?.replace(/_/g, ' ')}</Label>
                                            <Switch
                                                id={`perm-${mod.id}`}
                                                checked={userPermissions.has(mod.id)}
                                                onCheckedChange={() => handlePermissionChange(mod.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </fieldset>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" isLoading={formLoading}>
                                    {modalMode === 'invite' ? 'Enviar Invitación' : 'Guardar Cambios'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </Page>
        </ProtectedRoute>
    );
};

export default UserManagementPage;
