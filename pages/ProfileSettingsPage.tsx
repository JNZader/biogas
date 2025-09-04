import React, { useState } from 'react';
import Page from '../components/Page';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useThemeStore } from '../stores/themeStore';
import type { Palette } from '../stores/themeStore';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../contexts/AuthContext';

const PaletteButton: React.FC<{
    paletteName: Palette;
    label: string;
    colors: { bg: string, primary: string, secondary: string, border?: string };
    isActive: boolean;
    onClick: () => void;
}> = ({ paletteName, label, colors, isActive, onClick }) => (
    <div className="text-center">
        <button
            onClick={onClick}
            aria-label={`Seleccionar tema ${label}`}
            className={`w-24 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                isActive ? 'border-primary scale-105' : 'border-border'
            }`}
            style={{ backgroundColor: colors.bg, borderColor: isActive ? '' : (colors.border || 'transparent') }}
        >
            <div className="flex space-x-2">
                <div className="w-4 h-4 rounded-full" style={{backgroundColor: colors.primary}}></div>
                <div className="w-4 h-4 rounded-full" style={{backgroundColor: colors.secondary}}></div>
            </div>
        </button>
        <span className={`mt-2 text-sm font-medium ${isActive ? 'text-primary' : 'text-text-secondary'}`}>{label}</span>
    </div>
);


const ProfileSettingsPage: React.FC = () => {
    const { theme, setTheme, palette, setPalette } = useThemeStore();
    const { publicProfile, signOut } = useAuth();

    const [name, setName] = useState(publicProfile?.nombres || 'Usuario');
    const [phone, setPhone] = useState(publicProfile?.telefono || '');
    const [email, setEmail] = useState(publicProfile?.correo || '');
    const [language, setLanguage] = useState('es');
    const [timezone, setTimezone] = useState('gmt-3');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);


    const palettes: { 
        name: Palette, 
        label: string, 
        light: { bg: string, primary: string, secondary: string, border?: string },
        dark: { bg: string, primary: string, secondary: string, border?: string }
    }[] = [
        { 
            name: 'default', 
            label: 'Default', 
            light: { bg: '#F9FAFB', primary: '#1E3A8A', secondary: '#10B981' },
            dark: { bg: '#171717', primary: '#6366f1', secondary: '#34d399' },
        },
        { 
            name: 'forest', 
            label: 'Bosque', 
            light: { bg: '#F0FDF4', primary: '#166534', secondary: '#86EFAC' },
            dark: { bg: '#141f17', primary: '#86efac', secondary: '#16a34a' },
        },
        { 
            name: 'ocean', 
            label: 'Océano', 
            light: { bg: '#F0F9FF', primary: '#1E40AF', secondary: '#0EA5E9' },
            dark: { bg: '#111827', primary: '#60a5fa', secondary: '#3b82f6' },
        },
        { 
            name: 'contrast', 
            label: 'Contraste', 
            light: { bg: '#FFFFFF', primary: '#000000', secondary: '#505050', border: '#000000' },
            dark: { bg: '#000000', primary: '#FFFFFF', secondary: '#a3a3a3', border: '#FFFFFF' },
        },
    ];

    return (
        <Page className="space-y-6">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                        <UserCircleIcon className="h-20 w-20 text-border" aria-hidden="true" />
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">{name}</h2>
                            <p className="text-text-secondary">Operador de Planta</p>
                            <Button variant="link" className="p-0 h-auto mt-2 text-sm">Cambiar Foto</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Apariencia</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="dark-mode">Modo Oscuro</Label>
                        <Switch 
                            id="dark-mode"
                            checked={theme === 'dark'}
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        />
                    </div>
                    <div>
                        <Label className="block text-sm font-medium text-text-secondary mb-3">Paleta de Colores</Label>
                        <div className="flex flex-wrap gap-4">
                            {palettes.map(p => (
                                <PaletteButton 
                                    key={p.name}
                                    paletteName={p.name}
                                    label={p.label}
                                    colors={theme === 'dark' ? p.dark : p.light}
                                    isActive={palette === p.name}
                                    onClick={() => setPalette(p.name)}
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Información Personal</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombres</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Preferencias</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="language">Idioma</Label>
                        <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="timezone">Zona Horaria</Label>
                        <Select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                            <SelectItem value="gmt-3">GMT-3 (Buenos Aires)</SelectItem>
                            <SelectItem value="gmt-5">GMT-5 (Bogotá, Lima)</SelectItem>
                            <SelectItem value="gmt-8">GMT-8 (Pacific Time)</SelectItem>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Notificaciones</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="email-notifications">Notificaciones por Email</Label>
                        <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="push-notifications">Notificaciones Push</Label>
                        <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <Button>Guardar Cambios</Button>
                <Link to="/change-password" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full">Cambiar Contraseña</Button>
                </Link>
                <Button variant="destructive" className="sm:ml-auto" onClick={signOut}>
                    Cerrar Sesión
                </Button>
            </div>
        </Page>
    );
};

export default ProfileSettingsPage;