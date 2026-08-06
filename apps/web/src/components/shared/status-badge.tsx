import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

type StatusVariant = 'active' | 'inactive' | 'maintenance' | 'disposed' | 'completed' | 'pending' | 'late' | 'ok' | 'not_ok' | 'na' | 'default';

const STATUS_CONFIG: Record<StatusVariant, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' },
  inactive: { label: 'Nonaktif', className: 'bg-muted text-muted-foreground border-muted' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' },
  disposed: { label: 'Disposed', className: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' },
  completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' },
  late: { label: 'Late', className: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' },
  ok: { label: 'OK', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' },
  not_ok: { label: 'Not OK', className: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' },
  na: { label: 'N/A', className: 'bg-muted text-muted-foreground border-border' },
  default: { label: '—', className: 'bg-muted text-muted-foreground border-border' },
};

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? 'default') as StatusVariant;
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.default;
  return (
    <Badge variant="outline" className={cn('font-medium', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}