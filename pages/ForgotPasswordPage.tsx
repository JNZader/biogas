import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../hooks/use-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
    const { toast } = useToast();

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });

    const { isSubmitting, isSubmitSuccessful } = form.formState;

    const onSubmit = async (data: ForgotPasswordFormData) => {
        // FIX: Replaced 'api.sendPasswordRestEmail' with the current 'resetPasswordForEmail' method to align with the Supabase Auth v2 API, resolving the 'property does not exist' error.
        const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
             redirectTo: `${window.location.origin}${window.location.pathname}#/update-password`,
        });

        if (error) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } else {
             // The success message is shown based on `isSubmitSuccessful` state
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
                        <CardDescription>
                            Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSubmitSuccessful ? (
                            <div className="text-center">
                                <p className="text-text-primary">¡Correo enviado!</p>
                                <p className="text-sm text-text-secondary mt-2">
                                    Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña en breve.
                                </p>
                            </div>
                        ) : (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Correo Electrónico</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="operador@planta.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" isLoading={isSubmitting} className="w-full">
                                        Enviar Instrucciones
                                    </Button>
                                </form>
                            </Form>
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

export default ForgotPasswordPage;