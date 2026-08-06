import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks';
import { MasterDataForm } from '../components/MasterDataForm';
import { useAuth } from '../../auth/useAuth';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function CategoriesPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const categories = data?.data ?? [];
  const canManage = hasPermission('master.category.manage');

  const handleDelete = async (cat: any) => {
    if (window.confirm(`Hapus kategori ${cat.name}?`)) {
      try {
        await deleteCategory.mutateAsync(cat.id);
      } catch (e: any) {
        alert(e?.message || 'Gagal menghapus kategori');
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Kategori Inventaris</h2>
        {canManage && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
              </DialogHeader>
              <MasterDataForm
                title=""
                fields={[
                  { name: 'name', label: 'Nama Kategori', type: 'text', required: true },
                  { name: 'code', label: 'Kode', type: 'text', required: true },
                ]}
                initialValues={editing ?? { name: '', code: '' }}
                onSubmit={editing
                  ? (data) => {
                      const d = data as { name: string; code: string };
                      updateCategory.mutate({ id: editing.id, data: d }, { onSuccess: () => setFormOpen(false) });
                    }
                  : (data) => {
                      const d = data as { name: string; code: string };
                      createCategory.mutate(d, { onSuccess: () => setFormOpen(false) });
                    }}
                onClose={() => setFormOpen(false)}
                loading={updateCategory.isPending || createCategory.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Memuat kategori...</p>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Tidak ada kategori.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Total Item</TableHead>
              {canManage && <TableHead>Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat: any) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                <TableCell className="text-muted-foreground">{cat.code}</TableCell>
                <TableCell className="text-muted-foreground">{cat.itemTypeCount + cat.inventoryCount}</TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(cat); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(cat)}><Trash2 className="h-4 w-4" /></Button>
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
