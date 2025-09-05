import React, { useState } from 'react';
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
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (data: LoginFormData) => {
        // FIX: Replaced 'signInWithPassword' with the v1 method 'signIn' to align with the expected Supabase Auth API.
        const { error } = await supabase.auth.signIn({
            email: data.email,
            password: data.password,
        });

        if (error) {
            toast({
                title: 'Error de autenticación',
                description: 'El correo electrónico o la contraseña son incorrectos.',
                variant: 'destructive',
            });
        } else {
            // The AuthContext's onAuthStateChange listener will handle navigation
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Bienvenido a BioGas Ops</CardTitle>
                        <CardDescription>Ingresa tus credenciales para acceder al dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Correo Electrónico</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="operador@planta.com" {...field} data-testid="email-input"/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contraseña</FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input type={showPassword ? 'text' : 'password'} {...field} data-testid="password-input"/>
                                                </FormControl>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary"
                                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                >
                                                    {showPassword ? (
                                                        <EyeSlashIcon className="h-5 w-5" />
                                                    ) : (
                                                        <EyeIcon className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center justify-between">
                                    <div/>
                                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                                <Button type="submit" isLoading={isSubmitting} className="w-full" data-testid="login-button">
                                    Iniciar Sesión
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LoginPage;
