import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useGroupedTemplates, useProvisionTemplates, useDeleteTemplate } from '../hooks';
import { useAuth } from '../../auth/useAuth';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
};

function FrequencyBadge({ frequency }: { frequency: string | null }) {
  const label = frequency ? FREQUENCY_LABELS[frequency] ?? frequency : 'Belum diatur';
  const tone =
    frequency === 'daily'
      ? 'bg-sky-500/15 text-sky-600'
      : frequency === 'weekly'
        ? 'bg-violet-500/15 text-violet-600'
        : frequency === 'monthly'
          ? 'bg-amber-500/15 text-amber-600'
          : 'bg-muted text-muted-foreground';

  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>{label}</span>;
}

export function ChecklistMasterPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, error } = useGroupedTemplates();
  const provision = useProvisionTemplates();
  const deleteTemplate = useDeleteTemplate();

  const canCreate = hasPermission('checklist_template.create');
  const canUpdate = hasPermission('checklist_template.update');
  const canDelete = hasPermission('checklist_template.delete');

  const groups = data?.data?.groups ?? [];
  const missingCount = data?.data?.missingCount ?? 0;

  const handleProvision = async () => {
    try {
      const result = await provision.mutateAsync();
      const created = result?.data?.createdCount ?? 0;
      toast.success(
        created > 0
          ? `${created} checklist master dibuat`
          : 'Semua jenis item sudah punya checklist master',
      );
    } catch (e: any) {
      toast.error(e?.message || 'Gagal membuat checklist master');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus checklist master "${name}"?`)) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Checklist master dihapus');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus');
    }
  };

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Memuat checklist master...</p>;
  if (isError) {
    return (
      <p className="text-red-500 py-8 text-center">
        {(error as any)?.message || 'Gagal memuat checklist master'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Checklist Master</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar pertanyaan checklist, dikelompokkan per jenis item. Frekuensi mengikuti pengaturan jenis item.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && missingCount > 0 && (
            <button
              onClick={handleProvision}
              disabled={provision.isPending}
              className="px-4 py-2 border border-input rounded-lg text-sm"
            >
              {provision.isPending ? 'Menyiapkan...' : `Lengkapi ${missingCount} jenis item`}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => navigate('/checklist/templates/new')}
              className="px-4 py-2 primary text-white rounded-lg text-sm"
            >
              Tambah Checklist
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="bg-card rounded-xl border border-dashed border-input p-8 text-center">
          <p className="text-muted-foreground">
            Belum ada jenis item aktif. Tambahkan jenis item dulu di Master Data.
          </p>
          <button
            onClick={() => navigate('/master/item-types')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Buka Master Jenis Item
          </button>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group: any) => (
          <div key={group.itemTypeId} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-foreground">{group.itemTypeName}</h3>
                <span className="text-xs text-muted-foreground">{group.itemTypeCode}</span>
                <FrequencyBadge frequency={group.frequency} />
                {group.allowNA && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                    N/A diizinkan
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{group.categoryName ?? '\u2014'}</span>
            </div>

            {group.templates.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Belum ada checklist master untuk jenis item ini.
                {canCreate && (
                  <button onClick={handleProvision} className="ml-2 text-primary hover:underline">
                    Buat sekarang
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {group.templates.map((template: any) => (
                  <li key={template.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{template.name}</span>
                        {!template.active && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-600">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.questionCount} pertanyaan
                        {' \u00b7 '}
                        {template.assignedInventoriesCount} inventaris
                        {template.assignedSessions?.length > 0 && (
                          <> {' \u00b7 '}{template.assignedSessions.map((s: any) => s.name).join(', ')}</>
                        )}
                      </p>
                      {template.questionCount === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Belum ada pertanyaan \u2014 checklist ini belum bisa dijalankan.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canUpdate && (
                        <button
                          onClick={() => navigate(`/checklist/templates/${template.id}/edit`)}
                          className="px-3 py-1.5 border border-input rounded-lg text-sm"
                        >
                          Kelola Pertanyaan
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
