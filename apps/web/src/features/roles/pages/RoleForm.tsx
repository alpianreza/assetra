import { useState } from 'react';
import { useCreateRole, useUpdateRole } from '../hooks';
import { Button, Input, Label, Checkbox } from '@/components/ui';

interface RoleFormProps { role: any; groups: any[]; onClose: () => void; onSaved: () => void; }

export function RoleForm({ role, groups, onClose, onSaved }: RoleFormProps) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const [name, setName] = useState(role?.name ?? '');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const togglePerm = (permission: string) => setSelectedPerms(previous => previous.includes(permission) ? previous.filter(item => item !== permission) : [...previous, permission]);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (!name.trim()) return setError('Nama role wajib diisi');
    setSaving(true);
    try {
      const allPermissions = groups.flatMap((group: any) => group.permissions);
      const permissionIds = allPermissions.filter((permission: any) => selectedPerms.includes(permission.name)).map((permission: any) => permission.id);
      const payload = { name: name.trim(), permissionIds };
      if (role) await updateRole.mutateAsync({ id: role.id, data: payload }); else await createRole.mutateAsync(payload);
      onSaved();
    } catch (caught: any) { setError(caught?.message || 'Terjadi kesalahan saat menyimpan'); } finally { setSaving(false); }
  };

  return <form onSubmit={handleSubmit} className="space-y-4"><div><Label>Nama Role</Label><Input value={name} onChange={event => setName(event.target.value)} disabled={role?.system} /></div><div><Label className="mb-2 block">Hak Akses</Label><div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">{groups.map((group: any) => <div key={group.key} className="border rounded-lg p-3 bg-muted/20"><p className="text-sm font-semibold mb-2">{groupLabel(group.key)}</p><div className="grid gap-2 sm:grid-cols-2">{group.permissions.map((permission: any) => <label key={permission.id} className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={selectedPerms.includes(permission.name)} onCheckedChange={() => togglePerm(permission.name)} />{permissionLabel(permission.name)}</label>)}</div></div>)}</div></div>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div></form>;
}

function groupLabel(key: string): string {
  const labels: Record<string, string> = { users: 'Pengguna', roles: 'Role & Permission', area: 'Master Area', category: 'Kategori', itemType: 'Jenis Item', inventory: 'Inventaris', checklistTemplate: 'Checklist Master', checklistSession: 'Sesi Checklist', compliance: 'Akses Checklist Inventaris', qr: 'QR Center', organization: 'Organisasi', reports: 'Laporan', dashboard: 'Dashboard', workingDay: 'Hari Kerja', holiday: 'Hari Libur' };
  return labels[key] ?? key;
}

function permissionLabel(name: string): string {
  const labels: Record<string, string> = {
    'users.view': 'Lihat Pengguna', 'users.create': 'Tambah Pengguna', 'users.update': 'Ubah Pengguna', 'users.delete': 'Hapus Pengguna', 'roles.view': 'Lihat Role', 'roles.manage': 'Kelola Role',
    'master.area.view': 'Lihat Area', 'master.area.manage': 'Kelola Area', 'master.category.view': 'Lihat Kategori', 'master.category.manage': 'Kelola Kategori', 'master.item_type.view': 'Lihat Jenis Item', 'master.item_type.manage': 'Kelola Jenis Item',
    'inventory.view': 'Lihat Inventaris', 'inventory.create': 'Tambah Inventaris', 'inventory.update': 'Ubah Inventaris', 'inventory.delete': 'Hapus Inventaris',
    'checklist_template.view': 'Lihat Checklist Master', 'checklist_template.create': 'Tambah Checklist Master', 'checklist_template.update': 'Ubah Pertanyaan', 'checklist_template.delete': 'Hapus Checklist Master',
    'checklist_session.view': 'Lihat Sesi', 'checklist_session.manage': 'Kelola Sesi',
    'compliance.view': 'Lihat Hasil & Grid Checklist', 'compliance.execute': 'Tombol Checklist / Isi Checklist', 'compliance.manage': 'Kelola Compliance',
    'qr.view': 'Lihat QR', 'qr.print': 'Cetak QR', 'settings.organization.view': 'Lihat Organisasi', 'settings.organization.manage': 'Kelola Organisasi', 'reports.view': 'Lihat Laporan', 'reports.export': 'Export Laporan', 'dashboard.view': 'Lihat Dashboard', 'settings.working_day.manage': 'Atur Hari Kerja (termasuk Sabtu)', 'settings.holiday.manage': 'Kelola Hari Libur & Pengecualian',
  };
  return labels[name] ?? name;
}
