import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useComplianceChecklist, useSubmitComplianceChecklist } from '../hooks';

const STATUS_OPTIONS = [
  { value: 'ok', label: 'OK / Sesuai' },
  { value: 'not_ok', label: 'Tidak OK / Tidak Sesuai' },
  { value: 'na', label: 'N/A / Tidak Berlaku' },
];

export function ComplianceExecutionPage() {
  const { inventoryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const templateId = Number(searchParams.get('templateId'));
  const periodKey = searchParams.get('periodKey') ?? '';
  const sessionId = searchParams.get('sessionId') ? Number(searchParams.get('sessionId')) : null;

  const id = Number(inventoryId);

  const { data, isLoading, isError } = useComplianceChecklist(id, templateId, periodKey, sessionId);
  const submitMutation = useSubmitComplianceChecklist(id, templateId, periodKey, sessionId);

  const [answers, setAnswers] = useState<Record<number, string>>({});

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat checklist...</p>;
  if (isError || !data) return <p className="text-red-500 py-8 text-center">Gagal memuat checklist.</p>;

  const checklist = data.data;

  const setAnswer = (questionId: number, status: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: status }));
  };

  const handleSubmit = async () => {
    const payload = Object.entries(answers).map(([questionId, status]) => ({
      questionId: Number(questionId),
      status,
    }));
    if (payload.length === 0) {
      alert('Pilih jawaban minimal satu pertanyaan');
      return;
    }
    try {
      await submitMutation.mutateAsync(payload);
      alert('Checklist berhasil disimpan');
      navigate(`/compliance/inventory/${inventoryId}`);
    } catch (e: any) {
      alert(e?.message || 'Gagal menyimpan checklist');
    }
  };

  const allAnswered = checklist.questions.length > 0 && checklist.questions.every((q: any) => answers[q.id] || q.existingAnswer);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Isi Checklist</h2>
          <p className="text-sm text-muted-foreground">
            {checklist.inventory.assetCode} · {checklist.template.name} · {checklist.period.label}
            {checklist.session ? ` · ${checklist.session.name}` : ''}
          </p>
        </div>
        <button onClick={() => navigate(`/compliance/inventory/${inventoryId}`)} className="text-sm text-muted-foreground hover:underline">← Kembali</button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <h3 className="font-semibold mb-4">Pertanyaan Checklist</h3>

        <div className="space-y-4">
          {checklist.questions.map((q: any) => {
            const selected = answers[q.id] ?? q.existingAnswer ?? '';
            const allowedOptions = checklist.allowNA
              ? STATUS_OPTIONS
              : STATUS_OPTIONS.filter((o) => o.value !== 'na');
            return (
              <div key={q.id} className="border border-border rounded-lg p-4">
                <p className="font-medium text-foreground mb-2">
                  {q.sortOrder + 1}. {q.questionText}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allowedOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer(q.id, opt.value)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        selected === opt.value
                          ? opt.value === 'ok'
                            ? 'bg-green-600 text-white border-green-600'
                            : opt.value === 'not_ok'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-gray-600 text-white border-gray-600'
                          : 'bg-card text-foreground border-input hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {!checklist.allowNA && (
                  <p className="text-xs text-muted-foreground mt-1">N/A tidak diizinkan untuk jenis item ini</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !allAnswered}
            className="px-6 py-2 text-sm text-white primary primary/90 rounded-lg disabled:opacity-50"
          >
            {submitMutation.isPending ? 'Menyimpan...' : 'Simpan Checklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
