import { useState } from 'react';
import { useCreateRole, useUpdateRole } from '../hooks';
import { Button, Input, Label, Checkbox } from '@/components/ui';

interface RoleFormProps {
  role: any;
  groups: any[];
  onClose: () => void;
  onSaved: () => void;
}

export function RoleForm({ role, groups, onClose, onSaved }: RoleFormProps) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [name, setName] = useState(role?.name ?? '');
  // track selected permission names for robust matching
  const [selectedPerms, setSelectedPerms] = useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const togglePerm = (permName: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Nama role wajib diisi'); return; }

    setSaving(true);
    try {
      // Map selected permission names back to permission IDs using groups catalog
      const allPerms = groups.flatMap((g: any) => g.permissions);
      const permissionIds = allPerms
        .filter((p: any) => selectedPerms.includes(p.name))
        .map((p: any) => p.id);

      const payload = { name: name.trim(), permissionIds };
      if (role) {
        await updateRole.mutateAsync({ id: role.id, data: payload });
      } else {
        await createRole.mutateAsync(payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nama Role</Label>
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={role?.system} />
      </div>

      <div>
        <Label className="mb-2 block">Permissions</Label>
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">Katalog permission belum tersedia.</p>
        )}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {groups.map((g: any) => (
            <div key={g.key} className="border border-border rounded-lg p-3 bg-muted/20">
              <p className="text-sm font-semibold text-foreground mb-2">{groupLabel(g.key)}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.permissions.map((p: any) => {
                  const isChecked = selectedPerms.includes(p.name);
                  return (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePerm(p.name)}
                      />
                      {permLabel(p.name)}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  );
}

function groupLabel(key: string): string {
  const labels: Record<string, string> = {
    users: 'Pengguna',
    roles: 'Role & Permission',
    area: 'Master Area',
    category: 'Kategori Inventaris',
    itemType: 'Jenis Item',
    checklistTemplate: 'Template Checklist',
    checklistSession: 'Sesi Checklist',
    compliance: 'Compliance Execution',
    qr: 'QR Center',
    organization: 'Organisasi',
    reports: 'Reports & Print Center',
    dashboard: 'Dashboard',
    workingDay: 'Hari Kerja',
    holiday: 'Hari Libur',
  };
  return labels[key] ?? key;
}

function permLabel(name: string): string {
  const labels: Record<string, string> = {
    'users.view': 'Lihat Pengguna', 'users.create': 'Tambah Pengguna', 'users.update': 'Ubah Pengguna', 'users.delete': 'Hapus Pengguna',
    'roles.view': 'Lihat Role', 'roles.manage': 'Kelola Role',
    'master.area.view': 'Lihat Area', 'master.area.manage': 'Kelola Area',
    'master.category.view': 'Lihat Kategori', 'master.category.manage': 'Kelola Kategori',
    'master.item_type.view': 'Lihat Jenis Item', 'master.item_type.manage': 'Kelola Jenis Item',
    'inventory.view': 'Lihat Inventaris', 'inventory.create': 'Tambah Inventaris', 'inventory.update': 'Ubah Inventaris', 'inventory.delete': 'Hapus Inventaris',
    'checklist_template.view': 'Lihat Template', 'checklist_template.create': 'Tambah Template', 'checklist_template.update': 'Ubah Template', 'checklist_template.delete': 'Hapus Template',
    'checklist_session.view': 'Lihat Sesi', 'checklist_session.manage': 'Kelola Sesi',
    'compliance.view': 'Lihat Compliance', 'compliance.execute': 'Eksekusi Checklist', 'compliance.manage': 'Kelola Compliance',
    'notification.view': 'Lihat Notifikasi', 'notification.manage': 'Kelola Notifikasi', 'notification.send': 'Kirim Notifikasi',
    'qr.view': 'Lihat QR', 'qr.print': 'Cetak QR',
    'settings.organization.view': 'Lihat Organisasi', 'settings.organization.manage': 'Kelola Organisasi',
    'reports.view': 'Lihat Reports', 'reports.export': 'Export Reports',
    'dashboard.view': 'Lihat Dashboard',
    'settings.working_day.manage': 'Kelola Hari Kerja',
    'settings.holiday.manage': 'Kelola Hari Libur',
  };
  return labels[name] ?? name;
}
