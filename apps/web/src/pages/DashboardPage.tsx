import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardSummary } from '../features/dashboard';
import { useAuth } from '../features/auth/useAuth';
import { useAreas, useCategories } from '../features/master-data/hooks';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { Skeleton, EmptyState, ErrorState } from '@/components/shared/states';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  MapPin,
  Sparkles,
  Tags,
  type LucideIcon,
} from 'lucide-react';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const frequencyLabel: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: LucideIcon; tone: string }) {
  return <Card className="overflow-hidden border-border/70 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span></div></CardContent></Card>;
}

function Breakdown({ title, rows, icon: Icon }: { title: string; rows: [string, number][]; icon: LucideIcon }) {
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Belum ada data.</p> : rows.slice(0, 8).map(([name, count]) => <div key={name}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-muted-foreground">{name}</span><strong>{count}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div></div>)}</CardContent></Card>;
}

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [areaId, setAreaId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { data, isLoading, isError, error, refetch } = useDashboardSummary({ areaId, categoryId, month });
  const { data: areasData } = useAreas();
  const { data: categoriesData } = useCategories();

  if (!hasPermission('dashboard.view')) return <EmptyState title="Akses ditolak" description="Anda tidak memiliki permission untuk melihat dashboard." />;
  if (isLoading) return <div className="space-y-5"><Skeleton className="h-44 rounded-2xl" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div></div>;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const work = data?.data.myWork;
  const summary = data?.data.summary;
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00`));
  const firstName = user?.name?.split(' ')[0] || 'User';
  const progress = Math.max(0, Math.min(100, work?.progress ?? 0));
  const byArea = Object.entries(data?.data.breakdowns.byArea ?? {});
  const byCategory = Object.entries(data?.data.breakdowns.byCategory ?? {});

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/12 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><Sparkles className="h-4 w-4" />Pusat operasi compliance</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Selamat datang, {firstName}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Pantau prioritas, selesaikan checklist, dan tindak lanjuti temuan dalam satu tampilan.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-medium"><span className="mb-1.5 block text-xs text-muted-foreground">Periode laporan</span><input type="month" value={month} max={currentMonth()} onChange={event => setMonth(event.target.value)} className="h-10 rounded-lg border bg-background px-3" /></label><Button asChild><Link to="/compliance"><ClipboardCheck className="mr-2 h-4 w-4" />Mulai checklist</Link></Button></div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Progress periode" value={`${progress}%`} note={monthLabel} icon={BarChart3} tone="bg-primary/10 text-primary" />
      <MetricCard label="Inventaris saya" value={work?.totalInventories ?? 0} note="Aset yang menjadi tanggung jawab Anda" icon={Boxes} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
      <MetricCard label="Belum checklist" value={work?.pending ?? 0} note={`${work?.pendingItems.length ?? 0} inventaris terdampak`} icon={Clock3} tone={(work?.pending ?? 0) > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600'} />
      <MetricCard label="Temuan" value={work?.findings ?? 0} note={(work?.findings ?? 0) > 0 ? 'Perlu tindak lanjut' : 'Tidak ada temuan'} icon={CircleAlert} tone={(work?.findings ?? 0) > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-600'} />
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
      <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Antrian kerja</p><CardTitle className="mt-1 text-lg">Prioritas checklist</CardTitle><p className="mt-1 text-sm text-muted-foreground">Kewajiban yang belum selesai pada {monthLabel}.</p></div>{(work?.pendingItems.length ?? 0) > 0 && <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{work?.pendingItems.length} inventaris</span>}</div></CardHeader><CardContent className="p-0">{!work?.pendingItems.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span><h3 className="font-semibold">Semua checklist selesai</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada antrian pekerjaan untuk periode ini.</p></div> : <div className="divide-y">{work.pendingItems.map(item => <article key={item.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/25 sm:flex-row sm:items-center"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{item.itemType}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{item.area}{item.specificArea ? ` / ${item.specificArea}` : ''}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{item.assetCode}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><div className="text-right"><p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{item.remaining} tersisa</p><p className="text-xs text-muted-foreground">{frequencyLabel[item.frequency]} · {item.firstPeriodLabel}</p></div><Button size="sm" asChild><Link to={`/inventory/${item.id}`}>Buka<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div></article>)}</div>}</CardContent></Card>

      <div className="space-y-6"><Card><CardHeader><CardTitle className="text-base">Progress keseluruhan</CardTitle></CardHeader><CardContent><div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(hsl(var(--primary)) ${progress * 3.6}deg, hsl(var(--muted)) 0deg)` }}><div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-card"><strong className="text-3xl">{progress}%</strong><span className="text-xs text-muted-foreground">selesai</span></div></div><div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm"><strong>{progress === 100 ? 'Periode selesai' : progress >= 80 ? 'Hampir selesai' : 'Butuh perhatian'}</strong><p className="mt-1 text-muted-foreground">{work?.completed ?? 0} dari {work?.totalRequired ?? 0} kewajiban sudah diselesaikan.</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Navigasi cepat</CardTitle></CardHeader><CardContent className="space-y-2"><Link to="/inventory" className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"><Boxes className="h-5 w-5 text-primary" /><div className="flex-1"><strong className="text-sm">Inventaris</strong><p className="text-xs text-muted-foreground">Lihat aset dan detail checklist</p></div><ArrowRight className="h-4 w-4" /></Link><Link to="/compliance" className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"><ClipboardCheck className="h-5 w-5 text-primary" /><div className="flex-1"><strong className="text-sm">Pelaksanaan checklist</strong><p className="text-xs text-muted-foreground">Buka kalender pelaksanaan</p></div><ArrowRight className="h-4 w-4" /></Link></CardContent></Card></div>
    </div>

    <Card><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="text-base">Ringkasan seluruh inventaris</CardTitle><p className="mt-1 text-sm text-muted-foreground">Gunakan filter untuk melihat distribusi operasional.</p></div><div className="flex flex-wrap gap-2"><select value={areaId} onChange={event => setAreaId(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Semua Area</option>{(areasData?.data ?? []).map((area: any) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Semua Kategori</option>{(categoriesData?.data ?? []).map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div></CardHeader><CardContent><div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-muted/35 p-4"><p className="text-xs text-muted-foreground">Total</p><strong className="text-2xl">{summary?.total ?? 0}</strong></div><div className="rounded-xl bg-emerald-500/10 p-4"><p className="text-xs text-emerald-700 dark:text-emerald-300">Aktif</p><strong className="text-2xl">{summary?.active ?? 0}</strong></div><div className="rounded-xl bg-amber-500/10 p-4"><p className="text-xs text-amber-700 dark:text-amber-300">Maintenance</p><strong className="text-2xl">{summary?.maintenance ?? 0}</strong></div><div className="rounded-xl bg-red-500/10 p-4"><p className="text-xs text-red-700 dark:text-red-300">Nonaktif / disposed</p><strong className="text-2xl">{(summary?.inactive ?? 0) + (summary?.disposed ?? 0)}</strong></div></div><div className="grid gap-5 lg:grid-cols-2"><Breakdown title="Distribusi per area" rows={byArea} icon={MapPin} /><Breakdown title="Distribusi per kategori" rows={byCategory} icon={Tags} /></div></CardContent></Card>
  </div>;
}
