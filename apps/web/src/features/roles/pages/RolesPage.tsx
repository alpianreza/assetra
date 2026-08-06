import { useState } from 'react';
import { useRoles, usePermissions, useDeleteRole } from '../hooks';
import { RoleForm } from './RoleForm';
import { useAuth } from '../../auth/useAuth';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';

export function RolesPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useRoles();
  const { data: permData } = usePermissions();
  const deleteRole = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);

  const roles = data?.data ?? [];
  const groups = permData?.data?.grouped ?? [];

  const openCreate = () => { setEditingRole(null); setFormOpen(true); };
  const openEdit = (r: any) => { setEditingRole(r); setFormOpen(true); };

  const handleDelete = async (r: any) => {
    if (r.system) { alert('Role Super Admin tidak dapat dihapus'); return; }
    if (window.confirm(`Hapus role ${r.name}?`)) {
      try {
        await deleteRole.mutateAsync(r.id);
      } catch (e: any) {
        alert(e?.message || 'Gagal menghapus role');
      }
    }
  };

  const canManage = hasPermission('roles.manage');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Role &amp; Permission</h2>
        {canManage && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRole ? 'Edit Role' : 'Tambah Role'}</DialogTitle>
              </DialogHeader>
              <RoleForm
                role={editingRole}
                groups={groups}
                onClose={() => setFormOpen(false)}
                onSaved={() => setFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Memuat role...</p>
      ) : roles.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Tidak ada role.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> {r.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{r.userCount} pengguna</p>
                </div>
                {r.system && <Badge variant="secondary">System</Badge>}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions?.length ? (
                    r.permissions.map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Tanpa permission</span>
                  )}
                </div>
                {canManage && !r.system && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 mr-1" /> Hapus</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
