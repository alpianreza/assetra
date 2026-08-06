import { useTheme, type ThemeMode, type AccentName } from './theme-provider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const APPEARANCE: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const ACCENTS: { value: AccentName; label: string; color: string }[] = [
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'indigo', label: 'Indigo', color: '#6366f1' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
  { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { value: 'emerald', label: 'Emerald', color: '#10b981' },
];

export function ThemeSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Customize the look of Assetra.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {/* Appearance mode */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Appearance</h4>
            <div className="grid grid-cols-3 gap-2">
              {APPEARANCE.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setMode(a.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors',
                    mode === a.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  <span>{a.label}</span>
                  {mode === a.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Theme Color</h4>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAccent(a.value)}
                  aria-label={a.label}
                  title={a.label}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full ring-offset-background transition-all',
                    accent === a.value && 'ring-2 ring-ring ring-offset-2',
                  )}
                  style={{ backgroundColor: a.color }}
                >
                  {accent === a.value && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Accent applied globally via CSS theme tokens.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}