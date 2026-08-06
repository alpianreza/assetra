import { useNavigate } from 'react-router-dom';
import { useComplianceOverview } from '../hooks';
import { useAuth } from '../../auth/useAuth';

export function CompliancePage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canExecute = hasPermission('compliance.execute');
  const { data, isLoading } = useComplianceOverview();
  const inventories = data?.data ?? [];

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat compliance...</p>;
  if (inventories.length === 0) return <p className="text-muted-foreground py-8 text-center">Belum ada inventaris yang memiliki template checklist terpasang.</p>;

  return <div><div className="mb-6"><h2 className="text-xl font-bold">Pelaksanaan Checklist</h2><p className="text-sm text-muted-foreground">Pilih inventaris, atau scan QR untuk membuka detail secara langsung.</p></div><div className="bg-card rounded-xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-4 py-3">No. Inventaris</th><th className="px-4 py-3">Jenis Item</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Template</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-border">{inventories.map((inventory: any) => <tr key={inventory.id}><td className="px-4 py-3 font-medium">{inventory.assetCode}</td><td className="px-4 py-3">{inventory.itemTypeName ?? '—'}</td><td className="px-4 py-3">{inventory.areaName ?? '—'}</td><td className="px-4 py-3">{inventory.templates.map((template: any) => template.name).join(', ') || '—'}</td><td className="px-4 py-3"><button onClick={() => navigate(`/inventory/${inventory.id}`)} className="text-primary hover:underline">{canExecute ? 'Buka Checklist' : 'Lihat Hasil'}</button></td></tr>)}</tbody></table></div></div>;
}
