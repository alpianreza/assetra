import { useState } from 'react';
import { useUsers, useDeleteUser, useUpdateUserStatus } from '../hooks';
import { useRoles } from '../../roles/hooks';
import { UserForm } from './UserForm';
import { useAuth } from '../../auth/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { Plus, Pencil } from 'lucide-react';

export function UsersPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUsers({ search, status: statusFilter, roleId: roleFilter, page });
  const { data: rolesData } = useRoles();
  const deleteUser = useDeleteUser();
  const updateStatus = useUpdateUserStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const users = data?.data?.items ?? [];
  const meta = data?.data?.meta ?? { page: 1, totalPages: 1, total: 0 };
  const roles = rolesData?.data ?? [];

  const openCreate = () => { setEditingUser(null); setFormOpen(true); };
  const openEdit = (u: any) => { setEditingUser(u); setFormOpen(true); };

  const handleDelete = async (u: any) => {
    if (window.confirm(`Hapus pengguna ${u.name}?`)) {
      try {
        await deleteUser.mutateAsync(u.id);
      } catch (e: any) {
        alert(e?.message || 'Gagal menghapus pengguna');
      }
    }
  };

  const handleToggleStatus = async (u: any) => {
    const next = u.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus.mutateAsync({ id: u.id, status: next });
    } catch (e: any) {
      alert(e?.message || 'Gagal mengubah status');
    }
  };

  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Pengguna</h2>
        {canCreate && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
              </DialogHeader>
              <UserForm
                user={editingUser}
                roles={roles}
                onClose={() => setFormOpen(false)}
                onSaved={() => setFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <Input
          type="text"
          placeholder="Cari nama, username, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(roleFilter ?? '')} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Semua Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Role</SelectItem>
            {roles.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Memuat pengguna...</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Tidak ada pengguna.</p>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.roles?.map((r: any) => r.name).join(', ') || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>
                      {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canUpdate && (<Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /> Edit</Button>)}
                      {canUpdate && (
                        <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => handleToggleStatus(u)}>
                          {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(u)}>Hapus</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Total: {meta.total} pengguna</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <span className="px-3 py-1">Hal {page} / {meta.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
