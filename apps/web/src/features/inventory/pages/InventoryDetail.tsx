import { useParams, useNavigate } from 'react-router-dom';
import { useInventoryDetail, useUpdateInventoryStatus, useDeleteInventory } from '../hooks';
import { useAuth } from '../../auth/useAuth';

export function InventoryDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isLoading } = useInventoryDetail(Number(id));
  const { hasPermission } = useAuth();
  const deleteInventory = useDeleteInventory();
  const updateStatus = useUpdateInventoryStatus();

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat inventaris...</p>;
  if (!data) return null;

  const inv = data.data;

  const handleDelete = async () => {
    if (!confirm(`Hapus inventaris "${inv.assetCode}"?`)) return;
    try {
      await deleteInventory.mutateAsync(inv.id);
      navigate('/inventory');
    } catch (e: any) {
      alert(e?.message || 'Gagal menghapus');
    }
  };

  const handleStatus = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: inv.id, status });
    } catch (e: any) {
      alert(e?.message || 'Gagal mengubah status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Detail Inventaris</h2>
        <button onClick={() => navigate('/inventory')} className="text-sm text-muted-foreground hover:underline">← Kembali</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Informasi Inventaris</h3>
          <dl className="space-y-2">
            <div><dt className="text-muted-foreground">No. Inventaris</dt><dd className="font-medium">{inv.assetCode}</dd></div>
            <div><dt className="text-muted-foreground">Jenis Item</dt><dd>{inv.itemTypeName ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Kategori</dt><dd>{inv.categoryName ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="bg-card rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Lokasi</h3>
          <dl className="space-y-2">
            <div><dt className="text-muted-foreground">Area</dt><dd>{inv.areaName ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Lokasi Spesifik</dt><dd>{inv.specificArea ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="bg-card rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">PIC</h3>
          <div className="flex flex-wrap gap-2">
            {inv.picUsers.map((u: any) => (
              <span key={u.id} className="px-3 py-1 rounded-full text-sm bg-muted">
                {u.name} {u.status === 'inactive' && <span className="text-red-600">(Nonaktif)</span>}
              </span>
            ))}
            {inv.picUsers.length === 0 && <span className="text-muted-foreground">Tidak ada PIC</span>}
          </div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Status</h3>
          <dd>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
              {inv.status}
            </span>
          </dd>
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground">Ubah Status</label>
            <select onChange={(e) => handleStatus(e.target.value)} className="w-full border rounded-lg p-2 mt-1">
              <option value="">Pilih status...</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold mb-4">Metadata</h3>
        <dl className="space-y-2 text-sm">
          <div><dt className="text-muted-foreground">Dibuat</dt><dd>{new Date(inv.createdAt).toLocaleString('id-ID')}</dd></div>
          <div><dt className="text-muted-foreground">Diperbarui</dt><dd>{new Date(inv.updatedAt).toLocaleString('id-ID')}</dd></div>
          <div><dt className="text-muted-foreground">Catatan</dt><dd>{inv.remark ?? '—'}</dd></div>
        </dl>
      </div>

      {/* Placeholder for future features */}
      <div className="bg-card rounded-xl shadow-sm border border-dashed border-input p-6">
        <h3 className="font-semibold text-muted-foreground mb-2">Checklist</h3>
        <p className="text-sm text-muted-foreground">Fitur ini akan datang pada Gate berikutnya.</p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {hasPermission('inventory.update') && (
          <button onClick={() => navigate(`/inventory/${inv.id}/edit`)} className="px-4 py-2 border border-input rounded-lg">
            Edit
          </button>
        )}
        {hasPermission('inventory.delete') && (
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Hapus Inventaris</button>
        )}
      </div>
    </div>
  );
}
