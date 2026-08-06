import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTemplate, useCreateTemplate, useUpdateTemplateQuestions } from '../hooks';
import { useItemTypes } from '../../master-data/hooks';

const questionSchema = z.object({
  questionText: z.string().min(1, 'Pertanyaan wajib diisi'),
  answerType: z.string().default('radio'),
  isRequired: z.boolean().default(true),
  requirePhoto: z.boolean().default(false),
});

// One Checklist Master belongs to one Jenis Item. There is no user-facing
// checklist name: users manage the questions directly under the item type.
const formSchema = z.object({
  itemTypeId: z.number().min(1, 'Jenis Item wajib dipilih'),
  questions: z.array(questionSchema).min(1, 'Minimal satu pertanyaan'),
});

const emptyQuestion = {
  questionText: '',
  answerType: 'radio',
  isRequired: true,
  requirePhoto: false,
};

export function TemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const templateId = isEdit ? Number(id) : undefined;

  const { data: itemTypesData } = useItemTypes();
  const itemTypes = itemTypesData?.data ?? [];
  const { data: templateData, isLoading } = useTemplate(templateId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemTypeId: 0,
      questions: [{ ...emptyQuestion }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  const createTemplate = useCreateTemplate();
  const updateQuestions = useUpdateTemplateQuestions();

  useEffect(() => {
    if (!isEdit || !templateData?.data) return;
    const template = templateData.data;
    const questions = (template.questions ?? []).map((question: any) => ({
      questionText: question.questionText ?? '',
      answerType: question.answerType ?? 'radio',
      isRequired: question.isRequired ?? true,
      requirePhoto: question.requirePhoto ?? false,
    }));

    reset({
      itemTypeId: template.itemTypeId ?? 0,
      questions: questions.length > 0 ? questions : [{ ...emptyQuestion }],
    });
  }, [templateData, isEdit, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit) {
        await updateQuestions.mutateAsync({
          id: Number(id),
          questions: data.questions,
        });
      } else {
        const itemType = itemTypes.find((item: any) => item.id === Number(data.itemTypeId));
        if (!itemType) throw new Error('Jenis Item tidak ditemukan');

        // `name` remains an internal required database field, but it is derived
        // automatically and never shown as a separate checklist name.
        await createTemplate.mutateAsync({
          itemTypeId: Number(data.itemTypeId),
          name: itemType.name,
          questions: data.questions,
        });
      }
      toast.success('Pertanyaan berhasil disimpan');
      navigate('/checklist/templates');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan pertanyaan');
    }
  };

  if (isEdit && isLoading) {
    return <p className="text-center py-8 text-muted-foreground">Memuat pertanyaan...</p>;
  }

  const itemTypeName = templateData?.data?.itemType?.name;

  return (
    <div className="max-w-3xl mx-auto bg-card p-6 rounded-xl shadow-sm border border-border">
      <h2 className="text-xl font-bold mb-1">
        {isEdit ? 'Kelola Pertanyaan' : 'Tambah Pertanyaan'}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Pertanyaan berlaku untuk seluruh inventaris dengan Jenis Item yang sama.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground">Jenis Item</label>
          {isEdit ? (
            <input
              type="text"
              readOnly
              value={itemTypeName ?? '—'}
              className="w-full border rounded-lg p-2 mt-1 bg-muted/50 text-muted-foreground"
            />
          ) : (
            <select
              {...register('itemTypeId', { valueAsNumber: true })}
              className="w-full border rounded-lg p-2 mt-1"
            >
              <option value="0">Pilih Jenis Item...</option>
              {itemTypes.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          )}
          {errors.itemTypeId && (
            <p className="text-red-500 text-sm mt-1">{errors.itemTypeId.message as string}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Frekuensi mengikuti pengaturan Jenis Item.
          </p>
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
                    placeholder="Tulis pertanyaan pemeriksaan..."
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 primary text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pertanyaan'}
          </button>
        </div>
      </form>
    </div>
  );
}
