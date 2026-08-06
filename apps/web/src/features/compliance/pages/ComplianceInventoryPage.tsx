import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompliancePeriods, useComplianceHistory } from '../hooks';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Selesai',
  pending: 'Pending',
  late: 'Terlambat',
  future: 'Belum Tersedia',
  offday: 'Hari Libur',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-600',
  pending: 'bg-blue-100 text-blue-800',
  late: 'bg-red-500/15 text-red-600',
  future: 'bg-muted text-muted-foreground',
  offday: 'bg-yellow-100 text-yellow-800',
};

export function ComplianceInventoryPage() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const id = Number(inventoryId);

  const { data: periodsData, isLoading } = useCompliancePeriods(id);
  const { data: historyData } = useComplianceHistory(id);

  const [statusFilter, setStatusFilter] = useState('');

  const periods = periodsData?.data?.periods ?? [];
  const history = historyData?.data?.logs ?? [];

  const filteredPeriods = statusFilter ? periods.filter((p: any) => p.status === statusFilter) : periods;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Compliance Inventaris #{inventoryId}</h2>
          <p className="text-sm text-muted-foreground">Periode & status checklist.</p>
        </div>
        <button onClick={() => navigate('/compliance')} className="text-sm text-muted-foreground hover:underline">← Kembali</button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'completed', 'pending', 'late', 'future', 'offday'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm border ${statusFilter === s ? 'primary text-white border-blue-600' : 'bg-card text-foreground border-input'}`}
          >
            {s === '' ? 'Semua' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Periods table (desktop) */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Memuat periode...</p>
      ) : filteredPeriods.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Tidak ada periode checklist.</p>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Periode</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Sesi</th>
                <th className="px-4 py-3 font-medium">Frekuensi</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPeriods.map((p: any, idx: number) => (
                <tr key={`${p.templateId}-${p.periodKey}-${p.sessionId ?? 'none'}-${idx}`} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{p.periodLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.templateName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sessionName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{frequencyLabel(p.frequency)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.answeredCount}/{p.questionCount}</td>
                  <td className="px-4 py-3">
                    {['pending', 'late', 'incomplete', 'completed'].includes(p.status) && (
                      <button
                        onClick={() => navigate(`/compliance/inventory/${inventoryId}/execution?templateId=${p.templateId}&periodKey=${p.periodKey}&sessionId=${p.sessionId ?? ''}`)}
                        className="text-primary hover:underline"
                      >
                        {p.status === 'completed' ? 'Recheck' : 'Isi Checklist'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History section */}
      {history.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 font-semibold text-foreground">Riwayat Checklist</div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {history.map((h: any) => (
                <tr key={h.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">{h.templateName}</td>
                  <td className="px-4 py-3">{h.periodLabel}</td>
                  <td className="px-4 py-3">{h.sessionName ?? '—'}</td>
                  <td className="px-4 py-3">{new Date(h.checkDate).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function frequencyLabel(f: string): string {
  const labels: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };
  return labels[f] ?? f;
}
