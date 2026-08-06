import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryList, useDeleteInventory, useUpdateInventoryStatus } from '../hooks';
import { useAreas } from '../../master-data/hooks';
import { useItemTypes } from '../../master-data/hooks';
import { useAuth } from '../../auth/useAuth';
import { QueryInventoryDto } from '../types';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Plus, Eye, Trash2 } from 'lucide-react';

export function InventoryPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const deleteInventory = useDeleteInventory();
  const updateStatus = useUpdateInventoryStatus();

  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatufilter] = useState<'active' | 'inactive' | ''>('');
  const [page, setPage] = useState(1);

  const query: QueryInventoryDto = {
    search,
    itemTypeId: itemTypeFilter ? Number(itemTypeFilter) : undefined,
    areaId: areaFilter ? Number(areaFilter) : undefined,
    status: statusFilter || undefined,
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

  const handleDelete = async (inv: any) => {
    if (!confirm(`Hapus inventaris "${inv.assetCode}"?`)) return;
    try {
      await deleteInventory.mutateAsync(inv.id);
    } catch (e: any) {
      alert(e?.message || 'Gagal menghapus inventaris');
    }
  };

  const handleStatusToggle = async (inv: any) => {
    const next = inv.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus.mutateAsync({ id: inv.id, status: next });
    } catch (e: any) {
      alert(e?.message || 'Gagal mengubah status');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setItemTypeFilter('');
    setAreaFilter('');
    setStatufilter('');
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Inventaris</h2>
          <p className="text-sm text-gray-600">Kelola seluruh inventaris compliance perusahaan.</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/inventory/new')}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Inventaris
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 md:grid-cols-5 mb-4">
        <Input
          type="text"
          placeholder="Cari no. inventaris, lokasi, remark..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={itemTypeFilter} onValueChange={(v) => { setItemTypeFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Semua Jenis Item" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Jenis Item</SelectItem>
            {itemTypes.map((t: any) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={(v) => { setAreaFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Semua Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Area</SelectItem>
            {areas.map((a: any) => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatufilter(v as any); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={resetFilters}>Reset Filter</Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-gray-500 py-8 text-center">Memuat inventaris...</p>
      ) : isError ? (
        <p className="text-red-500 py-8 text-center">Gagal memuat inventaris.</p>
      ) : inventories.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">
          {search || itemTypeFilter || areaFilter || statusFilter
            ? 'Tidak ada inventaris yang cocok dengan filter.'
            : 'Belum ada inventaris.'}
        </p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Inventaris</TableHead>
                  <TableHead>Jenis Item</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead>Status</TableHead>
                  {canUpdate && <TableHead>Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventories.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-gray-900">{inv.assetCode}</TableCell>
                    <TableCell className="text-gray-600">{inv.itemType ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{inv.category ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{inv.area ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{inv.specificArea ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{formatPic(inv.picUsers)}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'active' ? 'default' : 'destructive'}>
                        {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    {canUpdate && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${inv.id}`)}>
                            <Eye className="h-4 w-4 mr-1" /> Lihat
                          </Button>
                          <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => handleStatusToggle(inv)}>
                            {inv.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(inv)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Total: {meta.total} inventaris</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Sebelumnya</Button>
                <span className="px-3 py-1">Hal {page} / {meta.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages}>Berikutnya</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatPic(users: any[]) {
  if (!users || users.length === 0) return '—';
  const names = users.map((u) => u.name).join(', ');
  if (names.length > 40) return `${users.slice(0, 2).map((u) => u.name).join(', ')} +${users.length - 2}`;
  return names;
}
