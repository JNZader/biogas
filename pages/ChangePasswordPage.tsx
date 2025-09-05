

import React, { useState } from 'react';
import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../services/supabaseClient';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// --- Co-located Zod Schema for Validation ---
const passwordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'], // Set error on the confirmPassword field
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const ChangePasswordPage: React.FC = () => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: PasswordFormData) => {
    const { password } = data;
    
    // FIX: Replaced 'update' with the current 'updateUser' method to align with the Supabase Auth v2 API, resolving the 'property does not exist' error.
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      toast({
        title: 'Error al cambiar la contraseña',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Éxito',
        description: 'Tu contraseña ha sido actualizada correctamente.',
      });
      form.reset();
    }
  };

  return (
    <Page>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>
              Para mayor seguridad, elige una contraseña larga y compleja que no utilices en otros sitios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Contraseña</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showPassword ? 'text' : 'password'} {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                      </div>
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
                      <div className="relative">
                        <FormControl>
                          <Input type={showConfirmPassword ? 'text' : 'password'} {...field} />
                        </FormControl>
                         <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary" aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                            {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                         </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" isLoading={isSubmitting} className="w-full">
                  Actualizar Contraseña
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};

export default ChangePasswordPage;