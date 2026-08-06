import { useState } from 'react';
import { useInventoryList } from '../../inventory/hooks';
import { useAuth } from '../../auth/useAuth';
import { exportComplianceXlsx } from '../../dashboard/api';

export function PrintCenterPage() {
  const { hasPermission } = useAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [templateId, setTemplateId] = useState(1);
  const [periodKey, setPeriodKey] = useState(new Date().toISOString().slice(0, 10));
  const { data: inventoryData } = useInventoryList({});

  const inventories = inventoryData?.data?.items ?? [];
  const canExport = hasPermission('reports.export');

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExportPdf = async () => {
    if (selectedIds.length === 0) return;

    const response = await fetch('/api/v1/reports/compliance/batch/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventoryIds: selectedIds, templateId, periodKey }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Checklist_Batch_${periodKey}.pdf`;
      a.click();
    } else {
      alert('Gagal export PDF');
    }
  };

  const handleExportXlsx = async () => {
    if (selectedIds.length === 0) return;
    try {
      const blob = await exportComplianceXlsx({ inventoryIds: selectedIds, templateId, periodKey });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Checklist_Compliance_${periodKey}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal export XLSX');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Print Center</h2>

      <div className="bg-card rounded-xl shadow-sm border p-5">
        <h3 className="font-semibold mb-3">Pilih Inventaris untuk Batch</h3>
        <div className="grid gap-2">
            {inventories.map((inv: any) => (
              <label key={inv.id} className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleSelect(inv.id)} />
                {inv.assetCode} — {inv.itemType ?? ''}
              </label>
            ))}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border p-5">
        <h3 className="font-semibold mb-3">Parameter Export</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col text-sm text-muted-foreground">
            Template ID
            <input
              type="number"
              value={templateId}
              min={1}
              onChange={e => setTemplateId(Number(e.target.value))}
              className="mt-1 border rounded-lg px-3 py-2 w-32"
            />
          </label>
          <label className="flex flex-col text-sm text-muted-foreground">
            Periode
            <input
              type="text"
              value={periodKey}
              onChange={e => setPeriodKey(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="mt-1 border rounded-lg px-3 py-2 w-40"
            />
          </label>
        </div>
      </div>

      {selectedIds.length > 0 && canExport && (
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportPdf} className="px-4 py-2 primary text-white rounded-lg primary/90 transition-colors">
            Export {selectedIds.length} Inventaris ke PDF
          </button>
          <button onClick={handleExportXlsx} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Export {selectedIds.length} Inventaris ke XLSX
          </button>
        </div>
      )}
    </div>
  );
}
