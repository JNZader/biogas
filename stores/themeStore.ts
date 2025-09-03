import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
export type Palette = 'default' | 'forest' | 'ocean' | 'contrast';

interface ThemeState {
    theme: Theme;
    palette: Palette;
    setTheme: (theme: Theme) => void;
    setPalette: (palette: Palette) => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    }
    return 'light';
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: getInitialTheme(),
            palette: 'default',
            _hasHydrated: false,
            setHasHydrated: (state) => {
              set({
                _hasHydrated: state
              });
            },
            setTheme: (newTheme: Theme) => {
                set({ theme: newTheme });
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(newTheme);
            },
            setPalette: (newPalette: Palette) => {
                set({ palette: newPalette });
                document.documentElement.setAttribute('data-theme', newPalette);
            },
        }),
        {
            name: 'theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHasHydrated(true);
                    // Apply theme and palette on hydration
                    document.documentElement.classList.add(state.theme);
                    document.documentElement.setAttribute('data-theme', state.palette);
                }
            },
        }
    )
);

// Initialize theme on initial load
if (typeof window !== 'undefined') {
    const state = useThemeStore.getState();
    document.documentElement.classList.add(state.theme);
    document.documentElement.setAttribute('data-theme', state.palette);
}
