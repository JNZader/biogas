import React, { useState } from 'react';
import Page from '../components/Page';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import ToggleSwitch from '../components/ToggleSwitch';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useThemeStore } from '../stores/themeStore';
import type { Palette } from '../stores/themeStore';

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

    const [name, setName] = useState('Juan Pérez');
    const [phone, setPhone] = useState('+54 9 11 1234-5678');
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
            dark: { bg: '#171717', primary: '#6366f1', secondary: '#34d399' }
        },
        { 
            name: 'forest', 
            label: 'Bosque', 
            light: { bg: '#F0FDF4', primary: '#166534', secondary: '#86EFAC' },
            dark: { bg: '#141f17', primary: '#86efac', secondary: '#16a34a' }
        },
        { 
            name: 'ocean', 
            label: 'Océano', 
            light: { bg: '#F0F9FF', primary: '#1E40AF', secondary: '#0EA5E9' },
            dark: { bg: '#111827', primary: '#60a5fa', secondary: '#3b82f6' }
        },
        { 
            name: 'contrast', 
            label: 'Contraste', 
            light: { bg: '#FFFFFF', primary: '#000000', secondary: '#505050', border: '#000000' },
            dark: { bg: '#000000', primary: '#FFFFFF', secondary: '#a3a3a3', border: '#FFFFFF' }
        },
    ];

    return (
        <Page className="space-y-6">
            <Card>
                <div className="flex items-center space-x-4">
                    <UserCircleIcon className="h-20 w-20 text-border" aria-hidden="true" />
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">{name}</h2>
                        <p className="text-text-secondary">Operador de Planta</p>
                        <button className="mt-2 text-sm font-semibold text-primary hover:opacity-80">
                            Cambiar Foto
                        </button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Apariencia</h3>
                <div className="space-y-6">
                    <ToggleSwitch 
                        label="Modo Oscuro"
                        enabled={theme === 'dark'}
                        setEnabled={(enabled) => setTheme(enabled ? 'dark' : 'light')}
                    />
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Paleta de Colores</label>
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
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Información Personal</h3>
                <form className="space-y-4">
                    <InputField label="Nombres" id="name" type="text" defaultValue={name} />
                    <InputField label="Correo" id="email" type="email" defaultValue="juan.perez@biogascorp.com" />
                    <InputField label="Teléfono" id="phone" type="tel" defaultValue={phone} />
                </form>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Preferencias</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="language" className="block text-sm font-medium text-text-secondary">Idioma</label>
                        <select
                            id="language"
                            name="language"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="es">Español</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="timezone" className="block text-sm font-medium text-text-secondary">Zona Horaria</label>
                        <select
                            id="timezone"
                            name="timezone"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                             className="mt-1 block w-full px-3 py-2 bg-surface border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="gmt-3">GMT-3 (Buenos Aires)</option>
                            <option value="gmt-5">GMT-5 (Bogotá, Lima)</option>
                             <option value="gmt-8">GMT-8 (Pacific Time)</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Notificaciones</h3>
                <div className="space-y-4">
                    <ToggleSwitch label="Notificaciones por Email" enabled={emailNotifications} setEnabled={setEmailNotifications} />
                    <ToggleSwitch label="Notificaciones Push" enabled={pushNotifications} setEnabled={setPushNotifications} />
                </div>
            </Card>

            <div className="space-y-3 pt-4">
                <Button variant="primary">Guardar Cambios</Button>
                <button className="w-full text-center text-sm font-medium text-error hover:opacity-80 py-2">
                    Cerrar Sesión
                </button>
            </div>
        </Page>
    );
};

export default ProfileSettingsPage;