import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useComplianceChecklist, useSubmitComplianceChecklist } from '../hooks';
import { useAuth } from '../../auth/useAuth';

const STATUS_OPTIONS = [
  { value: 'ok', label: 'OK / Sesuai' },
  { value: 'not_ok', label: 'Tidak OK / Tidak Sesuai' },
  { value: 'na', label: 'N/A / Tidak Berlaku' },
];

export function ComplianceExecutionPage() {
  const { inventoryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canExecute = hasPermission('compliance.execute');

  const templateId = Number(searchParams.get('templateId'));
  const periodKey = searchParams.get('periodKey') ?? '';
  const sessionId = searchParams.get('sessionId') ? Number(searchParams.get('sessionId')) : null;
  const id = Number(inventoryId);

  const { data, isLoading, isError } = useComplianceChecklist(canExecute ? id : undefined, canExecute ? templateId : undefined, canExecute ? periodKey : undefined, sessionId);
  const submitMutation = useSubmitComplianceChecklist(id, templateId, periodKey, sessionId);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  if (!canExecute) return <p className="text-red-500 py-8 text-center">Kamu tidak memiliki akses untuk mengisi checklist.</p>;
  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat checklist...</p>;
  if (isError || !data) return <p className="text-red-500 py-8 text-center">Gagal memuat checklist.</p>;

  const checklist = data.data;
  const setAnswer = (questionId: number, status: string) => setAnswers(prev => ({ ...prev, [questionId]: status }));

  const handleSubmit = async () => {
    const payload = Object.entries(answers).map(([questionId, status]) => ({ questionId: Number(questionId), status }));
    if (payload.length === 0) return alert('Pilih jawaban minimal satu pertanyaan');
    try {
      await submitMutation.mutateAsync(payload);
      alert('Checklist berhasil disimpan');
      navigate(`/inventory/${inventoryId}`);
    } catch (error: any) {
      alert(error?.message || 'Gagal menyimpan checklist');
    }
  };

  const allAnswered = checklist.questions.length > 0 && checklist.questions.every((question: any) => answers[question.id] || question.existingAnswer);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Isi Checklist</h2><p className="text-sm text-muted-foreground">{checklist.inventory.assetCode} · {checklist.template.name} · {checklist.period.label}{checklist.session ? ` · ${checklist.session.name}` : ''}</p></div><button onClick={() => navigate(`/inventory/${inventoryId}`)} className="text-sm text-muted-foreground hover:underline">← Detail Inventaris</button></div>
      <div className="bg-card rounded-xl border p-6"><div className="space-y-4">{checklist.questions.map((question: any) => {
        const selected = answers[question.id] ?? question.existingAnswer ?? '';
        const allowedOptions = checklist.allowNA ? STATUS_OPTIONS : STATUS_OPTIONS.filter(option => option.value !== 'na');
        return <div key={question.id} className="border rounded-lg p-4"><p className="font-medium mb-2">{question.sortOrder + 1}. {question.questionText}</p><div className="flex flex-wrap gap-2">{allowedOptions.map(option => <button key={option.value} type="button" onClick={() => setAnswer(question.id, option.value)} className={`px-4 py-2 rounded-lg text-sm border ${selected === option.value ? option.value === 'ok' ? 'bg-green-600 text-white' : option.value === 'not_ok' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white' : 'bg-card'}`}>{option.label}</button>)}</div></div>;
      })}</div><div className="flex justify-end mt-6"><button onClick={handleSubmit} disabled={submitMutation.isPending || !allAnswered} className="px-6 py-2 text-white primary rounded-lg disabled:opacity-50">{submitMutation.isPending ? 'Menyimpan...' : 'Simpan Checklist'}</button></div></div>
    </div>
  );
}
