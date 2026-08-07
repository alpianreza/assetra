import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, ImagePlus, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../../../lib/api-helper';
import { queryClient } from '@/app/queryClient';
import { useAuth } from '../../auth/useAuth';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface OrganizationForm { name: string; shortName: string; address: string; phone: string; email: string; website: string; reportFooter: string }
const emptyForm: OrganizationForm = { name: '', shortName: '', address: '', phone: '', email: '', website: '', reportFooter: '' };

export function OrganizationPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('settings.organization.manage');
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<OrganizationForm>(emptyForm);
  const [logoVersion, setLogoVersion] = useState(Date.now());
  const { data: orgData, isLoading } = useQuery({ queryKey: ['organization'], queryFn: () => apiRequest<any>('/settings/organization') });
  const org = orgData?.data;

  useEffect(() => {
    if (!org) return;
    setForm({ name: org.name ?? '', shortName: org.shortName ?? '', address: org.address ?? '', phone: org.phone ?? '', email: org.email ?? '', website: org.website ?? '', reportFooter: org.reportFooter ?? '' });
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: (data: OrganizationForm) => apiRequest<any>('/settings/organization', { method: 'PATCH', body: data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organization'] }); toast.success('Data perusahaan berhasil disimpan'); },
    onError: (error: Error) => toast.error(error.message || 'Gagal menyimpan data perusahaan'),
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => { const body = new FormData(); body.append('file', file); return apiRequest<any>('/settings/organization/logo', { method: 'POST', body }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organization'] }); setLogoVersion(Date.now()); toast.success('Logo perusahaan berhasil diperbarui'); },
    onError: (error: Error) => toast.error(error.message || 'Gagal mengunggah logo'),
  });

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Memuat pengaturan perusahaan...</p>;

  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Branding & laporan</p><h1 className="mt-2 flex items-center gap-2 text-2xl font-bold"><Building2 className="h-6 w-6" />Organisasi / Perusahaan</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Nama dan logo perusahaan digunakan pada header template print, laporan PDF, serta identitas Assetra.</p></section>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit"><CardHeader><CardTitle className="text-base">Logo perusahaan</CardTitle></CardHeader><CardContent><div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/30 p-6">{org?.logoPath ? <img key={logoVersion} src={`/api/v1/settings/organization/logo?v=${logoVersion}`} alt="Logo perusahaan" className="max-h-full max-w-full object-contain" /> : <div className="text-center text-muted-foreground"><ImagePlus className="mx-auto h-12 w-12 opacity-50" /><p className="mt-3 text-sm">Logo belum diatur</p></div>}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">Gunakan PNG atau JPEG, maksimal 2 MB. PNG transparan direkomendasikan untuk hasil print terbaik.</p>{canManage && <><input ref={fileInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) logoMutation.mutate(file); event.target.value = ''; }} /><Button variant="outline" className="mt-4 w-full" disabled={logoMutation.isPending} onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" />{logoMutation.isPending ? 'Mengunggah...' : org?.logoPath ? 'Ganti logo' : 'Unggah logo'}</Button></>}</CardContent></Card>
      <form onSubmit={event => { event.preventDefault(); updateMutation.mutate(form); }}><Card><CardHeader><CardTitle className="text-base">Informasi perusahaan</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nama Perusahaan" name="name" value={form.name} required disabled={!canManage} onChange={value => setForm(previous => ({ ...previous, name: value }))} /><Field label="Nama Singkat" name="shortName" value={form.shortName} disabled={!canManage} onChange={value => setForm(previous => ({ ...previous, shortName: value }))} /></div><div><label className="text-sm font-medium">Alamat</label><textarea value={form.address} disabled={!canManage} rows={3} onChange={event => setForm(previous => ({ ...previous, address: event.target.value }))} className="mt-1.5 w-full rounded-lg border p-3" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Telepon" name="phone" value={form.phone} disabled={!canManage} onChange={value => setForm(previous => ({ ...previous, phone: value }))} /><Field label="Email" name="email" value={form.email} disabled={!canManage} onChange={value => setForm(previous => ({ ...previous, email: value }))} /></div><Field label="Website" name="website" value={form.website} disabled={!canManage} onChange={value => setForm(previous => ({ ...previous, website: value }))} /><div><label className="text-sm font-medium">Footer Laporan</label><textarea value={form.reportFooter} disabled={!canManage} rows={2} onChange={event => setForm(previous => ({ ...previous, reportFooter: event.target.value }))} placeholder="Contoh: Dokumen terkendali - PT Contoh Indonesia" className="mt-1.5 w-full rounded-lg border p-3" /></div>{canManage && <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={updateMutation.isPending}><Save className="mr-2 h-4 w-4" />{updateMutation.isPending ? 'Menyimpan...' : 'Simpan pengaturan'}</Button></div>}</CardContent></Card></form>
    </div>
  </div>;
}

function Field({ label, name, value, onChange, disabled, required }: { label: string; name: string; value: string; onChange: (value: string) => void; disabled?: boolean; required?: boolean }) {
  return <div><label htmlFor={name} className="text-sm font-medium">{label}</label><input id={name} name={name} value={value} required={required} disabled={disabled} onChange={event => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2" /></div>;
}
