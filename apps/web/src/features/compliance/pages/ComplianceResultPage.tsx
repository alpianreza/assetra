import { useNavigate, useParams } from 'react-router-dom';
import { useComplianceResult } from '../hooks';
import { useAuth } from '../../auth/useAuth';

const ANSWER_LABELS: Record<string, string> = { ok: 'OK / Sesuai', not_ok: 'Tidak OK / Tidak Sesuai', na: 'N/A' };
const ANSWER_COLORS: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-700',
  not_ok: 'bg-red-500/15 text-red-700',
  na: 'bg-muted text-muted-foreground',
};

export function ComplianceResultPage() {
  const navigate = useNavigate();
  const { id, occurrenceId } = useParams();
  const inventoryId = Number(id);
  const resultId = Number(occurrenceId);
  const { hasPermission } = useAuth();
  const canView = hasPermission('compliance.view');
  const { data, isLoading, isError, error } = useComplianceResult(canView ? inventoryId : undefined, canView ? resultId : undefined);

  if (!canView) return <p className="text-red-500 py-8 text-center">Kamu tidak memiliki akses untuk melihat hasil checklist.</p>;
  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat hasil checklist...</p>;
  if (isError || !data?.data) return <p className="text-red-500 py-8 text-center">{(error as any)?.message || 'Hasil checklist tidak ditemukan.'}</p>;

  const result = data.data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Hasil Checklist · Read-only</p>
          <h2 className="text-xl font-bold mt-1">{result.template.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{result.inventory.assetCode} · {result.period.label}{result.session ? ` · ${result.session.name}` : ''}</p>
        </div>
        <button onClick={() => navigate(`/inventory/${inventoryId}`)} className="text-sm text-muted-foreground hover:underline">← Detail Inventaris</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{result.summary.total}</p></div>
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">OK</p><p className="text-xl font-bold text-emerald-600">{result.summary.ok}</p></div>
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Tidak OK</p><p className="text-xl font-bold text-red-600">{result.summary.notOk}</p></div>
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">N/A</p><p className="text-xl font-bold">{result.summary.na}</p></div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 text-sm">
        <p><span className="text-muted-foreground">Diperiksa oleh:</span> {result.checkedBy?.name ?? '—'}</p>
        <p className="mt-1"><span className="text-muted-foreground">Tanggal:</span> {new Date(result.checkedAt).toLocaleString('id-ID')}</p>
      </div>

      <div className="space-y-3">
        {result.answers.map((answer: any, index: number) => (
          <div key={answer.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-medium">{index + 1}. {answer.questionText}</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ANSWER_COLORS[answer.status] ?? 'bg-muted'}`}>{ANSWER_LABELS[answer.status] ?? answer.status}</span>
            </div>
            {answer.remark && <p className="text-sm mt-3"><span className="text-muted-foreground">Catatan:</span> {answer.remark}</p>}
            {answer.photo && <p className="text-sm mt-2 text-muted-foreground">Foto bukti tersedia.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
