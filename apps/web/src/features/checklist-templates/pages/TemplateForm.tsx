import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateTemplate, useUpdateTemplateQuestions } from '../hooks';
import { useItemTypes } from '../../master-data/hooks';

const questionSchema = z.object({
  questionText: z.string().min(1, 'Pertanyaan wajib diisi'),
  answerType: z.string().default('radio'),
  isRequired: z.boolean().default(true),
});

const templateSchema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  description: z.string().optional(),
  itemTypeId: z.number().min(1, 'Jenis Item wajib dipilih'),
  questions: z.array(questionSchema),
});

export function TemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: itemTypesData } = useItemTypes();
  const itemTypes = itemTypesData?.data ?? [];

  const { register, control, handleSubmit } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      itemTypeId: 0,
      questions: [{ questionText: '', answerType: 'radio', isRequired: true }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  const createTemplate = useCreateTemplate();
  const updateQuestions = useUpdateTemplateQuestions();

  const onSubmit = async (data: any) => {
    try {
      if (isEdit) {
        await updateQuestions.mutateAsync({ id: Number(id), questions: data.questions });
      } else {
        await createTemplate.mutateAsync(data);
      }
      navigate('/checklist/templates');
    } catch (e: any) {
      alert(e?.message || 'Gagal menyimpan');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input {...register('name')} placeholder="Nama Template" className="border p-2 w-full" />
      <select {...register('itemTypeId', { valueAsNumber: true })} className="border p-2 w-full">
        <option value="0">Pilih Jenis Item...</option>
        {itemTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input {...register(`questions.${index}.questionText`)} placeholder="Pertanyaan" className="border p-2 flex-1" />
            <button type="button" onClick={() => remove(index)} className="text-red-500">Hapus</button>
          </div>
        ))}
        <button type="button" onClick={() => append({ questionText: '', answerType: 'radio', isRequired: true })} className="text-primary">+ Tambah Pertanyaan</button>
      </div>

      <button type="submit" className="primary text-white px-4 py-2">Simpan</button>
    </form>
  );
}
