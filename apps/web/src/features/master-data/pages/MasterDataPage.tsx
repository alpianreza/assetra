import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FolderKanban } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useCategories, useItemTypes } from '../hooks';
import { useGroupedTemplates } from '../../checklist-templates/hooks';
import { cn } from '@/lib/utils';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
};

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Struktur data</p>
        <h2 className="mt-1 text-xl font-bold">Master Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Kategori → jenis item → pertanyaan checklist.</p>
      </div>

      {!canViewCategories ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Berikan permission “Lihat Kategori” untuk membuka struktur kategori dan item.
        </div>
      ) : categoriesLoading ? (
        <p className="py-8 text-center text-muted-foreground">Memuat kategori...</p>
      ) : categories.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Belum ada kategori.</p>
      ) : (
        <div className="space-y-4">
          {categories.map((category: any) => {
            const expanded = expandedCategory === category.id;
            const categoryItems = itemTypes.filter((item: any) => item.categoryId === category.id);

            return (
              <section
                key={category.id}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-card transition-all duration-300',
                  expanded ? 'border-primary/30 shadow-lg shadow-primary/5' : 'hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md',
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedCategory(expanded ? null : category.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-300 hover:bg-muted/40"
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300', expanded ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Kode {category.code} · {category.itemTypeCount} jenis item · {category.inventoryCount} inventaris
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn('h-5 w-5 shrink-0 transition-transform duration-300', expanded && 'rotate-90 text-primary')} />
                </button>

                <div className={cn('grid transition-[grid-template-rows] duration-500 ease-in-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <div className={cn('divide-y border-t transition-all duration-500', expanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}>
                      {!canViewItems ? (
                        <p className="p-5 text-sm text-muted-foreground">Tidak memiliki permission untuk melihat jenis item.</p>
                      ) : categoryItems.length === 0 ? (
                        <p className="p-5 text-sm text-muted-foreground">Belum ada jenis item dalam kategori ini.</p>
                      ) : (
                        categoryItems.map((item: any) => {
                          const group: any = templateByItemType.get(item.id);
                          const questions = (group?.templates ?? []).flatMap((template: any) => template.questions ?? []);

                          return (
                            <div key={item.id} className="p-5 transition-colors hover:bg-muted/20">
                              <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                  <p className="font-medium">
                                    {item.name} <span className="text-xs text-muted-foreground">({item.code})</span>
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {FREQUENCY_LABELS[item.checklistFrequency] ?? item.checklistFrequency} · {item.inventoryCount} inventaris · {questions.length} pertanyaan
                                  </p>
                                </div>
                                {canViewQuestions && group?.templates?.[0] && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/checklist/templates/${group.templates[0].id}/edit`)}
                                    className="text-sm font-medium text-primary transition-colors hover:text-primary/75"
                                  >
                                    Kelola Pertanyaan
                                  </button>
                                )}
                              </div>

                              {canViewQuestions ? (
                                questions.length > 0 ? (
                                  <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                                    {questions.map((question: any) => (
                                      <li key={question.id}>
                                        {question.questionText}
                                        {question.requirePhoto && <span className="ml-2 text-xs text-amber-600">wajib foto</span>}
                                      </li>
                                    ))}
                                  </ol>
                                ) : (
                                  <p className="mt-3 text-sm text-amber-600">Belum ada pertanyaan checklist.</p>
                                )
                              ) : (
                                <p className="mt-3 text-sm text-muted-foreground">Pertanyaan disembunyikan karena permission Checklist Master belum diberikan.</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
