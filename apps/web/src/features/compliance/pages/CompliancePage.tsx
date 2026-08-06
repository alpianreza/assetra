import { useNavigate } from 'react-router-dom';
import { useComplianceOverview } from '../hooks';

export function CompliancePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useComplianceOverview();

  const inventories = data?.data ?? [];

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat compliance...</p>;

  if (inventories.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">Belum ada inventaris yang memiliki template checklist terpasang.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Compliance Overview</h2>
        <p className="text-sm text-muted-foreground">Daftar inventaris yang memiliki checklist.</p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">No. Inventaris</th>
              <th className="px-4 py-3 font-medium">Jenis Item</th>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventories.map((inv: any) => (
              <tr key={inv.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{inv.assetCode}</td>
                <td className="px-4 py-3 text-muted-foreground">{inv.itemTypeName ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{inv.areaName ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {inv.templates.map((t: any) => t.name).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/compliance/inventory/${inv.id}`)} className="text-primary hover:underline">
                    Lihat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {inventories.map((inv: any) => (
          <div key={inv.id} className="bg-card rounded-xl shadow-sm border border-border p-4">
            <p className="font-semibold text-foreground">{inv.assetCode}</p>
            <p className="text-sm text-muted-foreground">{inv.itemTypeName ?? '—'} · {inv.areaName ?? '—'}</p>
            <p className="text-sm text-muted-foreground mt-1">{inv.templates.map((t: any) => t.name).join(', ') || '—'}</p>
            <button onClick={() => navigate(`/compliance/inventory/${inv.id}`)} className="text-primary text-sm mt-2 hover:underline">
              Lihat Detail
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
