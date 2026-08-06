import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock3, Lock, CalendarX2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useComplianceChecklist, useCompliancePeriods, useSubmitComplianceChecklist } from '../hooks';
import { ChecklistAnswerInput } from '../api';
import { useAuth } from '../../auth/useAuth';

type AnswerValue = { status: string; remark: string; photo?: File };
type AnswerState = Record<number, AnswerValue>;

const STATUS_LABELS: Record<string, string> = {
  done: 'Selesai', late: 'Terlambat', pending: 'Pending', future: 'Belum tersedia', offday: 'Hari libur',
};

export function ComplianceExecutionPage() {
  const { inventoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canExecute = hasPermission('compliance.execute');
  const id = Number(inventoryId);
  const templateId = Number(searchParams.get('templateId'));
  const requestedPeriodKey = searchParams.get('periodKey') ?? '';
  const requestedSessionId = searchParams.get('sessionId') ? Number(searchParams.get('sessionId')) : null;
  const initialYm = requestedPeriodKey.slice(0, 7).match(/^\d{4}-\d{2}$/)?.[0];
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ym = searchParams.get('ym') ?? initialYm ?? currentYm;

  const periodsQuery = useCompliancePeriods(canExecute ? id : undefined, ym);
  const allPeriods = periodsQuery.data?.data?.periods ?? [];
  const templatePeriods = allPeriods.filter((period: any) => period.templateId === templateId);

  const sessions = useMemo(() => {
    const map = new Map<number, string>();
    for (const period of templatePeriods) {
      if (period.sessionId != null) map.set(period.sessionId, period.sessionName ?? `Sesi ${period.sessionId}`);
    }
    return Array.from(map, ([sessionId, sessionName]) => ({ sessionId, sessionName }));
  }, [templatePeriods]);

  const effectiveSessionId = requestedSessionId ?? sessions[0]?.sessionId ?? null;
  const calendarPeriods = templatePeriods
    .filter((period: any) => (period.sessionId ?? null) === effectiveSessionId)
    .sort((a: any, b: any) => a.periodKey.localeCompare(b.periodKey));
  const defaultPeriod = [...calendarPeriods].reverse().find((period: any) => period.editable && ['pending', 'late'].includes(period.status));
  const activePeriodKey = requestedPeriodKey || defaultPeriod?.periodKey || '';
  const activePeriod = calendarPeriods.find((period: any) => period.periodKey === activePeriodKey);
  const canFillActivePeriod = Boolean(activePeriod?.editable && ['pending', 'late'].includes(activePeriod.status));

  const checklistQuery = useComplianceChecklist(
    canExecute && canFillActivePeriod ? id : undefined,
    canExecute && canFillActivePeriod ? templateId : undefined,
    canExecute && canFillActivePeriod ? activePeriodKey : undefined,
    effectiveSessionId,
  );
  const checklist = checklistQuery.data?.data;
  const submitMutation = useSubmitComplianceChecklist(id, templateId, activePeriodKey, effectiveSessionId);
  const [answers, setAnswers] = useState<AnswerState>({});

  useEffect(() => {
    setAnswers({});
  }, [activePeriodKey, effectiveSessionId]);

  useEffect(() => {
    if (!checklist?.questions) return;
    const initial: AnswerState = {};
    for (const question of checklist.questions) {
      initial[question.id] = {
        status: question.existingAnswer ?? '',
        remark: question.existingRemark ?? '',
      };
    }
    setAnswers(initial);
  }, [checklist]);

  if (!canExecute) return <p className="text-red-500 py-8 text-center">Kamu tidak memiliki akses untuk mengisi checklist.</p>;
  if (!Number.isFinite(templateId) || templateId < 1) return <p className="text-red-500 py-8 text-center">Jenis checklist tidak valid.</p>;

  const frequency = templatePeriods[0]?.frequency ?? checklist?.template?.frequency ?? 'monthly';
  const frequencyLabel: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };
  const summary = calendarPeriods.reduce((result: Record<string, number>, period: any) => {
    result[period.status] = (result[period.status] ?? 0) + 1;
    return result;
  }, {});

  const updateSearch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    next.set('templateId', String(templateId));
    next.set('ym', ym);
    for (const [key, value] of Object.entries(changes)) {
      if (value == null) next.delete(key); else next.set(key, value);
    }
    setSearchParams(next);
  };

  const changeMonth = (offset: number) => {
    const [year, month] = ym.split('-').map(Number);
    const target = new Date(year, month - 1 + offset, 1);
    const targetYm = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
    const next = new URLSearchParams(searchParams);
    next.set('templateId', String(templateId));
    next.set('ym', targetYm);
    next.delete('periodKey');
    setSearchParams(next);
  };

  const selectPeriod = (period: any) => {
    if (!period.editable || !['pending', 'late'].includes(period.status)) return;
    updateSearch({ periodKey: period.periodKey, sessionId: effectiveSessionId != null ? String(effectiveSessionId) : null });
  };

  const selectSession = (sessionId: number) => {
    updateSearch({ sessionId: String(sessionId), periodKey: null });
  };

  const setStatus = (question: any, status: string) => {
    setAnswers(previous => {
      const current = previous[question.id] ?? { status: '', remark: '' };
      return {
        ...previous,
        [question.id]: {
          ...current,
          status,
          remark: status === 'not_ok' ? current.remark : '',
          photo: status === 'not_ok' || question.requirePhoto ? current.photo : undefined,
        },
      };
    });
  };

  const setRemark = (questionId: number, remark: string) => {
    setAnswers(previous => ({
      ...previous,
      [questionId]: { ...(previous[questionId] ?? { status: '', remark: '' }), remark },
    }));
  };

  const setPhoto = async (questionId: number, file?: File) => {
    if (!file) {
      setAnswers(previous => ({ ...previous, [questionId]: { ...(previous[questionId] ?? { status: '', remark: '' }), photo: undefined } }));
      return;
    }
    try {
      const processed = await compressAndWatermarkPhoto(file, user?.name ?? 'User');
      setAnswers(previous => ({ ...previous, [questionId]: { ...(previous[questionId] ?? { status: '', remark: '' }), photo: processed } }));
    } catch {
      toast.error('Gagal memproses foto');
    }
  };

  const markAllOk = () => {
    if (!checklist?.questions) return;
    const next: AnswerState = {};
    for (const question of checklist.questions) {
      next[question.id] = { status: 'ok', remark: '', photo: question.requirePhoto ? answers[question.id]?.photo : undefined };
    }
    setAnswers(next);
    toast.success('Semua pertanyaan ditandai Sesuai');
  };

  const answeredCount = checklist?.questions?.filter((question: any) => answers[question.id]?.status).length ?? 0;
  const totalQuestions = checklist?.questions?.length ?? 0;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSubmit = async () => {
    if (!checklist?.questions?.length) return;
    const payload: ChecklistAnswerInput[] = [];
    for (const question of checklist.questions) {
      const answer = answers[question.id];
      if (!answer?.status) {
        toast.warning('Semua pertanyaan wajib diisi');
        document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (answer.status === 'not_ok' && !answer.remark.trim() && !answer.photo) {
        toast.warning('Jawaban Tidak Sesuai wajib memiliki catatan atau foto');
        document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (question.requirePhoto && !answer.photo) {
        toast.warning(`Foto wajib untuk pertanyaan nomor ${question.sortOrder + 1}`);
        document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      payload.push({ questionId: question.id, status: answer.status, remark: answer.remark, photo: answer.photo });
    }

    try {
      await submitMutation.mutateAsync(payload);
      toast.success('Checklist berhasil disimpan');
      navigate(`/inventory/${id}`);
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan checklist');
    }
  };

  return (
    <div className="space-y-5">
      <section className="bg-card border rounded-xl p-5 flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Checklist Compliance</p>
          <h2 className="text-xl font-bold mt-1">{checklist?.inventory?.itemTypeName ?? 'Pelaksanaan Checklist'}</h2>
          <p className="text-sm text-muted-foreground mt-1">No. Inventaris: <strong>{checklist?.inventory?.assetCode ?? `#${id}`}</strong></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">Frekuensi: {frequencyLabel[frequency] ?? frequency}</span>
          <button onClick={() => navigate(`/inventory/${id}`)} className="text-sm text-muted-foreground hover:underline">Detail Inventaris</button>
        </div>
      </section>

      <section className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold">Periode Aktif ({frequencyLabel[frequency] ?? frequency})</h3><p className="text-xs text-muted-foreground mt-1">Pilih tanggal atau periode untuk mengisi checklist.</p></div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 border rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
            <p className="font-semibold">{monthLabel(ym)}</p>
            <button onClick={() => changeMonth(1)} className="p-2 border rounded-lg"><ChevronRight className="h-4 w-4" /></button>
          </div>

          {sessions.length > 0 && <div><p className="text-xs text-muted-foreground mb-2">Pilih Sesi</p><div className="flex flex-wrap gap-2">{sessions.map(session => <button key={session.sessionId} onClick={() => selectSession(session.sessionId)} className={`px-3 py-1.5 rounded-lg border text-sm ${effectiveSessionId === session.sessionId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>{session.sessionName}</button>)}</div></div>}

          {periodsQuery.isLoading ? <p className="py-6 text-center text-muted-foreground">Memuat kalender...</p> : calendarPeriods.length === 0 ? <p className="py-6 text-center text-muted-foreground">Tidak ada periode untuk bulan ini.</p> : <div className={`grid ${frequency === 'daily' ? 'grid-cols-7 gap-1 sm:gap-2' : 'grid-cols-2 md:grid-cols-4 gap-2'}`}>{calendarPeriods.map((period: any) => <button key={period.periodKey} type="button" disabled={!period.editable || !['pending', 'late'].includes(period.status)} onClick={() => selectPeriod(period)} className={`min-h-12 rounded-lg border px-0.5 sm:px-2 py-2 text-[10px] sm:text-xs font-medium flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition ${periodClass(period, period.periodKey === activePeriodKey)}`} title={STATUS_LABELS[period.status] ?? period.status}>{periodIcon(period)}<span>{periodButtonLabel(period, frequency)}</span></button>)}</div>}

          <div className="flex flex-wrap gap-2 text-xs"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">Selesai: {summary.done ?? 0}</span><span className="px-2 py-1 rounded bg-red-100 text-red-800">Terlambat: {summary.late ?? 0}</span><span className="px-2 py-1 rounded bg-amber-100 text-amber-800">Pending: {summary.pending ?? 0}</span>{frequency === 'daily' && <span className="px-2 py-1 rounded border border-red-200 text-red-700">Libur: {summary.offday ?? 0}</span>}</div>
        </div>
      </section>

      <section className="bg-card border rounded-xl p-5">
        {!activePeriod ? <EmptyState text="Silakan pilih periode checklist." /> : !canFillActivePeriod ? <LockedState status={activePeriod.status} /> : checklistQuery.isLoading ? <p className="py-8 text-center text-muted-foreground">Memuat pertanyaan...</p> : checklistQuery.isError || !checklist ? <p className="py-8 text-center text-red-500">Gagal memuat pertanyaan checklist.</p> : <>
          <div className="mb-4"><h3 className="font-bold">{checklist.inventory.itemTypeName} <span className="font-normal text-muted-foreground">– {checklist.inventory.assetCode}</span></h3><p className="text-sm text-muted-foreground mt-1">Periode aktif: <strong>{checklist.period.label}</strong>{checklist.session ? ` · ${checklist.session.name}` : ''}</p></div>
          <div className="bg-muted/40 rounded-lg p-3 mb-4"><div className="flex justify-between text-sm mb-2"><span className="font-medium">Progress Isian</span><span>{answeredCount}/{totalQuestions}</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs text-muted-foreground mt-2">{answeredCount === totalQuestions ? 'Semua pertanyaan sudah diisi. Siap disimpan.' : 'Pilih status untuk setiap pertanyaan.'}</p></div>
          <div className="flex flex-wrap justify-between gap-2 mb-4"><p className="text-xs text-muted-foreground">Item Tidak Sesuai wajib memiliki catatan atau foto.</p><button type="button" onClick={markAllOk} className="px-3 py-1.5 border border-emerald-500 text-emerald-700 rounded-lg text-sm">Tandai Semua Sesuai</button></div>
          <div className="space-y-3">{checklist.questions.map((question: any, index: number) => {
            const answer = answers[question.id] ?? { status: '', remark: '' };
            const showDetail = answer.status === 'not_ok' || question.requirePhoto;
            const options = checklist.allowNA ? ['ok', 'not_ok', 'na'] : ['ok', 'not_ok'];
            return <div id={`question-${question.id}`} key={question.id} className={`border rounded-xl p-4 ${!answer.status ? 'border-border' : answer.status === 'not_ok' ? 'border-red-300' : 'border-border'}`}><div className="flex gap-3"><span className="text-sm text-muted-foreground">{index + 1}.</span><div className="flex-1"><p className="font-medium">{question.questionText}{question.requirePhoto && <span className="ml-2 text-xs text-amber-600">Wajib foto</span>}</p><div className="flex flex-wrap gap-2 mt-3">{options.map(status => <button key={status} type="button" onClick={() => setStatus(question, status)} className={`px-3 py-1.5 rounded-lg border text-sm ${answer.status === status ? status === 'ok' ? 'bg-emerald-600 text-white border-emerald-600' : status === 'not_ok' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-600 text-white border-gray-600' : 'bg-card'}`}>{status === 'ok' ? 'Sesuai' : status === 'not_ok' ? 'Tidak Sesuai' : 'N/A'}</button>)}</div>{showDetail && <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200"><p className="text-xs font-semibold text-amber-800 mb-2">{answer.status === 'not_ok' ? 'TIDAK SESUAI – isi catatan atau unggah foto' : 'Foto wajib untuk pertanyaan ini'}</p>{answer.status === 'not_ok' && <textarea value={answer.remark} onChange={event => setRemark(question.id, event.target.value)} rows={2} placeholder="Catatan pemeriksaan" className="w-full border rounded-lg p-2 text-sm mb-2" />}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => setPhoto(question.id, event.target.files?.[0])} className="w-full border rounded-lg p-2 text-sm bg-white" />{answer.photo && <p className="text-xs text-emerald-700 mt-2">Foto siap: {answer.photo.name}</p>}</div>}</div></div></div>;
          })}</div>
          <div className="flex justify-end mt-5"><button onClick={handleSubmit} disabled={submitMutation.isPending || answeredCount !== totalQuestions} className="px-5 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">{submitMutation.isPending ? 'Menyimpan...' : 'Simpan Checklist'}</button></div>
        </>}
      </section>
    </div>
  );
}

function periodClass(period: any, active: boolean): string {
  if (active) return 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30';
  if (period.status === 'done') return 'bg-emerald-100 text-emerald-800 border-emerald-200 cursor-not-allowed';
  if (period.status === 'late') return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
  if (period.status === 'pending') return 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200';
  if (period.status === 'offday') return 'bg-red-50 text-red-500 border-red-100 cursor-not-allowed';
  return 'bg-muted/50 text-muted-foreground cursor-not-allowed';
}

function periodIcon(period: any) {
  if (period.status === 'done') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (period.status === 'late') return <AlertCircle className="h-3.5 w-3.5" />;
  if (period.status === 'pending') return <Clock3 className="h-3.5 w-3.5" />;
  if (period.status === 'offday') return <CalendarX2 className="h-3.5 w-3.5" />;
  return <Lock className="h-3.5 w-3.5" />;
}

function periodButtonLabel(period: any, frequency: string): string {
  if (period.status === 'offday') return 'Libur';
  if (frequency === 'daily') return String(new Date(`${period.periodKey}T00:00:00`).getDate()).padStart(2, '0');
  return period.periodLabel;
}

function monthLabel(ym: string): string {
  return new Date(`${ym}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-8 text-center text-muted-foreground">{text}</div>;
}

function LockedState({ status }: { status: string }) {
  const messages: Record<string, string> = {
    done: 'Checklist untuk periode ini sudah diisi.',
    future: 'Checklist untuk periode ini belum dapat diisi.',
    offday: 'Periode ini adalah hari libur. Checklist tidak dapat diisi.',
    late: 'Periode ini sudah melewati batas pengisian.',
  };
  return <div className="py-8 text-center"><Lock className="h-7 w-7 mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">{messages[status] ?? 'Periode ini tidak dapat diisi.'}</p></div>;
}

async function compressAndWatermarkPhoto(file: File, userName: string): Promise<File> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  });

  const maxWidth = 1280;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas tidak tersedia');
  context.drawImage(image, 0, 0, width, height);

  const boxWidth = Math.min(320, width);
  const boxHeight = Math.min(62, height);
  const boxX = Math.max(0, width - boxWidth);
  const boxY = Math.max(0, height - boxHeight);
  context.fillStyle = 'rgba(0,0,0,0.5)';
  context.fillRect(boxX, boxY, boxWidth, boxHeight);
  context.fillStyle = '#fff';
  context.font = `${Math.max(13, Math.round(width * 0.018))}px Arial`;
  const stamp = new Date().toLocaleString('id-ID');
  context.fillText(stamp, boxX + 12, boxY + 25);
  context.fillText(userName, boxX + 12, boxY + 49);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Gagal kompres foto')), 'image/jpeg', 0.7);
  });
  return new File([blob], `checklist-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
