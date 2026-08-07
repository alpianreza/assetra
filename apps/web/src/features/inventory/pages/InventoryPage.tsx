import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useInventoryList, useDeleteInventory, useUpdateInventoryStatus } from '../hooks';
import { useAreas, useItemTypes } from '../../master-data/hooks';
import { useAuth } from '../../auth/useAuth';
import { InventoryStatus, QueryInventoryDto } from '../types';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Boxes, Eye, MapPin, Plus, RotateCcw, Search, Trash2, UserRound } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = { active: 'Aktif', inactive: 'Tidak Aktif', maintenance: 'Perbaikan', disposed: 'Dilepas' };
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  inactive: 'bg-muted text-muted-foreground border-border',
  maintenance: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
  disposed: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/25',
};

export function InventoryPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const deleteInventory = useDeleteInventory();
  const updateStatus = useUpdateInventoryStatus();
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const query: QueryInventoryDto = {
    search: search || undefined,
    itemTypeId: itemTypeFilter !== 'all' ? Number(itemTypeFilter) : undefined,
    areaId: areaFilter !== 'all' ? Number(areaFilter) : undefined,
    status: statusFilter !== 'all' ? statusFilter as InventoryStatus : undefined,
    page,
  };

  const { data, isLoading, isError } = useInventoryList(query);
  const { data: areasData } = useAreas();
  const { data: itemTypesData } = useItemTypes();
  const inventories = data?.data?.items ?? [];
  const meta = data?.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
  const areas = areasData?.data ?? [];
  const itemTypes = itemTypesData?.data ?? [];
  const canCreate = hasPermission('inventory.create');
  const canDelete = hasPermission('inventory.delete');
  const canUpdate = hasPermission('inventory.update');

  const activeOnPage = inventories.filter((inventory: any) => inventory.status === 'active').length;
  const attentionOnPage = inventories.filter((inventory: any) => ['maintenance', 'inactive'].includes(inventory.status)).length;

  const handleDelete = async (inventory: any) => {
    if (!confirm(`Hapus inventaris "${inventory.assetCode}"?`)) return;
    try {
      await deleteInventory.mutateAsync(inventory.id);
      toast.success('Inventaris berhasil dihapus');
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal menghapus inventaris');
    }
  };

  const handleStatusToggle = async (inventory: any) => {
    const next = inventory.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus.mutateAsync({ id: inventory.id, status: next });
      toast.success(`Inventaris ${next === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal mengubah status');
    }
  };

  const resetFilters = () => {
    setSearch(''); setItemTypeFilter('all'); setAreaFilter('all'); setStatusFilter('all'); setPage(1);
  };

  const hasFilters = Boolean(search || itemTypeFilter !== 'all' || areaFilter !== 'all' || statusFilter !== 'all');

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Asset Management</p><h1 className="text-2xl font-bold mt-1">Inventaris</h1><p className="text-sm text-muted-foreground mt-1">Kelola aset, lokasi, PIC, status, foto, QR, dan checklist dalam satu tempat.</p></div>
        {canCreate && <Button onClick={() => navigate('/inventory/new')}><Plus className="h-4 w-4 mr-2" />Tambah Inventaris</Button>}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard icon={<Boxes className="h-5 w-5" />} label="Total Inventaris" value={meta.total} tone="text-primary bg-primary/10" />
        <SummaryCard icon={<Boxes className="h-5 w-5" />} label="Aktif di Halaman Ini" value={activeOnPage} tone="text-emerald-600 bg-emerald-500/10" />
        <SummaryCard icon={<Boxes className="h-5 w-5" />} label="Perlu Perhatian" value={attentionOnPage} tone="text-amber-600 bg-amber-500/10" />
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari inventaris..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div>
          <Select value={itemTypeFilter} onValueChange={value => { setItemTypeFilter(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Semua Jenis Item" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Jenis Item</SelectItem>{itemTypes.map((item: any) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>
          <Select value={areaFilter} onValueChange={value => { setAreaFilter(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Semua Area" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Area</SelectItem>{areas.map((area: any) => <SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={value => { setStatusFilter(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Status</SelectItem><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Tidak Aktif</SelectItem><SelectItem value="maintenance">Perbaikan</SelectItem><SelectItem value="disposed">Dilepas</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={resetFilters} disabled={!hasFilters}><RotateCcw className="h-4 w-4 mr-2" />Reset Filter</Button>
        </div>
      </section>

      {isLoading ? <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">Memuat inventaris...</div> : isError ? <div className="rounded-2xl border border-red-500/30 bg-red-500/5 py-16 text-center text-red-600">Gagal memuat inventaris.</div> : inventories.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">{hasFilters ? 'Tidak ada inventaris yang cocok dengan filter.' : 'Belum ada inventaris.'}</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">{inventories.map((inventory: any) => <InventoryCard key={inventory.id} inventory={inventory} canUpdate={canUpdate} canDelete={canDelete} onView={() => navigate(`/inventory/${inventory.id}`)} onToggle={() => void handleStatusToggle(inventory)} onDelete={() => void handleDelete(inventory)} />)}</div>

          <section className="hidden lg:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="px-4 py-3 font-medium">No. Inventaris</th><th className="px-4 py-3 font-medium">Item & Kategori</th><th className="px-4 py-3 font-medium">Lokasi</th><th className="px-4 py-3 font-medium">PIC</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Aksi</th></tr></thead><tbody className="divide-y divide-border">{inventories.map((inventory: any) => <tr key={inventory.id} className="hover:bg-muted/25 transition-colors"><td className="px-4 py-4"><button onClick={() => navigate(`/inventory/${inventory.id}`)} className="font-semibold text-primary hover:underline">{inventory.assetCode}</button></td><td className="px-4 py-4"><p className="font-medium">{inventory.itemType ?? '—'}</p><p className="text-xs text-muted-foreground mt-1">{inventory.category ?? '—'}</p></td><td className="px-4 py-4"><p>{inventory.area ?? '—'}</p><p className="text-xs text-muted-foreground mt-1">{inventory.specificArea ?? 'Lokasi spesifik belum diatur'}</p></td><td className="px-4 py-4 text-muted-foreground">{formatPic(inventory.picUsers)}</td><td className="px-4 py-4"><StatusBadge status={inventory.status} /></td><td className="px-4 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${inventory.id}`)}><Eye className="h-4 w-4 mr-1" />Detail</Button>{canUpdate && <Button variant="ghost" size="sm" onClick={() => void handleStatusToggle(inventory)}>{inventory.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</Button>}{canDelete && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDelete(inventory)}><Trash2 className="h-4 w-4" /></Button>}</div></td></tr>)}</tbody></table></div>
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground"><span>Menampilkan {inventories.length} dari {meta.total} inventaris</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Sebelumnya</Button><span className="px-2 text-foreground">Hal {page} / {Math.max(1, meta.totalPages)}</span><Button variant="outline" size="sm" onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages}>Berikutnya</Button></div></div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-3"><div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>{icon}</div><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.inactive}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function InventoryCard({ inventory, canUpdate, canDelete, onView, onToggle, onDelete }: { inventory: any; canUpdate: boolean; canDelete: boolean; onView: () => void; onToggle: () => void; onDelete: () => void }) {
  return <article className="rounded-xl border border-border bg-card shadow-sm p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><button onClick={onView} className="font-semibold text-primary hover:underline truncate block max-w-full">{inventory.assetCode}</button><p className="font-medium mt-1 truncate">{inventory.itemType ?? '—'}</p><p className="text-xs text-muted-foreground mt-1">{inventory.category ?? '—'}</p></div><StatusBadge status={inventory.status} /></div><div className="mt-4 space-y-2 text-sm"><p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><span>{inventory.area ?? '—'}{inventory.specificArea ? ` · ${inventory.specificArea}` : ''}</span></p><p className="flex items-start gap-2"><UserRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><span>{formatPic(inventory.picUsers)}</span></p></div><div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border"><Button variant="outline" size="sm" onClick={onView}><Eye className="h-4 w-4 mr-1" />Detail</Button>{canUpdate && <Button variant="ghost" size="sm" onClick={onToggle}>{inventory.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</Button>}{canDelete && <Button variant="ghost" size="icon" className="ml-auto text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}</div></article>;
}

function formatPic(users: any[]) {
  if (!users?.length) return 'PIC belum diatur';
  if (users.length <= 2) return users.map(user => user.name).join(', ');
  return `${users.slice(0, 2).map(user => user.name).join(', ')} +${users.length - 2}`;
}
