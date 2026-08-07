import { useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardSummary } from '@/features/dashboard';
import { useAuth } from '@/features/auth/useAuth';
import { useAreas, useCategories } from '@/features/master-data/hooks';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/shared/states';
import { Activity, Boxes, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, MapPin, ShieldCheck, Tags, Wrench, type LucideIcon } from 'lucide-react';

const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };

interface SlideMetric { label: string; value: number; note: string; icon: LucideIcon; tone: string; text: string }

function MovingCards({ items }: { items: SlideMetric[] }) {
  const container = useRef<HTMLDivElement>(null);
  const index = useRef(0);
  const move = (direction = 1) => {
    const node = container.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 220) + 16;
    const maxIndex = Math.max(0, items.length - Math.max(1, Math.floor(node.clientWidth / step)));
    index.current = direction > 0 ? (index.current >= maxIndex ? 0 : index.current + 1) : (index.current <= 0 ? maxIndex : index.current - 1);
    node.scrollTo({ left: index.current * step, behavior: 'smooth' });
  };
  useEffect(() => { const timer = window.setInterval(() => move(1), 2800); return () => window.clearInterval(timer); }, [items.length]);
  return <div className="relative"><div ref={container} className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items.map(({ label, value, note, icon: Icon, tone, text }) => <article key={label} className={`min-w-[220px] flex-1 snap-start rounded-2xl border border-white/5 p-5 shadow-sm ${tone}`}><div className="flex items-start justify-between"><div><p className={`text-sm font-semibold ${text}`}>{label}</p><strong className={`mt-3 block text-2xl ${text}`}>{value.toLocaleString('id-ID')}</strong><p className={`mt-1 text-xs ${text} opacity-70`}>{note}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-black/10 ${text}`}><Icon className="h-5 w-5" /></span></div></article>)}</div><div className="mt-2 flex justify-end gap-2"><Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button></div></div>;
}

export function DashboardPage() {
  const { hasPermission } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [areaId, setAreaId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { data, isLoading, isError, error, refetch } = useDashboardSummary({ month, areaId, categoryId });
  const { data: areasData } = useAreas();
  const { data: categoriesData } = useCategories();
  if (!hasPermission('dashboard.view')) return <EmptyState title="Akses ditolak" description="Dashboard analitik hanya tersedia untuk pengguna yang memiliki izin dashboard." />;
  if (isLoading) return <div className="space-y-5"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const summary = data?.data.summary;
  const compliance = data?.data.compliance;
  const work = data?.data.myWork;
  const byArea = Object.entries(data?.data.breakdowns.byArea ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const byCategory = Object.entries(data?.data.breakdowns.byCategory ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxArea = Math.max(1, ...byArea.map(([, value]) => value));
  const total = Math.max(1, summary?.total ?? 0);
  const activeEnd = ((summary?.active ?? 0) / total) * 100;
  const maintenanceEnd = activeEnd + ((summary?.maintenance ?? 0) / total) * 100;
  const inactiveEnd = maintenanceEnd + ((summary?.inactive ?? 0) / total) * 100;
  const donut = `conic-gradient(#22c55e 0 ${activeEnd}%, #f59e0b ${activeEnd}% ${maintenanceEnd}%, #64748b ${maintenanceEnd}% ${inactiveEnd}%, #ef4444 ${inactiveEnd}% 100%)`;
  const cards = useMemo<SlideMetric[]>(() => [
    { label: 'Total Inventaris', value: summary?.total ?? 0, note: 'Seluruh aset terdaftar', icon: Boxes, tone: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-300' },
    { label: 'Aktif', value: summary?.active ?? 0, note: 'Aset operasional', icon: Activity, tone: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300' },
    { label: 'Maintenance', value: summary?.maintenance ?? 0, note: 'Dalam perbaikan', icon: Wrench, tone: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300' },
    { label: 'Checklist Selesai', value: compliance?.completed ?? 0, note: 'Jawaban sesuai', icon: CheckCircle2, tone: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-300' },
    { label: 'Temuan', value: compliance?.late ?? 0, note: 'Jawaban tidak sesuai', icon: CircleAlert, tone: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-300' },
    { label: 'Pending', value: work?.pending ?? 0, note: 'Kewajiban pengguna', icon: Clock3, tone: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-300' },
  ], [summary, compliance, work]);

  return <div className="space-y-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Analytics workspace</p><h1 className="mt-1 text-2xl font-bold">Dashboard Compliance</h1><p className="mt-1 text-sm text-muted-foreground">Analitik inventaris, checklist, area, dan kondisi operasional.</p></div><div className="flex flex-wrap gap-2"><input type="month" value={month} max={currentMonth()} onChange={event => setMonth(event.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm" /><select value={areaId} onChange={event => setAreaId(event.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="">Semua Area</option>{(areasData?.data ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="">Semua Kategori</option>{(categoriesData?.data ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>

    <MovingCards items={cards} />

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]"><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base">Distribusi inventaris per area</CardTitle><p className="mt-1 text-xs text-muted-foreground">Perbandingan jumlah aset pada area teratas</p></div><MapPin className="h-5 w-5 text-primary" /></div></CardHeader><CardContent><div className="flex h-64 items-end gap-3 border-b border-l px-3 pt-5 sm:gap-5">{byArea.length ? byArea.map(([name, value]) => <div key={name} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><strong className="text-xs">{value}</strong><div className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-primary to-cyan-400 transition-all duration-700" style={{ height: `${Math.max(12, (value / maxArea) * 190)}px` }} /><span className="w-full truncate text-center text-[10px] text-muted-foreground" title={name}>{name}</span></div>) : <p className="m-auto text-sm text-muted-foreground">Belum ada data area.</p>}</div></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Status inventaris</CardTitle></CardHeader><CardContent><div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: donut }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card"><strong className="text-2xl">{summary?.total ?? 0}</strong><span className="text-xs text-muted-foreground">total aset</span></div></div><div className="mt-6 grid grid-cols-2 gap-3 text-xs"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Aktif {summary?.active ?? 0}</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Maintenance {summary?.maintenance ?? 0}</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />Nonaktif {summary?.inactive ?? 0}</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Disposed {summary?.disposed ?? 0}</span></div></CardContent></Card></div>

    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tags className="h-4 w-4 text-primary" />Distribusi kategori</CardTitle></CardHeader><CardContent className="space-y-4">{byCategory.map(([name, value]) => <div key={name}><div className="mb-1.5 flex justify-between text-sm"><span className="text-muted-foreground">{name}</span><strong>{value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(4, (value / total) * 100)}%` }} /></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Kesehatan compliance</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-500/10 p-4"><CheckCircle2 className="h-6 w-6 text-emerald-600" /><strong className="mt-3 block text-2xl">{work?.completed ?? 0}</strong><span className="text-xs text-muted-foreground">Kewajiban selesai</span></div><div className="rounded-2xl bg-amber-500/10 p-4"><Clock3 className="h-6 w-6 text-amber-600" /><strong className="mt-3 block text-2xl">{work?.pending ?? 0}</strong><span className="text-xs text-muted-foreground">Belum selesai</span></div><div className="rounded-2xl bg-red-500/10 p-4"><CircleAlert className="h-6 w-6 text-red-600" /><strong className="mt-3 block text-2xl">{work?.findings ?? 0}</strong><span className="text-xs text-muted-foreground">Temuan periode</span></div></div><div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Progress saya</span><strong>{work?.progress ?? 0}%</strong></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400" style={{ width: `${work?.progress ?? 0}%` }} /></div></div></CardContent></Card></div>
  </div>;
}
