import { useState, useEffect } from 'react';
import { useThemeStore } from './themeStore';

const getColor = (name: string) => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const useThemeColors = () => {
    const { theme, palette, _hasHydrated } = useThemeStore();
    
    const getColors = () => ({
        primary: `rgb(${getColor('--color-primary')})`,
        secondary: `rgb(${getColor('--color-secondary')})`,
        accent: `rgb(${getColor('--color-accent')})`,
        textSecondary: `rgb(${getColor('--color-text-secondary')})`,
        red: '#EF4444',
    });

    const [colors, setColors] = useState(getColors());

    // Re-evaluate colors when theme, palette or hydration status changes
    useEffect(() => {
        if (_hasHydrated) {
            // The timeout ensures that the DOM has been updated with the new theme attributes before we read the CSS variables.
            const timeoutId = setTimeout(() => {
                setColors(getColors());
            }, 0);
            
            return () => clearTimeout(timeoutId);
        }
    }, [theme, palette, _hasHydrated]);

    return colors;
};
