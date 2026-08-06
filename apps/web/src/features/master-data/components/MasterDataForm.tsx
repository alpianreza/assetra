import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface MasterDataFormProps {
  title: string;
  fields: { name: string; label: string; type: 'text' | 'email' | 'password' | 'select' | 'number'; required?: boolean; options?: { value: any; label: string }[] }[];
  initialValues: Record<string, any>;
  onSubmit: (data: any) => void;
  onClose: () => void;
  loading?: boolean;
}

export function MasterDataForm({ title, fields, initialValues, onSubmit, onClose, loading }: MasterDataFormProps) {
  const schema = z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.required
          ? z.string().min(1, `${f.label} wajib diisi`)
          : z.string().optional(),
      ])
    )
  );

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
      {fields.map((f) => (
        <div key={f.name}>
          <Label className="mb-1">{f.label} {f.required && <span className="text-red-500">*</span>}</Label>
          {f.type === 'select' ? (
            <Select onValueChange={(val) => setValue(f.name, val)} defaultValue={initialValues[f.name]}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih..." />
              </SelectTrigger>
              <SelectContent>
                {f.options?.map((o: any) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
              {...register(f.name)}
            />
          )}
          {errors[f.name] && <p className="mt-1 text-sm text-red-600">{String(errors[f.name]?.message ?? '')}</p>}
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  );
}
