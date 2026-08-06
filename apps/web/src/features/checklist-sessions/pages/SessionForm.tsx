import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateSession, useUpdateSession } from '../hooks';

interface SessionFormProps {
  session?: any;
  onClose: () => void;
  onSaved: () => void;
}

const sessionSchema = z.object({
  name: z.string().min(1, 'Nama sesi wajib diisi'),
  code: z.string().min(1, 'Kode sesi wajib diisi'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format waktu mulai tidak valid (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format waktu selesai tidak valid (HH:MM)'),
  sortOrder: z.number().int().min(0, 'Urutan harus angka positif').optional(),
  isActive: z.boolean().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

export function SessionForm({ session, onClose, onSaved }: SessionFormProps) {
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      name: session?.name ?? '',
      code: session?.code ?? '',
      startTime: session?.startTime ?? '08:00',
      endTime: session?.endTime ?? '17:00',
      sortOrder: session?.sortOrder ?? 0,
      isActive: session?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (session) {
      reset({
        name: session.name,
        code: session.code,
        startTime: session.startTime,
        endTime: session.endTime,
        sortOrder: session.sortOrder,
        isActive: session.isActive,
      });
    }
  }, [session, reset]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: SessionFormData) => {
    setError(null);
    setLoading(true);
    try {
      if (session) {
        await updateSession.mutateAsync({ id: session.id, data });
      } else {
        await createSession.mutateAsync(data);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Gagal menyimpan sesi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{session ? 'Edit Sesi' : 'Tambah Sesi'}</h3>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nama Sesi</label>
            <input {...register('name')} className="w-full border rounded-lg p-2" />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Kode Sesi</label>
            <input {...register('code')} disabled={!!session} className="w-full border rounded-lg p-2 disabled:bg-muted" />
            {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Waktu Mulai (HH:MM)</label>
              <input type="text" {...register('startTime')} placeholder="HH:MM" className="w-full border rounded-lg p-2" />
              {errors.startTime && <p className="text-red-500 text-sm">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Waktu Selesai (HH:MM)</label>
              <input type="text" {...register('endTime')} placeholder="HH:MM" className="w-full border rounded-lg p-2" />
              {errors.endTime && <p className="text-red-500 text-sm">{errors.endTime.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Urutan</label>
            <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="w-full border rounded-lg p-2" />
            {errors.sortOrder && <p className="text-red-500 text-sm">{errors.sortOrder.message}</p>}
          </div>
          <div className="flex items-center">
            <input type="checkbox" {...register('isActive')} className="rounded border-input text-primary focus:ring-ring" />
            <label className="ml-2 block text-sm text-foreground">Aktif</label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-foreground border border-input rounded-lg">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white primary primary/90 rounded-lg disabled:opacity-50">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}