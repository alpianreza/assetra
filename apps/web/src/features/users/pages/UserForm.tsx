import { useState } from 'react';
import { useCreateUser, useUpdateUser } from '../hooks';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface UserFormProps {
  user: any; // existing user when editing, null when creating
  roles: any[];
  onClose: () => void;
  onSaved: () => void;
}

export function UserForm({ user, roles, onClose, onSaved }: UserFormProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(user?.status ?? 'active');
  const [roleIds, setRoleIds] = useState<number[]>(user?.roles?.map((r: any) => r.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleRole = (id: number) => {
    setRoleIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Nama wajib diisi'); return; }
    if (!username.trim()) { setError('Username wajib diisi'); return; }
    if (!user && !password) { setError('Password wajib diisi saat membuat pengguna'); return; }

    setSaving(true);
    try {
      const payload: any = { name: name.trim(), username: username.trim(), email: email.trim() || undefined, roleIds, status };
      if (password) payload.password = password;

      if (user) {
        await updateUser.mutateAsync({ id: user.id, data: payload });
      } else {
        await createUser.mutateAsync(payload);
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
        <Label>Nama</Label>
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <Label>Username</Label>
        <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      <div>
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <Label>Password {user ? '(kosongkan jika tidak diubah)' : ''}</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div>
        <Label className="mb-2">Role (bisa lebih dari satu)</Label>
        <div className="flex flex-wrap gap-2">
          {roles.map((r: any) => (
            <Button
              type="button"
              key={r.id}
              variant={roleIds.includes(r.id) ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => toggleRole(r.id)}
            >
              {r.name}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  );
}
