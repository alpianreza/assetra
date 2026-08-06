import { useState } from 'react';
import { useItemTypes, useCreateItemType, useUpdateItemType, useDeleteItemType, useCategories } from '../hooks';
import { MasterDataForm } from '../components/MasterDataForm';
import { useAuth } from '../../auth/useAuth';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Badge } from '@/components/ui';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function ItemTypesPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useItemTypes();
  const { data: categoriesData } = useCategories();
  const createItemType = useCreateItemType();
  const updateItemType = useUpdateItemType();
  const deleteItemType = useDeleteItemType();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const itemTypes = data?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const canManage = hasPermission('master.item_type.manage');

  const handleDelete = async (item: any) => {
    if (window.confirm(`Hapus Tipe Item ${item.name}?`)) {
      try {
        await deleteItemType.mutateAsync(item.id);
      } catch (e: any) {
        alert(e?.message || 'Gagal menghapus tipe item');
      }
    }
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Jenis Item</h2>
        {canManage && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Jenis Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Jenis Item' : 'Tambah Jenis Item'}</DialogTitle>
              </DialogHeader>
              <MasterDataForm
                title=""
                fields={[
                  { name: 'name', label: 'Nama Item', type: 'text', required: true },
                  { name: 'code', label: 'Kode', type: 'text', required: true },
                  { name: 'categoryId', label: 'Kategori', type: 'select', options: categories.map((c: any) => ({ value: c.id, label: c.name })), required: true },
                  { name: 'checklistFrequency', label: 'Frekuensi Pengecekan', type: 'select', options: frequencyOptions, required: true },
                  { name: 'allowNA', label: 'Izinkan status N/A', type: 'select', options: [{ value: 'true', label: 'Ya' }, { value: 'false', label: 'Tidak' }], required: true },
                  { name: 'active', label: 'Aktif', type: 'select', options: [{ value: 'true', label: 'Ya' }, { value: 'false', label: 'Tidak' }], required: true },
                ]}
                initialValues={editing ? { ...editing, categoryId: editing.categoryId.toString(), active: editing.active.toString(), allowNA: editing.allowNA?.toString() ?? 'false' } : { name: '', code: '', categoryId: '', checklistFrequency: '', allowNA: 'false', active: 'true' }}
                onSubmit={editing
                  ? (data) => {
                      const payload = { ...data, categoryId: parseInt(data.categoryId), active: data.active === 'true', allowNA: data.allowNA === 'true' }
                      updateItemType.mutate({ id: editing.id, data: payload }, { onSuccess: () => setFormOpen(false) });
                    }
                  : (data) => {
                      const payload = { ...data, categoryId: parseInt(data.categoryId), active: data.active === 'true', allowNA: data.allowNA === 'true' }
                      createItemType.mutate(payload, { onSuccess: () => setFormOpen(false) });
                    }}
                onClose={() => setFormOpen(false)}
                loading={createItemType.isPending || updateItemType.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Memuat jenis item...</p>
      ) : itemTypes.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Tidak ada jenis item.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Frekuensi Cek</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead>Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemTypes.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.code}</TableCell>
                <TableCell className="text-muted-foreground">{item.categoryName}</TableCell>
                <TableCell className="text-muted-foreground">{item.checklistFrequency}</TableCell>
                <TableCell>
                  <Badge variant={item.active ? 'default' : 'destructive'}>
                    {item.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
