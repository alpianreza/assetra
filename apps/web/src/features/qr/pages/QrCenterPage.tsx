import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckSquare,
  ExternalLink,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Square,
} from 'lucide-react';
import { useBatchQr, useQrGallery, useRegenerateQr } from '../hooks';
import { useAuth } from '../../auth/useAuth';

export function QrCenterPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, error } = useQrGallery();
  const batchQr = useBatchQr();
  const regenerateMutation = useRegenerateQr();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [cacheVersion, setCacheVersion] = useState(() => Date.now());

  const gallery = data?.data;
  const items = gallery?.items ?? [];
  const canPrint = hasPermission('qr.print');

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item: any) => [item.assetCode, item.itemType, item.category, item.area, item.specificArea]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query)));
  }, [items, search]);

  const albums = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const item of filteredItems) {
      const name = item.itemType || 'Tanpa Jenis Item';
      const album = grouped.get(name) ?? [];
      album.push(item);
      grouped.set(name, album);
    }
    return Array.from(grouped, ([name, albumItems]) => ({ name, items: albumItems }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [filteredItems]);

  const selectedSet = new Set(selectedIds);
  const visibleIds = filteredItems.map((item: any) => item.id as number);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedSet.has(id));

  const toggleSelect = (id: number) => {
    setSelectedIds(previous => previous.includes(id) ? previous.filter(itemId => itemId !== id) : [...previous, id]);
  };

  const toggleVisible = () => {
    setSelectedIds(previous => {
      if (allVisibleSelected) return previous.filter(id => !visibleIds.includes(id));
      return Array.from(new Set([...previous, ...visibleIds]));
    });
  };

  const handleRegenerate = async (scope: 'selected' | 'all') => {
    const ids = scope === 'selected' ? selectedIds : undefined;
    if (scope === 'selected' && selectedIds.length === 0) {
      toast.warning('Pilih minimal satu QR terlebih dahulu');
      return;
    }

    const message = scope === 'all'
      ? `Regenerate seluruh ${items.length} QR menggunakan Base URL aktif?`
      : `Regenerate ${selectedIds.length} QR yang dipilih?`;
    if (!confirm(message)) return;

    try {
      const result = await regenerateMutation.mutateAsync(ids);
      setCacheVersion(Date.now());
      const regenerated = result.data?.regenerated ?? 0;
      const failed = result.data?.failed?.length ?? 0;
      if (failed > 0) toast.warning(`${regenerated} QR berhasil, ${failed} QR gagal diregenerate`);
      else toast.success(`${regenerated} QR berhasil diregenerate`);
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal melakukan regenerate QR');
    }
  };

  const handlePrint = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Pilih QR yang ingin dicetak');
      return;
    }

    try {
      const response = await batchQr.mutateAsync(selectedIds);
      const labelData = response.data;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup print diblokir oleh browser');
        return;
      }

      printWindow.document.write('<!doctype html><html><head><title>Label QR Assetra</title><style>body{font-family:Arial,sans-serif;margin:16px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.label{break-inside:avoid;border:1px solid #d1d5db;border-radius:12px;padding:12px;text-align:center}.label img{width:180px;height:180px}.asset{font-weight:700;margin:8px 0 3px}.meta{font-size:11px;color:#4b5563}@media print{body{margin:0}.grid{gap:6px}}</style></head><body><div class="grid">');
      labelData.forEach((item: any) => {
        printWindow.document.write(`<article class="label"><img src="/api/v1/qr/inventory/${item.id}/stored-image?v=${cacheVersion}" /><div class="asset">${escapeHtml(item.assetCode)}</div><div class="meta">${escapeHtml(item.itemType || '-')}</div><div class="meta">${escapeHtml(item.area || '-')}</div></article>`);
      });
      printWindow.document.write('</div><script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})<\/script></body></html>');
      printWindow.document.close();
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal menyiapkan label QR');
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Compliance QR</p>
          <h1 className="text-2xl font-bold mt-1">QR Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Galeri QR per Jenis Item untuk preview, cetak, dan regenerate manual.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Album" value={albums.length} />
          <StatBadge label="Total QR" value={gallery?.total ?? 0} />
          <StatBadge label="Tersimpan" value={gallery?.generated ?? 0} />
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-500/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <QrCode className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Base URL QR aktif</p>
            <p className="text-xs text-muted-foreground mt-1 break-all">{gallery?.baseUrl ?? 'Memuat...'}</p>
            <p className="text-xs text-muted-foreground mt-1">Jika Base URL pada konfigurasi berubah, restart API lalu gunakan tombol Regenerate agar file QR tersimpan memakai alamat terbaru.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nomor inventaris, Jenis Item, area..." className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={toggleVisible} className="inline-flex items-center gap-2 px-3 py-2 border border-input rounded-lg text-sm hover:bg-muted">{allVisibleSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}Pilih yang tampil</button>
            {canPrint && <button onClick={handlePrint} disabled={selectedIds.length === 0 || batchQr.isPending} className="inline-flex items-center gap-2 px-3 py-2 border border-input rounded-lg text-sm hover:bg-muted disabled:opacity-50"><Printer className="h-4 w-4" />Print ({selectedIds.length})</button>}
            {canPrint && <button onClick={() => void handleRegenerate('selected')} disabled={selectedIds.length === 0 || regenerateMutation.isPending} className="inline-flex items-center gap-2 px-3 py-2 border border-amber-300 text-amber-700 dark:text-amber-300 rounded-lg text-sm hover:bg-amber-500/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />Regenerate Pilihan</button>}
            {canPrint && <button onClick={() => void handleRegenerate('all')} disabled={items.length === 0 || regenerateMutation.isPending} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />Regenerate Semua</button>}
          </div>
        </div>
      </section>

      {isLoading ? <div className="py-16 text-center text-muted-foreground">Memuat galeri QR...</div> : isError ? <div className="py-16 text-center text-red-500">{(error as any)?.message || 'Gagal memuat galeri QR.'}</div> : albums.length === 0 ? <div className="rounded-2xl border border-dashed p-16 text-center text-muted-foreground">QR tidak ditemukan.</div> : (
        <div className="space-y-5">
          {albums.map(album => (
            <section key={album.name} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Album QR</p><h2 className="font-semibold mt-0.5">{album.name}</h2></div>
                <span className="text-xs text-muted-foreground">{album.items.length} QR</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4">
                {album.items.map((item: any) => {
                  const selected = selectedSet.has(item.id);
                  return <article key={item.id} className={`relative rounded-xl border p-3 transition-colors ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/30'}`}>
                    <button onClick={() => toggleSelect(item.id)} aria-label={`Pilih ${item.assetCode}`} className="absolute top-2 left-2 z-10 rounded-md bg-background/90 border p-1 text-foreground">{selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}</button>
                    <a href={item.publicUrl} target="_blank" rel="noreferrer" title="Buka URL QR" className="absolute top-2 right-2 z-10 rounded-md bg-background/90 border p-1"><ExternalLink className="h-4 w-4" /></a>
                    <button onClick={() => toggleSelect(item.id)} className="w-full">
                      <div className="aspect-square rounded-lg bg-white p-2 overflow-hidden"><img src={`/api/v1/qr/inventory/${item.id}/stored-image?v=${cacheVersion}-${encodeURIComponent(item.updatedAt)}`} alt={`QR ${item.assetCode}`} loading="lazy" className="w-full h-full object-contain" /></div>
                      <p className="font-semibold text-sm mt-3 truncate" title={item.assetCode}>{item.assetCode}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate" title={item.specificArea || item.area || ''}>{item.specificArea || item.area || 'Lokasi belum diatur'}</p>
                    </button>
                  </article>;
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-20 text-center"><p className="text-lg font-bold">{value}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}
