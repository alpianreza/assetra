import * as React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentName = 'blue' | 'indigo' | 'violet' | 'cyan' | 'emerald';

type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  accent: AccentName;
}

interface ThemeContextValue extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentName) => void;
  resolvedTheme: ResolvedTheme;
}

const STORAGE_KEY = 'assetra-theme';
const ACCENT_KEY = 'assetra-accent';
const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system'];
const VALID_ACCENTS: AccentName[] = ['blue', 'indigo', 'violet', 'cyan', 'emerald'];

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored && VALID_MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function readStoredAccent(): AccentName {
  if (typeof window === 'undefined') return 'blue';
  try {
    const stored = window.localStorage.getItem(ACCENT_KEY) as AccentName | null;
    return stored && VALID_ACCENTS.includes(stored) ? stored : 'blue';
  } catch {
    return 'blue';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(readStoredMode);
  const [accent, setAccentState] = React.useState<AccentName>(readStoredAccent);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => setSystemTheme(media.matches ? 'dark' : 'light');
    syncSystemTheme();
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  // useLayoutEffect prevents a rendered frame with a stale class when the mode
  // changes. index.html applies the same values before React boots to avoid a
  // light/dark flash on refresh.
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = accent;
    root.style.colorScheme = resolvedTheme;

    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
      window.localStorage.setItem(ACCENT_KEY, accent);
    } catch {
      // Theme still works when storage is blocked by the browser.
    }
  }, [mode, accent, resolvedTheme]);

  React.useEffect(() => {
    const syncOtherTabs = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue && VALID_MODES.includes(event.newValue as ThemeMode)) {
        setModeState(event.newValue as ThemeMode);
      }
      if (event.key === ACCENT_KEY && event.newValue && VALID_ACCENTS.includes(event.newValue as AccentName)) {
        setAccentState(event.newValue as AccentName);
      }
    };
    window.addEventListener('storage', syncOtherTabs);
    return () => window.removeEventListener('storage', syncOtherTabs);
  }, []);

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    if (VALID_MODES.includes(nextMode)) setModeState(nextMode);
  }, []);

  const setAccent = React.useCallback((nextAccent: AccentName) => {
    if (VALID_ACCENTS.includes(nextAccent)) setAccentState(nextAccent);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ mode, accent, resolvedTheme, setMode, setAccent }),
    [mode, accent, resolvedTheme, setMode, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
