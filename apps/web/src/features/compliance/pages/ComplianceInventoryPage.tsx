import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompliancePeriods, useComplianceHistory } from '../hooks';
import { useAuth } from '../../auth/useAuth';

const STATUS_LABELS: Record<string, string> = {
  done: 'Selesai', pending: 'Pending', late: 'Terlambat', future: 'Belum Tersedia', offday: 'Hari Libur',
};
const STATUS_COLORS: Record<string, string> = {
  done: 'bg-emerald-500/15 text-emerald-600', pending: 'bg-blue-100 text-blue-800', late: 'bg-red-500/15 text-red-600', future: 'bg-muted text-muted-foreground', offday: 'bg-yellow-100 text-yellow-800',
};

export function ComplianceInventoryPage() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const id = Number(inventoryId);
  const { hasPermission } = useAuth();
  const canView = hasPermission('compliance.view');
  const canExecute = hasPermission('compliance.execute');
  const { data: periodsData, isLoading } = useCompliancePeriods(canView ? id : undefined);
  const { data: historyData } = useComplianceHistory(canView ? id : undefined);
  const [statusFilter, setStatusFilter] = useState('');

  if (!canView) return <p className="text-red-500 py-8 text-center">Kamu tidak memiliki akses ke Grid Checklist.</p>;

  const periods = periodsData?.data?.periods ?? [];
  const history = historyData?.data?.logs ?? [];
  const filteredPeriods = statusFilter ? periods.filter((period: any) => period.status === statusFilter) : periods;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Grid Checklist</h2><p className="text-sm text-muted-foreground">Periode dan status checklist inventaris.</p></div>
        <button onClick={() => navigate(`/inventory/${id}`)} className="text-sm text-muted-foreground hover:underline">← Detail Inventaris</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'done', 'pending', 'late', 'future', 'offday'].map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1 rounded-full text-sm border ${statusFilter === status ? 'primary text-white border-blue-600' : 'bg-card border-input'}`}>
            {status === '' ? 'Semua' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {isLoading ? <p className="py-8 text-center text-muted-foreground">Memuat periode...</p> : filteredPeriods.length === 0 ? <p className="py-8 text-center text-muted-foreground">Tidak ada periode checklist.</p> : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-4 py-3">Periode</th><th className="px-4 py-3">Template</th><th className="px-4 py-3">Sesi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Aksi</th></tr></thead>
            <tbody className="divide-y divide-border">
              {filteredPeriods.map((period: any, index: number) => (
                <tr key={`${period.templateId}-${period.periodKey}-${period.sessionId ?? 'none'}-${index}`}>
                  <td className="px-4 py-3 font-medium">{period.periodLabel}</td><td className="px-4 py-3">{period.templateName}</td><td className="px-4 py-3">{period.sessionName ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[period.status] ?? 'bg-muted'}`}>{STATUS_LABELS[period.status] ?? period.status}</span></td>
                  <td className="px-4 py-3">{period.answeredCount}/{period.questionCount}</td>
                  <td className="px-4 py-3">{canExecute && ['pending', 'late', 'done'].includes(period.status) && !period.offday && <button onClick={() => navigate(`/compliance/inventory/${id}/execution?templateId=${period.templateId}&periodKey=${period.periodKey}&sessionId=${period.sessionId ?? ''}`)} className="text-primary hover:underline">{period.status === 'done' ? 'Recheck' : 'Isi Checklist'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.length > 0 && <div className="bg-card rounded-xl border overflow-hidden"><div className="px-4 py-3 bg-muted/50 font-semibold">Riwayat Checklist</div><div className="divide-y divide-border">{history.map((result: any) => <div key={result.id} className="flex flex-wrap justify-between gap-3 px-4 py-3 text-sm"><span>{result.templateName} · {result.periodLabel}</span><button onClick={() => navigate(`/inventory/${id}/checklist-results/${result.id}`)} className="text-primary hover:underline">Lihat Hasil</button></div>)}</div></div>}
    </div>
  );
}
