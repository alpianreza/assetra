import { useMemo, useState } from 'react';
import { CheckSquare, FileDown, FileSpreadsheet, Printer, Search, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryList } from '../../inventory/hooks';
import { useAuth } from '../../auth/useAuth';
import { exportComplianceXlsx } from '../../dashboard/api';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function getCsrf() {
  const existing = readCookie('assetra_csrf');
  if (existing) return existing;
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
  if (!response.ok) return null;
  return (await response.json()).data.csrfToken as string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PrintCenterPage() {
  const { hasPermission } = useAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [templateId, setTemplateId] = useState(1);
  const [periodKey, setPeriodKey] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const { data: inventoryData, isLoading } = useInventoryList({ limit: 100 });
  const inventories = inventoryData?.data?.items ?? [];
  const visible = useMemo(() => { const query = search.toLowerCase().trim(); return !query ? inventories : inventories.filter((item: any) => [item.assetCode, item.itemType, item.category, item.area, item.specificArea].some(value => String(value ?? '').toLowerCase().includes(query))); }, [inventories, search]);
  const allVisibleSelected = visible.length > 0 && visible.every((item: any) => selectedIds.includes(item.id));
  const canExport = hasPermission('reports.export');

  const toggleVisible = () => setSelectedIds(previous => allVisibleSelected ? previous.filter(id => !visible.some((item: any) => item.id === id)) : Array.from(new Set([...previous, ...visible.map((item: any) => item.id)])));
  const toggleOne = (id: number) => setSelectedIds(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);

  const exportPdf = async () => {
    if (!selectedIds.length) return toast.error('Pilih inventaris terlebih dahulu');
    try {
      setExporting('pdf');
      const csrf = await getCsrf();
      const response = await fetch('/api/v1/reports/compliance/batch/pdf', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify({ inventoryIds: selectedIds, templateId, periodKey }) });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message || 'Gagal membuat PDF'); }
      downloadBlob(await response.blob(), `Checklist_Batch_${periodKey}.pdf`);
      toast.success('PDF berhasil dibuat dengan template perusahaan');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal membuat PDF'); } finally { setExporting(null); }
  };

  const exportXlsx = async () => {
    if (!selectedIds.length) return toast.error('Pilih inventaris terlebih dahulu');
    try { setExporting('xlsx'); downloadBlob(await exportComplianceXlsx({ inventoryIds: selectedIds, templateId, periodKey }), `Checklist_Compliance_${periodKey}.xlsx`); toast.success('XLSX berhasil dibuat'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal membuat XLSX'); } finally { setExporting(null); }
  };

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/12 via-card to-card p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Reporting center</p><div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Printer className="h-6 w-6" />Print Center</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Template terinspirasi EAMS dengan header logo dan nama perusahaan, informasi inventaris, tabel hasil, detail temuan, legenda, footer, dan nomor halaman.</p></div><div className="rounded-xl border bg-background/70 px-4 py-3 text-sm"><strong>{selectedIds.length}</strong><span className="text-muted-foreground"> inventaris dipilih</span></div></div></section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
      <Card><CardHeader className="border-b"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Pilih inventaris</CardTitle><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari inventaris..." className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm sm:w-64" /></div></div></CardHeader><CardContent className="p-0"><button type="button" onClick={toggleVisible} className="flex w-full items-center gap-3 border-b bg-muted/25 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">{allVisibleSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}Pilih semua hasil ({visible.length})</button><div className="max-h-[560px] divide-y overflow-y-auto">{isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Memuat inventaris...</p> : visible.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Inventaris tidak ditemukan.</p> : visible.map((inventory: any) => { const selected = selectedIds.includes(inventory.id); return <button type="button" key={inventory.id} onClick={() => toggleOne(inventory.id)} className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${selected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>{selected ? <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm">{inventory.assetCode}</strong><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{inventory.itemType || '-'}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{inventory.category || '-'} · {inventory.area || '-'}{inventory.specificArea ? ` / ${inventory.specificArea}` : ''}</p></div></button>; })}</div></CardContent></Card>

      <div className="space-y-5"><Card><CardHeader><CardTitle className="text-base">Parameter print</CardTitle></CardHeader><CardContent className="space-y-4"><label className="block text-sm font-medium">Template ID<input type="number" min={1} value={templateId} onChange={event => setTemplateId(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border px-3 py-2" /></label><label className="block text-sm font-medium">Kunci periode<input value={periodKey} onChange={event => setPeriodKey(event.target.value)} placeholder="YYYY-MM-DD / YYYY-MM-W1 / YYYY-MM" className="mt-1.5 w-full rounded-lg border px-3 py-2" /></label><div className="rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Format periode mengikuti frekuensi Jenis Item: harian <strong>YYYY-MM-DD</strong>, mingguan <strong>YYYY-MM-W1</strong>, atau bulanan <strong>YYYY-MM</strong>.</div></CardContent></Card>{canExport && <Card><CardHeader><CardTitle className="text-base">Buat dokumen</CardTitle></CardHeader><CardContent className="space-y-3"><Button className="w-full" onClick={exportPdf} disabled={!!exporting || !selectedIds.length}><FileDown className="mr-2 h-4 w-4" />{exporting === 'pdf' ? 'Membuat PDF...' : `Unduh PDF (${selectedIds.length})`}</Button><Button variant="outline" className="w-full" onClick={exportXlsx} disabled={!!exporting || !selectedIds.length}><FileSpreadsheet className="mr-2 h-4 w-4" />{exporting === 'xlsx' ? 'Membuat XLSX...' : 'Unduh XLSX'}</Button></CardContent></Card>}</div>
    </div>
  </div>;
}
