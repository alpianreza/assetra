import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api-helper';
import { queryClient } from '@/app/queryClient';
import { useAuth } from '../../auth/useAuth';

export function OrganizationPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('settings.organization.manage');

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => apiRequest<any>('/settings/organization'),
  });

  const [form, setForm] = useState({
    name: '',
    shortName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    reportFooter: '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest<any>('/settings/organization', { method: 'PATCH', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization'] }),
  });

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat...</p>;

  const org = orgData?.data;

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      alert('Organisasi berhasil diperbarui');
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan');
    }
  };

  const initialOrg = org ?? { name: '', shortName: '', address: '', phone: '', email: '', website: '', reportFooter: '' };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-6">Organisasi / Perusahaan</h2>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">Nama Perusahaan</label>
          <input name="name" value={form.name || initialOrg.name} onChange={handleChange} disabled={!canManage} className="w-full border rounded-lg p-2 mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Nama Singkat</label>
          <input name="shortName" value={form.shortName || initialOrg.shortName} onChange={handleChange} disabled={!canManage} className="w-full border rounded-lg p-2 mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Alamat</label>
          <textarea name="address" value={form.address || initialOrg.address} onChange={handleChange} disabled={!canManage} rows={3} className="w-full border rounded-lg p-2 mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Telepon</label>
            <input name="phone" value={form.phone || initialOrg.phone} onChange={handleChange} disabled={!canManage} className="w-full border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Email</label>
            <input name="email" value={form.email || initialOrg.email} onChange={handleChange} disabled={!canManage} className="w-full border rounded-lg p-2 mt-1" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Website</label>
          <input name="website" value={form.website || initialOrg.website} onChange={handleChange} disabled={!canManage} className="w-full border rounded-lg p-2 mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Footer Laporan</label>
          <textarea name="reportFooter" value={form.reportFooter || initialOrg.reportFooter} onChange={handleChange} disabled={!canManage} rows={2} className="w-full border rounded-lg p-2 mt-1" />
        </div>

        {canManage && (
          <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 primary text-white rounded-lg">
            {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        )}
      </form>
    </div>
  );
}