import * as React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentName = 'blue' | 'indigo' | 'violet' | 'cyan' | 'emerald';

interface ThemeState {
  mode: ThemeMode;
  accent: AccentName;
}

interface ThemeContextValue extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentName) => void;
  resolvedTheme: 'light' | 'dark';
}

const STORAGE_KEY = 'assetra-theme';
const ACCENT_KEY = 'assetra-accent';

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'dark' || stored === 'light' || stored === 'system') ? stored : 'system';
  });
  const [accent, setAccentState] = React.useState<AccentName>(() => {
    if (typeof window === 'undefined') return 'blue';
    const stored = localStorage.getItem(ACCENT_KEY);
    return (stored === 'blue' || stored === 'indigo' || stored === 'violet' || stored === 'cyan' || stored === 'emerald')
      ? stored
      : 'blue';
  });
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>(() => resolveMode(mode));

  // Apply theme + accent to <html>
  React.useEffect(() => {
    const root = document.documentElement;
    const resolved = resolveMode(mode);
    setResolvedTheme(resolved);
    root.classList.toggle('dark', resolved === 'dark');
    root.setAttribute('data-accent', accent);
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [mode, accent]);

  // Follow system preference changes when in system mode
  React.useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const root = document.documentElement;
      const resolved = mq.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      root.classList.toggle('dark', resolved === 'dark');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      mode,
      accent,
      resolvedTheme,
      setMode: setModeState,
      setAccent: setAccentState,
    }),
    [mode, accent, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
