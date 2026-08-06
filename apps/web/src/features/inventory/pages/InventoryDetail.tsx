import { useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  ClipboardCheck,
  Clock3,
  Grid3X3,
  ImageIcon,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useInventoryDetail,
  useUpdateInventoryStatus,
  useDeleteInventory,
  useUploadInventoryPhoto,
} from '../hooks';
import { useComplianceHistory, useCompliancePeriods } from '../../compliance/hooks';
import { useAuth } from '../../auth/useAuth';

const STATUS_LABELS: Record<string, string> = {
  done: 'Selesai',
  pending: 'Pending',
  late: 'Terlambat',
  future: 'Belum tersedia',
  offday: 'Hari libur',
};

const INVENTORY_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Tidak Aktif',
  maintenance: 'Perbaikan',
  disposed: 'Dilepas',
};

export function InventoryDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const inventoryId = Number(id);
  const { data, isLoading, isError, error } = useInventoryDetail(inventoryId);
  const { hasPermission } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
  const uploadPhoto = useUploadInventoryPhoto();

  if (isLoading) return <p className="text-muted-foreground py-12 text-center">Memuat inventaris...</p>;
  if (isError || !data) return <p className="text-red-500 py-12 text-center">{(error as any)?.message || 'Inventaris tidak ditemukan.'}</p>;

  const inv = data.data;
  const periods = periodsQuery.data?.data?.periods ?? [];
  const history = historyQuery.data?.data?.logs ?? [];

  const templateReferences = new Map<number, any>();
  for (const period of periods) {
    if (!templateReferences.has(period.templateId)) templateReferences.set(period.templateId, period);
  }
  const firstChecklistTemplate = Array.from(templateReferences.values())[0];

  const recommended = new Map<string, any>();
  for (const period of periods) {
    if (!period.editable || !['pending', 'late'].includes(period.status)) continue;
    const key = `${period.templateId}:${period.sessionId ?? 'none'}`;
    if (!recommended.has(key)) recommended.set(key, period);
  }
  const checklistActions = Array.from(recommended.values());

  const openChecklistCalendar = (template: any) => {
    const query = new URLSearchParams({ templateId: String(template.templateId) });
    const periodYm = typeof template.periodKey === 'string' ? template.periodKey.slice(0, 7) : '';
    if (/^\d{4}-\d{2}$/.test(periodYm)) query.set('ym', periodYm);
    navigate(`/compliance/inventory/${inventoryId}/execution?${query.toString()}`);
  };

  const openExecution = (period: any) => {
    const query = new URLSearchParams({ templateId: String(period.templateId), periodKey: period.periodKey });
    if (period.sessionId != null) query.set('sessionId', String(period.sessionId));
    navigate(`/compliance/inventory/${inventoryId}/execution?${query.toString()}`);
  };

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Foto harus berformat JPEG, PNG, atau WebP');
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressed = await compressInventoryPhoto(file);
      if (compressed.size > 5 * 1024 * 1024) throw new Error('Ukuran foto setelah kompresi masih lebih dari 5MB');
      await uploadPhoto.mutateAsync({ id: inventoryId, file: compressed });
      toast.success(inv.photo ? 'Foto inventaris berhasil diperbarui' : 'Foto inventaris berhasil diunggah');
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal mengunggah foto inventaris');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus inventaris "${inv.assetCode}"?`)) return;
    try {
      await deleteInventory.mutateAsync(inv.id);
      navigate('/inventory');
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal menghapus inventaris');
    }
  };

  const handleStatus = async (status: string) => {
    if (!status || status === inv.status) return;
    try {
      await updateStatus.mutateAsync({ id: inv.id, status });
      toast.success('Status inventaris diperbarui');
    } catch (caught: any) {
      toast.error(caught?.message || 'Gagal mengubah status');
    }
  };

  const backTarget = canListInventory ? '/inventory' : '/';
  const photoUrl = inv.photo ? `/api/v1/inventory/${inventoryId}/photo?v=${encodeURIComponent(inv.updatedAt)}` : null;
  const statusTone = inv.status === 'active'
    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-200'
    : inv.status === 'maintenance'
      ? 'bg-amber-500/15 text-amber-700 border-amber-200'
      : 'bg-muted text-muted-foreground border-border';

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="min-w-0">
            {(location.state as any)?.fromQr && <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Dibuka dari hasil scan QR</p>}
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Detail Compliance Inventory</p>
            <h1 className="text-2xl font-bold mt-1 break-words">{inv.itemTypeName ?? 'Jenis item belum diatur'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Kode inventaris: <strong className="text-foreground">{inv.assetCode}</strong></p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${statusTone}`}>Status: {INVENTORY_STATUS_LABELS[inv.status] ?? inv.status}</span>
              <span className="inline-flex px-2.5 py-1 rounded-full border text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-200">Area: {inv.areaName ?? '—'}</span>
              <span className="inline-flex px-2.5 py-1 rounded-full border text-xs font-medium bg-muted text-muted-foreground">Kategori: {inv.categoryName ?? '—'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {canUseGrid && <button onClick={() => navigate(`/compliance/inventory/${inventoryId}`)} className="inline-flex items-center gap-2 px-3.5 py-2 border border-input rounded-lg text-sm hover:bg-muted"><Grid3X3 className="h-4 w-4" />Grid Checklist</button>}
            {canExecute && <button disabled={periodsQuery.isLoading || !firstChecklistTemplate} onClick={() => firstChecklistTemplate && openChecklistCalendar(firstChecklistTemplate)} className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"><ClipboardCheck className="h-4 w-4" />{periodsQuery.isLoading ? 'Memuat...' : 'Buka Checklist'}</button>}
            <button onClick={() => navigate(backTarget)} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg"><ArrowLeft className="h-4 w-4" />Kembali</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden">
            {photoUrl ? (
              <a href={photoUrl} target="_blank" rel="noreferrer" className="w-full h-full">
                <img src={photoUrl} alt={`Foto ${inv.assetCode}`} className="w-full h-full object-cover" />
              </a>
            ) : (
              <div className="text-center text-muted-foreground px-6">
                <ImageIcon className="h-14 w-14 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Belum ada foto inventaris</p>
                <p className="text-xs mt-1">Ambil foto agar inventaris lebih mudah dikenali.</p>
              </div>
            )}
          </div>
          {canUpdateInventory && (
            <div className="p-4 border-t border-border">
              <label className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${uploadingPhoto ? 'bg-muted text-muted-foreground pointer-events-none' : 'bg-primary text-primary-foreground'}`}>
                <Camera className="h-4 w-4" />
                {uploadingPhoto ? 'Memproses foto...' : photoUrl ? 'Ganti Foto Inventaris' : 'Upload Foto Inventaris'}
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" disabled={uploadingPhoto} onChange={event => { void handlePhotoUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
              </label>
              <p className="text-[11px] text-muted-foreground text-center mt-2">Foto otomatis dikompres. JPEG, PNG, atau WebP.</p>
            </div>
          )}
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Informasi Inventaris</h2></div>
          <dl className="divide-y divide-border text-sm">
            <InfoRow label="Nama Item" value={inv.itemTypeName ?? '—'} />
            <InfoRow label="No. Inventaris" value={inv.assetCode} strong />
            <InfoRow label="Kategori" value={inv.categoryName ?? '—'} />
            <InfoRow label="Area" value={`${inv.areaName ?? '—'}${inv.specificArea ? ` · ${inv.specificArea}` : ''}`} icon={<MapPin className="h-4 w-4" />} />
            <InfoRow label="PIC" value={inv.picUsers?.length ? inv.picUsers.map((pic: any) => pic.name).join(', ') : '—'} icon={<UserRound className="h-4 w-4" />} />
            <InfoRow label="Deskripsi" value={inv.typeDescription ?? '—'} />
            <InfoRow label="Catatan" value={inv.remark ?? '—'} />
            <InfoRow label="Dibuat" value={new Date(inv.createdAt).toLocaleString('id-ID')} />
            <InfoRow label="Diperbarui" value={new Date(inv.updatedAt).toLocaleString('id-ID')} />
          </dl>
          {(canUpdateInventory || canDeleteInventory) && (
            <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              {canUpdateInventory ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select value={inv.status ?? 'active'} onChange={event => void handleStatus(event.target.value)} className="border border-input rounded-lg px-2.5 py-2 text-sm bg-card">
                    <option value="active">Aktif</option><option value="inactive">Tidak Aktif</option><option value="maintenance">Perbaikan</option><option value="disposed">Dilepas</option>
                  </select>
                </div>
              ) : <span />}
              <div className="flex gap-2">
                {canUpdateInventory && <button onClick={() => navigate(`/inventory/${inv.id}/edit`)} className="inline-flex items-center gap-2 px-3.5 py-2 border border-input rounded-lg text-sm hover:bg-muted"><Pencil className="h-4 w-4" />Edit</button>}
                {canDeleteInventory && <button onClick={handleDelete} className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 text-white rounded-lg text-sm"><Trash2 className="h-4 w-4" />Hapus</button>}
              </div>
            </div>
          )}
        </section>
      </div>

      {canExecute && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-start gap-3"><ClipboardCheck className="h-5 w-5 text-primary mt-0.5" /><div><h2 className="font-semibold">Pelaksanaan Checklist</h2><p className="text-xs text-muted-foreground mt-1">Periode aktif yang dapat diisi untuk inventaris ini.</p></div></div>
          {periodsQuery.isLoading ? <p className="p-6 text-center text-muted-foreground">Memuat periode checklist...</p> : checklistActions.length === 0 ? (
            <div className="p-7 text-center"><Clock3 className="h-7 w-7 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Tidak ada periode yang dapat diisi saat ini.</p>{firstChecklistTemplate && <button onClick={() => openChecklistCalendar(firstChecklistTemplate)} className="mt-3 px-4 py-2 border border-primary text-primary rounded-lg text-sm">Buka Kalender Checklist</button>}</div>
          ) : (
            <div className="divide-y divide-border">{checklistActions.map((period: any) => <div key={`${period.templateId}-${period.periodKey}-${period.sessionId ?? 'none'}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{period.templateName}</p><p className="text-xs text-muted-foreground mt-1">{period.periodLabel}{period.sessionName ? ` · ${period.sessionName}` : ''} · {STATUS_LABELS[period.status] ?? period.status}</p></div><button onClick={() => openExecution(period)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Isi Checklist</button></div>)}</div>
          )}
        </section>
      )}

      {canViewResults && (
        <section id="hasil-checklist" className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Hasil Checklist</h2><p className="text-xs text-muted-foreground mt-1">Riwayat pemeriksaan yang sudah disimpan.</p></div>
          {historyQuery.isLoading ? <p className="p-6 text-center text-muted-foreground">Memuat hasil checklist...</p> : history.length === 0 ? <p className="p-6 text-center text-muted-foreground">Belum ada hasil checklist.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-4 py-3">Checklist</th><th className="px-4 py-3">Periode</th><th className="px-4 py-3">Tanggal cek</th><th className="px-4 py-3">Jawaban</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-border">{history.map((result: any) => <tr key={result.id}><td className="px-4 py-3">{result.templateName}{result.sessionName ? ` · ${result.sessionName}` : ''}</td><td className="px-4 py-3">{result.periodLabel ?? result.periodKey}</td><td className="px-4 py-3">{new Date(result.checkDate).toLocaleString('id-ID')}</td><td className="px-4 py-3">{result.answerCount}</td><td className="px-4 py-3"><button onClick={() => navigate(`/inventory/${inventoryId}/checklist-results/${result.id}`)} className="text-primary hover:underline">Lihat Hasil</button></td></tr>)}</tbody></table></div>
          )}
        </section>
      )}
    </div>
  );
}

function InfoRow({ label, value, strong, icon }: { label: string; value: string; strong?: boolean; icon?: React.ReactNode }) {
  return <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr] gap-3 px-5 py-3.5"><dt className="text-muted-foreground">{label}</dt><dd className={`flex items-start gap-2 break-words ${strong ? 'font-semibold' : ''}`}>{icon}{value}</dd></div>;
}

async function compressInventoryPhoto(file: File): Promise<File> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Gagal membaca foto inventaris'));
    element.src = source;
  });
  const scale = Math.min(1, 1600 / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas tidak tersedia');
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Gagal mengompres foto inventaris')), 'image/jpeg', 0.82));
  return new File([blob], `inventory-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
