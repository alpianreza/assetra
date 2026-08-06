import { useState } from 'react';
import { useSessions, useDeleteSession } from '../hooks';
import { useAuth } from '../../auth/useAuth';
import { SessionForm } from './SessionForm';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function SessionsPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useSessions();
  const deleteSession = useDeleteSession();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const sessions = data?.data ?? [];
  const canManage = hasPermission('checklist_session.manage');

  const handleDelete = async (s: any) => {
    if (!confirm(`Hapus sesi ${s.name}?`)) return;
    try {
      await deleteSession.mutateAsync(s.id);
    } catch (e: any) {
      alert(e?.message || 'Gagal menghapus');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Sesi Checklist</h2>
        {canManage && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Sesi
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Memuat sesi...</p>
      ) : sessions.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Tidak ada sesi.</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Urutan</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.code}</TableCell>
                  <TableCell className="text-muted-foreground">{s.startTime} - {s.endTime}</TableCell>
                  <TableCell className="text-muted-foreground">{s.sortOrder}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}