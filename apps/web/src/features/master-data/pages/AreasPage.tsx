import { useState } from 'react';
import { toast } from 'sonner';
import { useAreas, useCreateArea, useUpdateArea, useDeleteArea } from '../hooks';
import { MasterDataForm } from '../components/MasterDataForm';
import { useAuth } from '../../auth/useAuth';
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui';
import { EmptyState, TableSkeleton } from '@/components/shared/states';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function AreasPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useAreas();
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  const [editing, setEditing] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const areas = data?.data ?? [];
  const canManage = hasPermission('master.area.manage');

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteArea.mutateAsync(deleting.id);
      toast.success('Area dihapus');
      setDeleteOpen(false);
      setDeleting(null);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus area');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Area</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kelola area lokasi inventaris.</p>
        </div>
        {canManage && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Area
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Area' : 'Tambah Area'}</DialogTitle>
              </DialogHeader>
              <MasterDataForm
                title=""
                fields={[
                  { name: 'name', label: 'Nama Area', type: 'text', required: true },
                  { name: 'locationDetail', label: 'Detail Lokasi', type: 'text', required: false },
                ]}
                initialValues={editing ?? { name: '', locationDetail: '' }}
                onSubmit={editing
                  ? (data) => {
                      const d = data as { name: string; locationDetail?: string };
                      updateArea.mutate({ id: editing.id, data: d }, {
                        onSuccess: () => { setFormOpen(false); toast.success('Area diperbarui'); },
                        onError: (e: any) => toast.error(e?.message || 'Gagal memperbarui area'),
                      });
                    }
                  : (data) => {
                      const d = data as { name: string; locationDetail?: string };
                      createArea.mutate(d, {
                        onSuccess: () => { setFormOpen(false); toast.success('Area dibuat'); },
                        onError: (e: any) => toast.error(e?.message || 'Gagal membuat area'),
                      });
                    }}
                onClose={() => setFormOpen(false)}
                loading={updateArea.isPending || createArea.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : areas.length === 0 ? (
          <EmptyState title="Belum ada area" description="Tambahkan area pertama Anda." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Detail Lokasi</TableHead>
                <TableHead>Inventaris</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.locationDetail || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{a.inventoryCount}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(a); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" aria-label="Hapus" onClick={() => { setDeleting(a); setDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus area {deleting?.name}?</AlertDialogTitle>
                              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}