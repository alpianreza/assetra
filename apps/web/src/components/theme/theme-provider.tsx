import * as React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentName = 'blue' | 'indigo' | 'violet' | 'cyan' | 'emerald' | 'custom';
export type ThemeDirection = 'ltr' | 'rtl';
export type LayoutType = 'vertical' | 'horizontal';
export type ContainerMode = 'boxed' | 'full';
export type SidebarMode = 'full' | 'collapse';
export type CardStyle = 'border' | 'shadow';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentName;
  direction: ThemeDirection;
  layout: LayoutType;
  container: ContainerMode;
  sidebarMode: SidebarMode;
  cardStyle: CardStyle;
  radius: number;
  customPrimary: string;
  customSecondary: string;
  resolvedTheme: ResolvedTheme;
  setMode: (value: ThemeMode) => void;
  setAccent: (value: AccentName) => void;
  setDirection: (value: ThemeDirection) => void;
  setLayout: (value: LayoutType) => void;
  setContainer: (value: ContainerMode) => void;
  setSidebarMode: (value: SidebarMode) => void;
  setCardStyle: (value: CardStyle) => void;
  setRadius: (value: number) => void;
  setCustomPrimary: (value: string) => void;
  setCustomSecondary: (value: string) => void;
  resetTheme: () => void;
}

const KEYS = {
  mode: 'assetra-theme', accent: 'assetra-accent', direction: 'assetra-direction', layout: 'assetra-layout',
  container: 'assetra-container', sidebar: 'assetra-sidebar', card: 'assetra-card-style', radius: 'assetra-radius',
  primary: 'assetra-custom-primary', secondary: 'assetra-custom-secondary',
} as const;
const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function readValue<T extends string>(key: string, values: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const value = localStorage.getItem(key) as T | null; return value && values.includes(value) ? value : fallback; } catch { return fallback; }
}
function readRadius() { if (typeof window === 'undefined') return 8; const value = Number(localStorage.getItem(KEYS.radius)); return Number.isFinite(value) ? Math.min(24, Math.max(4, value)) : 8; }
function readColor(key: string, fallback: string) { if (typeof window === 'undefined') return fallback; const value = localStorage.getItem(key); return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
function getSystemTheme(): ResolvedTheme { return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function hexToHsl(hex: string) {
  const value = hex.replace('#', ''); const r = parseInt(value.slice(0, 2), 16) / 255; const g = parseInt(value.slice(2, 4), 16) / 255; const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min); if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
function foregroundFor(hex: string) { const value = hex.replace('#', ''); const r = parseInt(value.slice(0, 2), 16); const g = parseInt(value.slice(2, 4), 16); const b = parseInt(value.slice(4, 6), 16); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '222 47% 11%' : '210 40% 98%'; }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<ThemeMode>(() => readValue(KEYS.mode, ['light', 'dark', 'system'], 'system'));
  const [accent, setAccent] = React.useState<AccentName>(() => readValue(KEYS.accent, ['blue', 'indigo', 'violet', 'cyan', 'emerald', 'custom'], 'blue'));
  const [direction, setDirection] = React.useState<ThemeDirection>(() => readValue(KEYS.direction, ['ltr', 'rtl'], 'ltr'));
  const [layout, setLayout] = React.useState<LayoutType>(() => readValue(KEYS.layout, ['vertical', 'horizontal'], 'vertical'));
  const [container, setContainer] = React.useState<ContainerMode>(() => readValue(KEYS.container, ['boxed', 'full'], 'full'));
  const [sidebarMode, setSidebarMode] = React.useState<SidebarMode>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(KEYS.sidebar) : null;
    return stored === 'collapse' || stored === 'collapsed' ? 'collapse' : 'full';
  });
  const [cardStyle, setCardStyle] = React.useState<CardStyle>(() => readValue(KEYS.card, ['border', 'shadow'], 'border'));
  const [radius, setRadiusState] = React.useState(readRadius);
  const [customPrimary, setCustomPrimaryState] = React.useState(() => readColor(KEYS.primary, '#5d87ff'));
  const [customSecondary, setCustomSecondaryState] = React.useState(() => readColor(KEYS.secondary, '#49beff'));
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  React.useEffect(() => { const media = window.matchMedia('(prefers-color-scheme: dark)'); const sync = () => setSystemTheme(media.matches ? 'dark' : 'light'); sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync); }, []);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark'); root.classList.add(resolvedTheme); root.style.colorScheme = resolvedTheme;
    root.dataset.theme = resolvedTheme; root.dataset.accent = accent; root.dataset.direction = direction; root.dataset.layout = layout; root.dataset.container = container; root.dataset.sidebar = sidebarMode; root.dataset.cardStyle = cardStyle; root.dir = direction;
    root.style.setProperty('--radius', `${radius}px`);
    if (accent === 'custom') {
      const primary = hexToHsl(customPrimary); const secondary = hexToHsl(customSecondary);
      root.style.setProperty('--primary', primary); root.style.setProperty('--ring', primary); root.style.setProperty('--sidebar-accent', primary); root.style.setProperty('--primary-foreground', foregroundFor(customPrimary));
      root.style.setProperty('--secondary', secondary); root.style.setProperty('--secondary-foreground', foregroundFor(customSecondary));
    } else {
      ['--primary', '--ring', '--sidebar-accent', '--primary-foreground', '--secondary', '--secondary-foreground'].forEach(property => root.style.removeProperty(property));
    }
    try {
      localStorage.setItem(KEYS.mode, mode); localStorage.setItem(KEYS.accent, accent); localStorage.setItem(KEYS.direction, direction); localStorage.setItem(KEYS.layout, layout); localStorage.setItem(KEYS.container, container); localStorage.setItem(KEYS.sidebar, sidebarMode); localStorage.setItem(KEYS.card, cardStyle); localStorage.setItem(KEYS.radius, String(radius)); localStorage.setItem(KEYS.primary, customPrimary); localStorage.setItem(KEYS.secondary, customSecondary);
    } catch { /* Browser storage may be unavailable. */ }
  }, [mode, accent, direction, layout, container, sidebarMode, cardStyle, radius, customPrimary, customSecondary, resolvedTheme]);

  const setRadius = React.useCallback((value: number) => setRadiusState(Math.min(24, Math.max(4, value))), []);
  const setCustomPrimary = React.useCallback((value: string) => { setCustomPrimaryState(value); setAccent('custom'); }, []);
  const setCustomSecondary = React.useCallback((value: string) => { setCustomSecondaryState(value); setAccent('custom'); }, []);
  const resetTheme = React.useCallback(() => { setMode('system'); setAccent('blue'); setDirection('ltr'); setLayout('vertical'); setContainer('full'); setSidebarMode('full'); setCardStyle('border'); setRadiusState(8); setCustomPrimaryState('#5d87ff'); setCustomSecondaryState('#49beff'); }, []);
  const value = React.useMemo(() => ({ mode, accent, direction, layout, container, sidebarMode, cardStyle, radius, customPrimary, customSecondary, resolvedTheme, setMode, setAccent, setDirection, setLayout, setContainer, setSidebarMode, setCardStyle, setRadius, setCustomPrimary, setCustomSecondary, resetTheme }), [mode, accent, direction, layout, container, sidebarMode, cardStyle, radius, customPrimary, customSecondary, resolvedTheme, setRadius, setCustomPrimary, setCustomSecondary, resetTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = React.useContext(ThemeContext); if (!context) throw new Error('useTheme must be used within a ThemeProvider'); return context; }
