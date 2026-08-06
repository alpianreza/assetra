import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTemplate, useCreateTemplate, useUpdateTemplate, useUpdateTemplateQuestions } from '../hooks';
import { useItemTypes } from '../../master-data/hooks';

const questionSchema = z.object({
  questionText: z.string().min(1, 'Pertanyaan wajib diisi'),
  answerType: z.string().default('radio'),
  isRequired: z.boolean().default(true),
  requirePhoto: z.boolean().default(false),
});

const templateSchema = z.object({
  name: z.string().min(1, 'Nama checklist wajib diisi'),
  description: z.string().optional(),
  itemTypeId: z.number().min(1, 'Jenis Item wajib dipilih'),
  questions: z.array(questionSchema).min(1, 'Minimal satu pertanyaan'),
});

const emptyQuestion = { questionText: '', answerType: 'radio', isRequired: true, requirePhoto: false };

export function TemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: itemTypesData } = useItemTypes();
  const itemTypes = itemTypesData?.data ?? [];

  const { data: templateData, isLoading } = useTemplate(isEdit ? Number(id) : undefined);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      itemTypeId: 0,
      questions: [{ ...emptyQuestion }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const updateQuestions = useUpdateTemplateQuestions();

  // Load the existing template when editing. Without this the form submitted an
  // empty question list and wiped every question on the template.
  useEffect(() => {
    if (!isEdit || !templateData?.data) return;
    const template = templateData.data;
    const questions = (template.questions ?? []).map((q: any) => ({
      questionText: q.questionText ?? '',
      answerType: q.answerType ?? 'radio',
      isRequired: q.isRequired ?? true,
      requirePhoto: q.requirePhoto ?? false,
    }));

    reset({
      name: template.name ?? '',
      description: template.description ?? '',
      itemTypeId: template.itemTypeId ?? 0,
      questions: questions.length > 0 ? questions : [{ ...emptyQuestion }],
    });
  }, [templateData, isEdit, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit) {
        await updateTemplate.mutateAsync({
          id: Number(id),
          data: { name: data.name, description: data.description },
        });
        await updateQuestions.mutateAsync({ id: Number(id), questions: data.questions });
      } else {
        await createTemplate.mutateAsync(data);
      }
      toast.success('Checklist master disimpan');
      navigate('/checklist/templates');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan');
    }
  };

  if (isEdit && isLoading) return <p className="text-center py-8 text-muted-foreground">Memuat...</p>;

  const itemTypeName = templateData?.data?.itemType?.name;

  return (
    <div className="max-w-3xl mx-auto bg-card p-6 rounded-xl shadow-sm border border-border">
      <h2 className="text-xl font-bold mb-1">
        {isEdit ? 'Kelola Checklist Master' : 'Tambah Checklist Master'}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Pertanyaan berlaku untuk seluruh inventaris dengan jenis item yang sama.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground">Nama Checklist</label>
          <input
            {...register('name')}
            placeholder="Contoh: Checklist APAR"
            className="w-full border rounded-lg p-2 mt-1"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Jenis Item</label>
          {isEdit ? (
            <input
              type="text"
              readOnly
              value={itemTypeName ?? '\u2014'}
              className="w-full border rounded-lg p-2 mt-1 bg-muted/50 text-muted-foreground"
            />
          ) : (
            <select {...register('itemTypeId', { valueAsNumber: true })} className="w-full border rounded-lg p-2 mt-1">
              <option value="0">Pilih Jenis Item...</option>
              {itemTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {errors.itemTypeId && <p className="text-red-500 text-sm mt-1">{errors.itemTypeId.message as string}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Frekuensi checklist mengikuti pengaturan jenis item, bukan diatur di sini.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Keterangan</label>
          <textarea {...register('description')} rows={2} className="w-full border rounded-lg p-2 mt-1" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Pertanyaan</label>
            <button
              type="button"
              onClick={() => append({ ...emptyQuestion })}
              className="text-sm text-primary hover:underline"
            >
              + Tambah Pertanyaan
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground mt-2 w-6 shrink-0">{index + 1}.</span>
                  <input
                    {...register(`questions.${index}.questionText`)}
                    placeholder="Contoh: Apakah segel APAR masih utuh?"
                    className="border rounded-lg p-2 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="px-2 py-2 text-sm text-red-600 disabled:text-muted-foreground disabled:cursor-not-allowed"
                  >
                    Hapus
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 pl-8">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" {...register(`questions.${index}.isRequired`)} />
                    Wajib dijawab
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" {...register(`questions.${index}.requirePhoto`)} />
                    Wajib foto
                  </label>
                </div>
                {(errors.questions as any)?.[index]?.questionText && (
                  <p className="text-red-500 text-sm pl-8">
                    {(errors.questions as any)[index].questionText.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          {typeof errors.questions?.message === 'string' && (
            <p className="text-red-500 text-sm mt-1">{errors.questions.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/checklist/templates')}
            className="px-4 py-2 border border-input rounded-lg"
          >
            Batal
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 primary text-white rounded-lg">
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
