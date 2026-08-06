import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInventoryDetail, useCreateInventory, useUpdateInventory } from '../hooks';
import { useAreas } from '../../master-data/hooks';
import { useItemTypes } from '../../master-data/hooks';
import { useUsers } from '../../users/hooks';

const inventorySchema = z.object({
  assetCode: z.string().min(1, 'Nomor inventaris wajib diisi'),
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

  const { data: inventoryData, isLoading: isLoadingInv } = useInventoryDetail(Number(id));
  const { data: areasData } = useAreas();
  const { data: itemTypesData } = useItemTypes();
  const { data: usersData } = useUsers({ status: 'active' });

  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areas = areasData?.data ?? [];
  const itemTypes = itemTypesData?.data ?? [];
  const activeUsers = usersData?.data?.items ?? [];

  const selectedItemType = itemTypes.find((t: any) => t.id === Number(watch('itemTypeId')));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      assetCode: '',
      itemTypeId: 0,
      areaId: 0,
      specificArea: '',
      typeDescription: '',
      status: 'active',
      remark: '',
      picUserIds: [],
    },
  });

  // Initialize form if editing
  useEffect(() => {
    if (isEdit && inventoryData) {
      const inv = inventoryData.data;
      const allPicIds = inv.picUsers.map((u: any) => u.id);
      reset({
        assetCode: inv.assetCode,
        itemTypeId: inv.itemTypeId ?? 0,
        areaId: inv.areaId ?? 0,
        specificArea: inv.specificArea ?? '',
        typeDescription: inv.typeDescription ?? '',
        status: inv.status ?? 'active',
        remark: inv.remark ?? '',
        picUserIds: allPicIds,
      });
    }
  }, [inventoryData, isEdit, reset]);

  const handleSubmitForm = async (data: InventoryFormData) => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...data,
        itemTypeId: Number(data.itemTypeId),
        areaId: Number(data.areaId),
        picUserIds: data.picUserIds ?? [],
      };
      if (isEdit) {
        await updateInventory.mutateAsync({ id: Number(id), data: payload });
      } else {
        await createInventory.mutateAsync(payload);
      }
      navigate('/inventory');
    } catch (e: any) {
      setError(e?.message || 'Gagal menyimpan inventaris');
    } finally {
      setLoading(false);
    }
  };

  const togglePic = (userId: number) => {
    const current = watch('picUserIds') ?? [];
    setValue(
      'picUserIds',
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  if (isEdit && isLoadingInv) return <p className="text-center py-8">Memuat...</p>;

  return (
    <div className="max-w-2xl mx-auto bg-card p-6 rounded-xl shadow-sm border border-border">
      <h2 className="text-xl font-bold mb-6">{isEdit ? 'Edit Inventaris' : 'Tambah Inventaris'}</h2>
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">Nomor Inventaris</label>
          <input
            {...register('assetCode')}
            className="w-full border rounded-lg p-2 mt-1"
          />
          {errors.assetCode && <p className="text-red-500 text-sm mt-1">{errors.assetCode.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Jenis Item</label>
            <select
              {...register('itemTypeId', { valueAsNumber: true })}
              className="w-full border rounded-lg p-2 mt-1"
            >
              <option value="0">Pilih...</option>
              {itemTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.itemTypeId && <p className="text-red-500 text-sm mt-1">{errors.itemTypeId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Kategori</label>
            <input
              type="text"
              disabled
              value={selectedItemType?.categoryName ?? '—'}
              className="w-full border rounded-lg p-2 mt-1 bg-muted/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Area</label>
          <select
            {...register('areaId', { valueAsNumber: true })}
            className="w-full border rounded-lg p-2 mt-1"
          >
            <option value="0">Pilih...</option>
            {areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {errors.areaId && <p className="text-red-500 text-sm mt-1">{errors.areaId.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Lokasi Spesifik</label>
          <input
            {...register('specificArea')}
            className="w-full border rounded-lg p-2 mt-1"
            placeholder="Contoh: Lantai 2, Ruang Server"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">PIC</label>
          <p className="text-xs text-muted-foreground mt-1">Pilih satu atau beberapa PIC. Hanya pengguna aktif yang ditampilkan.</p>
          <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] border rounded-lg p-2 bg-muted/50">
            {activeUsers.map((u: any) => (
              <button
                key={u.id}
                type="button"
                onClick={() => togglePic(u.id)}
                className={`px-3 py-1.5 rounded-full text-sm border ${watch('picUserIds')?.includes(u.id) ? 'primary text-white border-blue-600' : 'bg-card text-foreground border-input hover:border-blue-400'}`}
              >
                {u.name}
              </button>
            ))}
            {activeUsers.length === 0 && <span className="text-sm text-muted-foreground">Tidak ada pengguna aktif</span>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Status</label>
          <select {...register('status')} className="w-full border rounded-lg p-2 mt-1">
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Catatan</label>
          <textarea
            {...register('remark')}
            rows={3}
            className="w-full border rounded-lg p-2 mt-1"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => navigate('/inventory')} className="px-4 py-2 border rounded-lg">Batal</button>
          <button type="submit" disabled={loading} className="px-4 py-2 primary text-white rounded-lg">{loading ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}
