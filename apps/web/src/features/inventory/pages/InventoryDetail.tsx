import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useInventoryDetail, useUpdateInventoryStatus, useDeleteInventory } from '../hooks';
import { useComplianceHistory, useCompliancePeriods } from '../../compliance/hooks';
import { useAuth } from '../../auth/useAuth';

const STATUS_LABELS: Record<string, string> = {
  done: 'Selesai',
  pending: 'Pending',
  late: 'Terlambat',
  future: 'Belum tersedia',
  offday: 'Hari libur',
};

export function InventoryDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const inventoryId = Number(id);
  const { data, isLoading, isError, error } = useInventoryDetail(inventoryId);
  const { hasPermission } = useAuth();

  const canExecute = hasPermission('compliance.execute');
  const canViewResults = hasPermission('compliance.view');
  const canUseGrid = canExecute && canViewResults;
  const canUpdateInventory = hasPermission('inventory.update');
  const canDeleteInventory = hasPermission('inventory.delete');
  const canListInventory = hasPermission('inventory.view');

  const periodsQuery = useCompliancePeriods(canExecute ? inventoryId : undefined);
  const historyQuery = useComplianceHistory(canViewResults ? inventoryId : undefined);
  const deleteInventory = useDeleteInventory();
  const updateStatus = useUpdateInventoryStatus();

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat inventaris...</p>;
  if (isError || !data) return <p className="text-red-500 py-8 text-center">{(error as any)?.message || 'Inventaris tidak ditemukan.'}</p>;

  const inv = data.data;
  const periods = periodsQuery.data?.data?.periods ?? [];
  const history = historyQuery.data?.data?.logs ?? [];

  // The API sorts newest first. Keep one recommended editable occurrence per
  // template/session so a daily checklist does not render dozens of buttons.
  const recommended = new Map<string, any>();
  for (const period of periods) {
    if (!period.editable || !['pending', 'late'].includes(period.status)) continue;
    const key = `${period.templateId}:${period.sessionId ?? 'none'}`;
    if (!recommended.has(key)) recommended.set(key, period);
  }
  const checklistActions = Array.from(recommended.values());
  const firstChecklist = checklistActions[0];

  const openExecution = (period: any) => {
    const query = new URLSearchParams({
      templateId: String(period.templateId),
      periodKey: period.periodKey,
    });
    if (period.sessionId != null) query.set('sessionId', String(period.sessionId));
    navigate(`/compliance/inventory/${inventoryId}/execution?${query.toString()}`);
  };

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
    if (!status) return;
    try {
      await updateStatus.mutateAsync({ id: inv.id, status });
    } catch (e: any) {
      alert(e?.message || 'Gagal mengubah status');
    }
  };

  const backTarget = canListInventory ? '/inventory' : '/';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {(location.state as any)?.fromQr && <p className="text-xs font-medium text-primary mb-1">Dibuka dari hasil scan QR</p>}
          <h2 className="text-xl font-bold text-foreground">Detail Inventaris</h2>
          <p className="text-sm text-muted-foreground mt-1">{inv.assetCode} · {inv.itemTypeName ?? 'Jenis item belum diatur'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUseGrid && (
            <button onClick={() => navigate(`/compliance/inventory/${inventoryId}`)} className="px-4 py-2 border border-input rounded-lg text-sm">
              Grid Checklist
            </button>
          )}
          {canExecute && (
            <button disabled={!firstChecklist} onClick={() => firstChecklist && openExecution(firstChecklist)} className="px-4 py-2 primary text-white rounded-lg text-sm disabled:opacity-50">
              Checklist
            </button>
          )}
          <button onClick={() => navigate(backTarget)} className="px-3 py-2 text-sm text-muted-foreground hover:underline">← Kembali</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="font-semibold mb-4">Informasi Inventaris</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground">No. Inventaris</dt><dd className="font-medium">{inv.assetCode}</dd></div>
            <div><dt className="text-muted-foreground">Jenis Item</dt><dd>{inv.itemTypeName ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Kategori</dt><dd>{inv.categoryName ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Deskripsi</dt><dd>{inv.typeDescription ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="font-semibold mb-4">Lokasi</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground">Area</dt><dd>{inv.areaName ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Lokasi Spesifik</dt><dd>{inv.specificArea ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="font-semibold mb-4">PIC</h3>
          <div className="flex flex-wrap gap-2">
            {inv.picUsers.map((user: any) => (
              <span key={user.id} className="px-3 py-1 rounded-full text-sm bg-muted">
                {user.name} {user.status === 'inactive' && <span className="text-red-600">(Nonaktif)</span>}
              </span>
            ))}
            {inv.picUsers.length === 0 && <span className="text-muted-foreground">Tidak ada PIC</span>}
          </div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="font-semibold mb-4">Status</h3>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-700'}`}>
            {inv.status}
          </span>
          {canUpdateInventory && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground">Ubah Status</label>
              <select onChange={(event) => handleStatus(event.target.value)} className="w-full border rounded-lg p-2 mt-1">
                <option value="">Pilih status...</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="maintenance">Maintenance</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {canExecute && (
        <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Checklist</h3>
            <p className="text-xs text-muted-foreground mt-1">Periode aktif yang direkomendasikan untuk setiap template dan sesi.</p>
          </div>
          {periodsQuery.isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Memuat periode checklist...</p>
          ) : checklistActions.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Tidak ada checklist yang dapat diisi saat ini.</p>
          ) : (
            <ul className="divide-y divide-border">
              {checklistActions.map((period: any) => (
                <li key={`${period.templateId}-${period.periodKey}-${period.sessionId ?? 'none'}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{period.templateName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {period.periodLabel}{period.sessionName ? ` · ${period.sessionName}` : ''} · {STATUS_LABELS[period.status] ?? period.status}
                    </p>
                  </div>
                  <button onClick={() => openExecution(period)} className="px-4 py-2 primary text-white rounded-lg text-sm">Isi Checklist</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canViewResults && (
        <section id="hasil-checklist" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Hasil Checklist</h3>
            <p className="text-xs text-muted-foreground mt-1">Riwayat hasil pemeriksaan yang sudah disimpan.</p>
          </div>
          {historyQuery.isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Memuat hasil checklist...</p>
          ) : history.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Belum ada hasil checklist.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr><th className="px-4 py-3">Checklist</th><th className="px-4 py-3">Periode</th><th className="px-4 py-3">Tanggal cek</th><th className="px-4 py-3">Jawaban</th><th className="px-4 py-3">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((result: any) => (
                    <tr key={result.id}>
                      <td className="px-4 py-3">{result.templateName}{result.sessionName ? ` · ${result.sessionName}` : ''}</td>
                      <td className="px-4 py-3">{result.periodLabel ?? result.periodKey}</td>
                      <td className="px-4 py-3">{new Date(result.checkDate).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">{result.answerCount}</td>
                      <td className="px-4 py-3"><button onClick={() => navigate(`/inventory/${inventoryId}/checklist-results/${result.id}`)} className="text-primary hover:underline">Lihat Hasil</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <h3 className="font-semibold mb-4">Metadata</h3>
        <dl className="space-y-2 text-sm">
          <div><dt className="text-muted-foreground">Dibuat</dt><dd>{new Date(inv.createdAt).toLocaleString('id-ID')}</dd></div>
          <div><dt className="text-muted-foreground">Diperbarui</dt><dd>{new Date(inv.updatedAt).toLocaleString('id-ID')}</dd></div>
          <div><dt className="text-muted-foreground">Catatan</dt><dd>{inv.remark ?? '—'}</dd></div>
        </dl>
      </div>

      {(canUpdateInventory || canDeleteInventory) && (
        <div className="flex justify-end gap-3 pt-4">
          {canUpdateInventory && <button onClick={() => navigate(`/inventory/${inv.id}/edit`)} className="px-4 py-2 border border-input rounded-lg">Edit</button>}
          {canDeleteInventory && <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Hapus Inventaris</button>}
        </div>
      )}
    </div>
  );
}
