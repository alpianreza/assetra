import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FolderKanban } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useCategories, useItemTypes } from '../hooks';
import { useGroupedTemplates } from '../../checklist-templates/hooks';

const FREQUENCY_LABELS: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };

export function MasterDataPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canViewCategories = hasPermission('master.category.view');
  const canViewItems = hasPermission('master.item_type.view');
  const canViewQuestions = hasPermission('checklist_template.view');
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories(canViewCategories);
  const { data: itemTypesData } = useItemTypes(canViewItems);
  const { data: groupedData } = useGroupedTemplates(canViewQuestions);
  const categories = categoriesData?.data ?? [];
  const itemTypes = itemTypesData?.data ?? [];
  const templateGroups = groupedData?.data?.groups ?? [];
  const templateByItemType = new Map(templateGroups.map((group: any) => [group.itemTypeId, group]));

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Master Data</h2><p className="text-sm text-muted-foreground mt-1">Kategori → jenis item → pertanyaan checklist.</p></div><div className="flex flex-wrap gap-2">{canViewCategories && <button onClick={() => navigate('/master/categories')} className="px-3 py-2 border rounded-lg text-sm">Kelola Kategori</button>}{canViewItems && <button onClick={() => navigate('/master/item-types')} className="px-3 py-2 border rounded-lg text-sm">Kelola Jenis Item</button>}{hasPermission('master.area.view') && <button onClick={() => navigate('/master/areas')} className="px-3 py-2 border rounded-lg text-sm">Kelola Area</button>}{canViewQuestions && <button onClick={() => navigate('/checklist/templates')} className="px-3 py-2 primary text-white rounded-lg text-sm">Checklist Master</button>}</div></div>

    {!canViewCategories ? <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground">Berikan permission “Lihat Kategori” untuk membuka struktur kategori dan item.</div> : categoriesLoading ? <p className="py-8 text-center text-muted-foreground">Memuat kategori...</p> : categories.length === 0 ? <p className="py-8 text-center text-muted-foreground">Belum ada kategori.</p> : <div className="space-y-4">{categories.map((category: any) => {
      const expanded = expandedCategory === category.id;
      const categoryItems = itemTypes.filter((item: any) => item.categoryId === category.id);
      return <section key={category.id} className="bg-card border rounded-xl overflow-hidden"><button onClick={() => setExpandedCategory(expanded ? null : category.id)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40"><div className="flex items-center gap-3"><FolderKanban className="h-5 w-5 text-primary" /><div><p className="font-semibold">{category.name}</p><p className="text-xs text-muted-foreground">Kode {category.code} · {category.itemTypeCount} jenis item · {category.inventoryCount} inventaris</p></div></div>{expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button>{expanded && <div className="border-t divide-y">{!canViewItems ? <p className="p-5 text-sm text-muted-foreground">Tidak memiliki permission untuk melihat jenis item.</p> : categoryItems.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Belum ada jenis item dalam kategori ini.</p> : categoryItems.map((item: any) => {
        const group: any = templateByItemType.get(item.id);
        const questions = (group?.templates ?? []).flatMap((template: any) => template.questions ?? []);
        return <div key={item.id} className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.code})</span></p><p className="text-xs text-muted-foreground mt-1">{FREQUENCY_LABELS[item.checklistFrequency] ?? item.checklistFrequency} · {item.inventoryCount} inventaris · {questions.length} pertanyaan</p></div>{canViewQuestions && group?.templates?.[0] && <button onClick={() => navigate(`/checklist/templates/${group.templates[0].id}/edit`)} className="text-sm text-primary hover:underline">Kelola Pertanyaan</button>}</div>{canViewQuestions ? questions.length > 0 ? <ol className="mt-3 space-y-1 list-decimal list-inside text-sm text-muted-foreground">{questions.map((question: any) => <li key={question.id}>{question.questionText}{question.requirePhoto && <span className="ml-2 text-xs text-amber-600">wajib foto</span>}</li>)}</ol> : <p className="mt-3 text-sm text-amber-600">Belum ada pertanyaan checklist.</p> : <p className="mt-3 text-sm text-muted-foreground">Pertanyaan disembunyikan karena permission Checklist Master belum diberikan.</p>}</div>;
      })}</div>}</section>;
    })}</div>}
  </div>;
}
