import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../hooks/use-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

const UpdatePasswordPage: React.FC = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isSessionReady, setIsSessionReady] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsSessionReady(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const form = useForm<UpdatePasswordFormData>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (data: UpdatePasswordFormData) => {
        // FIX: Replaced 'updateUser' with the older 'update' method to align with the Supabase Auth v1 API, resolving the 'property does not exist' error.
        const { error } = await supabase.auth.update({ password: data.password });

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Éxito', description: 'Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.' });
            navigate({ to: '/' });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Establecer Nueva Contraseña</CardTitle>
                        <CardDescription>
                            {isSessionReady 
                                ? "Ingresa tu nueva contraseña a continuación."
                                : "Verificando tu sesión de recuperación..."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSessionReady ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nueva Contraseña</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" isLoading={isSubmitting} className="w-full">
                                        Guardar Nueva Contraseña
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                             <div className="text-center text-text-secondary">
                                <p>Por favor, espera un momento.</p>
                                <p className="text-xs mt-2">Si no llegaste aquí desde un enlace en tu correo, por favor inicia el proceso de recuperación de contraseña.</p>
                             </div>
                        )}
                         <div className="mt-6 text-center">
                            <Link to="/" className="text-sm text-primary hover:underline inline-flex items-center gap-2">
                                <ArrowLeftIcon className="h-4 w-4" />
                                Volver a Iniciar Sesión
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UpdatePasswordPage;