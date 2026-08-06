import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { resolvedTheme, setMode } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isDark ? 'Aktifkan mode siang' : 'Aktifkan mode malam'}
          onClick={() => setMode(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{isDark ? 'Mode siang' : 'Mode malam'}</TooltipContent>
    </Tooltip>
  );
}
