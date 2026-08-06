import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInventoryDetail, useCreateInventory, useUpdateInventory, useNextAssetCode, useUploadInventoryPhoto } from '../hooks';
import { useAreas, useItemTypes } from '../../master-data/hooks';
import { useUsers } from '../../users/hooks';

const inventorySchema = z.object({
  itemTypeId: z.number().min(1, 'Jenis item wajib dipilih'),
  areaId: z.number().min(1, 'Area wajib dipilih'),
  specificArea: z.string().optional(),
  typeDescription: z.string().optional(),
  status: z.string().default('active'),
  remark: z.string().optional(),
  picUserIds: z.array(z.number()).optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

export function InventoryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const inventoryId = isEdit ? Number(id) : undefined;

  const { data: inventoryData, isLoading: isLoadingInv } = useInventoryDetail(inventoryId);
  const { data: areasData } = useAreas();
  const { data: itemTypesData } = useItemTypes();
  const { data: usersData } = useUsers({ status: 'active' });
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();
  const uploadPhoto = useUploadInventoryPhoto();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const areas = areasData?.data ?? [];
  const itemTypes = itemTypesData?.data ?? [];
  const activeUsers = usersData?.data?.items ?? [];

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { itemTypeId: 0, areaId: 0, specificArea: '', typeDescription: '', status: 'active', remark: '', picUserIds: [] },
  });

  const watchedItemTypeId = Number(watch('itemTypeId')) || 0;
  const selectedItemType = itemTypes.find((item: any) => item.id === watchedItemTypeId);
  const { data: previewData, isFetching: isPreviewing } = useNextAssetCode(isEdit ? undefined : watchedItemTypeId);
  const assetCodePreview = isEdit ? inventoryData?.data?.assetCode ?? '' : previewData?.data?.assetCode ?? '';
  const localPhotoUrl = useMemo(() => photoFile ? URL.createObjectURL(photoFile) : null, [photoFile]);

  useEffect(() => () => { if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl); }, [localPhotoUrl]);

  useEffect(() => {
    if (isEdit && inventoryData) {
      const inventory = inventoryData.data;
      reset({
        itemTypeId: inventory.itemTypeId ?? 0,
        areaId: inventory.areaId ?? 0,
        specificArea: inventory.specificArea ?? '',
        typeDescription: inventory.typeDescription ?? '',
        status: inventory.status ?? 'active',
        remark: inventory.remark ?? '',
        picUserIds: inventory.picUsers.map((user: any) => user.id),
      });
    }
  }, [inventoryData, isEdit, reset]);

  const handleSubmitForm = async (data: InventoryFormData) => {
    setError(null);
    setLoading(true);
    try {
      const payload = { ...data, itemTypeId: Number(data.itemTypeId), areaId: Number(data.areaId), picUserIds: data.picUserIds ?? [] };
      let savedId: number;
      if (isEdit) {
        const result = await updateInventory.mutateAsync({ id: Number(id), data: payload });
        savedId = result.data.id;
      } else {
        const result = await createInventory.mutateAsync(payload);
        savedId = result.data.id;
      }
      if (photoFile) await uploadPhoto.mutateAsync({ id: savedId, file: photoFile });
      navigate(`/inventory/${savedId}`);
    } catch (caught: any) {
      setError(caught?.message || 'Gagal menyimpan inventaris');
    } finally {
      setLoading(false);
    }
  };

  const togglePic = (userId: number) => {
    const current = watch('picUserIds') ?? [];
    setValue('picUserIds', current.includes(userId) ? current.filter(picId => picId !== userId) : [...current, userId]);
  };

  if (isEdit && isLoadingInv) return <p className="text-center py-8">Memuat...</p>;
  const existingPhoto = isEdit && inventoryData?.data?.photo ? `/api/v1/inventory/${id}/photo` : null;

  return <div className="max-w-2xl mx-auto bg-card p-6 rounded-xl shadow-sm border border-border">
    <h2 className="text-xl font-bold mb-6">{isEdit ? 'Edit Inventaris' : 'Tambah Inventaris'}</h2>
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium">Jenis Item</label><select {...register('itemTypeId', { valueAsNumber: true })} className="w-full border rounded-lg p-2 mt-1"><option value="0">Pilih...</option>{itemTypes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.itemTypeId && <p className="text-red-500 text-sm mt-1">{errors.itemTypeId.message}</p>}</div><div><label className="block text-sm font-medium">Kategori</label><input disabled value={selectedItemType?.categoryName ?? '—'} className="w-full border rounded-lg p-2 mt-1 bg-muted/50" /></div></div>
      <div><label className="block text-sm font-medium">Nomor Inventaris</label><input readOnly value={assetCodePreview || (isPreviewing ? 'Menyiapkan...' : 'Otomatis setelah jenis item dipilih')} className="w-full border rounded-lg p-2 mt-1 bg-muted/50 text-muted-foreground" /><p className="text-xs text-muted-foreground mt-1">{isEdit ? 'Nomor inventaris tidak dapat diubah.' : 'Dibuat dari kode kategori, kode item, dan nomor urut. QR otomatis dibuat saat disimpan.'}</p></div>
      <div><label className="block text-sm font-medium">Area</label><select {...register('areaId', { valueAsNumber: true })} className="w-full border rounded-lg p-2 mt-1"><option value="0">Pilih...</option>{areas.map((area: any) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>{errors.areaId && <p className="text-red-500 text-sm mt-1">{errors.areaId.message}</p>}</div>
      <div><label className="block text-sm font-medium">Lokasi Spesifik</label><input {...register('specificArea')} className="w-full border rounded-lg p-2 mt-1" placeholder="Contoh: Lantai 2, Ruang Server" /></div>
      <div><label className="block text-sm font-medium">Keterangan Tipe</label><input {...register('typeDescription')} className="w-full border rounded-lg p-2 mt-1" placeholder="Contoh: APAR Powder 3kg" /></div>
      <div><label className="block text-sm font-medium">Foto Inventaris <span className="text-muted-foreground font-normal">(opsional)</span></label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhotoFile(event.target.files?.[0] ?? null)} className="w-full border rounded-lg p-2 mt-1" /><p className="text-xs text-muted-foreground mt-1">JPEG, PNG, atau WebP. Maksimal 5MB.</p>{(localPhotoUrl || existingPhoto) && <img src={localPhotoUrl || existingPhoto!} alt="Preview inventaris" className="mt-3 h-40 w-full rounded-lg border object-contain bg-muted/30" />}</div>
      <div><label className="block text-sm font-medium">PIC</label><p className="text-xs text-muted-foreground mt-1">Pilih satu atau beberapa PIC.</p><div className="flex flex-wrap gap-2 mt-2 min-h-[40px] border rounded-lg p-2 bg-muted/50">{activeUsers.map((user: any) => <button key={user.id} type="button" onClick={() => togglePic(user.id)} className={`px-3 py-1.5 rounded-full text-sm border ${watch('picUserIds')?.includes(user.id) ? 'primary text-white border-blue-600' : 'bg-card border-input'}`}>{user.name}</button>)}{activeUsers.length === 0 && <span className="text-sm text-muted-foreground">Tidak ada pengguna aktif</span>}</div></div>
      <div><label className="block text-sm font-medium">Status</label><select {...register('status')} className="w-full border rounded-lg p-2 mt-1"><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="maintenance">Perbaikan</option><option value="disposed">Dilepas</option></select></div>
      <div><label className="block text-sm font-medium">Catatan</label><textarea {...register('remark')} rows={3} className="w-full border rounded-lg p-2 mt-1" /></div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => navigate(isEdit ? `/inventory/${id}` : '/inventory')} className="px-4 py-2 border rounded-lg">Batal</button><button type="submit" disabled={loading} className="px-4 py-2 primary text-white rounded-lg">{loading ? 'Menyimpan...' : 'Simpan'}</button></div>
    </form>
  </div>;
}
