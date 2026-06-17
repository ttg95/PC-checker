import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

export type AppTheme = 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'blue' | 'lime' | 'orange' | 'fuchsia' | 'white' | 'red' | 'teal' | 'sky' | 'indigo' | 'pink' | 'zinc';

export interface AppearanceSettings {
  theme: AppTheme;
  glowBorders: boolean;
}

interface ThemeContextValue {
  theme: AppTheme;
  glowBorders: boolean;
  setTheme: (theme: AppTheme) => void;
  saveGlobalTheme: (theme: AppTheme) => Promise<void>;
  saveGlobalAppearance: (settings: AppearanceSettings) => Promise<void>;
  refreshGlobalTheme: () => Promise<void>;
}

const STORAGE_KEY = 'pc-checker-theme-v1';
const GLOW_STORAGE_KEY = 'pc-checker-glow-borders-v1';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadTheme(): AppTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isAppTheme(stored) ? stored : 'cyan';
}

function loadGlowBorders(): boolean {
  return localStorage.getItem(GLOW_STORAGE_KEY) === 'true';
}

function isAppTheme(value: string | null): value is AppTheme {
  return value === 'cyan'
    || value === 'emerald'
    || value === 'violet'
    || value === 'amber'
    || value === 'rose'
    || value === 'blue'
    || value === 'lime'
    || value === 'orange'
    || value === 'fuchsia'
    || value === 'white'
    || value === 'red'
    || value === 'teal'
    || value === 'sky'
    || value === 'indigo'
    || value === 'pink'
    || value === 'zinc';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(loadTheme);
  const [glowBorders, setGlowBorders] = useState<boolean>(loadGlowBorders);

  const refreshGlobalTheme = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'theme')
      .maybeSingle();

    if (error) return;

    const value = data?.value as { theme?: unknown; glowBorders?: unknown } | string | null | undefined;
    const nextTheme = typeof value === 'string'
      ? value
      : typeof value?.theme === 'string'
        ? value.theme
        : null;

    if (isAppTheme(nextTheme)) {
      setThemeState(nextTheme);
    }
    if (typeof value === 'object' && value && typeof value.glowBorders === 'boolean') {
      setGlowBorders(value.glowBorders);
    }
  };

  const saveGlobalTheme = async (nextTheme: AppTheme) => {
    await saveGlobalAppearance({ theme: nextTheme, glowBorders });
  };

  const saveGlobalAppearance = async (settings: AppearanceSettings) => {
    setThemeState(settings.theme);
    setGlowBorders(settings.glowBorders);

    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase.rpc('set_app_appearance', {
      selected_theme: settings.theme,
      glow_enabled: settings.glowBorders,
    });
    if (error) throw error;
  };

  useEffect(() => {
    void refreshGlobalTheme();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.glowBorders = glowBorders ? 'true' : 'false';
    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.setItem(GLOW_STORAGE_KEY, String(glowBorders));
  }, [theme, glowBorders]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    glowBorders,
    setTheme: setThemeState,
    saveGlobalTheme,
    saveGlobalAppearance,
    refreshGlobalTheme,
  }), [theme, glowBorders]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
