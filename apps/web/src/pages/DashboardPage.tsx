import { useState } from 'react';
import { useDashboardSummary } from '../features/dashboard';
import { useAuth } from '../features/auth/useAuth';
import { exportInventoryXlsx } from '../features/dashboard/api';
import { useAreas, useCategories } from '../features/master-data/hooks';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@/components/ui';
import { Skeleton, EmptyState, ErrorState } from '@/components/shared/states';
import {
  Boxes,
  Download,
  MapPin,
  Tags,
  CheckCircle,
  Clock,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

interface KpiDef {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
}

function KpiCard({ label, value, icon: Icon, tint }: KpiDef) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tint}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({ title, rows, icon: Icon }: { title: string; rows: [string, number][]; icon: LucideIcon }) {
  const max = rows.reduce((m, [, v]) => Math.max(m, v), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Belum ada data.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(([name, count]) => (
              <div key={name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{name}</span>
                  <span className="ml-2 font-semibold text-foreground">{count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${max ? (count / max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const { hasPermission } = useAuth();
  const [areaId, setAreaId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useDashboardSummary({ areaId, categoryId });
  const { data: areasData } = useAreas();
  const { data: categoriesData } = useCategories();

  const areas = areasData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const canView = hasPermission('dashboard.view');
  const canExport = hasPermission('reports.export');

  const handleExportInventory = async () => {
    try {
      setExporting(true);
      const blob = await exportInventoryXlsx();
      downloadBlob(blob, 'inventory.xlsx');
    } catch {
      alert('Gagal export inventori');
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <EmptyState
        title="Akses ditolak"
        description="Anda tidak memiliki permission untuk melihat dashboard."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;
  }

  const summary = data?.data?.summary;
  const compliance = data?.data?.compliance;
  const byArea = Object.entries(data?.data?.breakdowns?.byArea ?? {});
  const byCategory = Object.entries(data?.data?.breakdowns?.byCategory ?? {});

  const kpis: KpiDef[] = [
    { label: 'Total Inventaris', value: summary?.total ?? 0, icon: Boxes, tint: 'bg-primary/10 text-primary' },
    { label: 'Aktif', value: summary?.active ?? 0, icon: MapPin, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Maintenance', value: summary?.maintenance ?? 0, icon: Tags, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'Nonaktif & Disposed', value: (summary?.inactive ?? 0) + (summary?.disposed ?? 0), icon: AlertTriangle, tint: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters + export */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua Area</option>
            {areas.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {canExport && (
          <Button variant="outline" onClick={handleExportInventory} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export Inventory'}
          </Button>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Compliance status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{compliance?.completed ?? 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{compliance?.pending ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{compliance?.late ?? 0}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable title="Breakdown per Area" rows={byArea} icon={MapPin} />
        <BreakdownTable title="Breakdown per Kategori" rows={byCategory} icon={Tags} />
      </div>
    </div>
  );
}