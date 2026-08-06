import { useState } from 'react';
import { useInventoryList } from '../../inventory/hooks';
import { useBatchQr } from '../hooks';
import { useAuth } from '../../auth/useAuth';

export function QrCenterPage() {
  const { hasPermission } = useAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: inventoryData } = useInventoryList({});
  const batchQr = useBatchQr();

  const inventories = inventoryData?.data?.items ?? [];
  const canPrint = hasPermission('qr.print');

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handlePrint = async () => {
    if (selectedIds.length === 0) return;
    const res = await batchQr.mutateAsync(selectedIds);
    const labelData = res.data;

    // Simple print preview
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Print Label</title><style>@media print { .no-print { display: none; } } .label { border: 1px solid #000; padding: 10px; margin: 10px; width: 200px; display: inline-block; text-align: center; }</style></head><body>');
    labelData.forEach((item: any) => {
      // Use Assetra backend QR endpoint (no external QR service)
      printWindow.document.write(`<div class="label"><p>${item.assetCode}</p><img src="/api/v1/qr/inventory/${item.id}/image" width="150" height="150" /></div>`);
    });
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">QR Center</h2>
      {canPrint && <button onClick={handlePrint} className="primary text-white px-4 py-2 rounded mb-4">Print Label ({selectedIds.length})</button>}
      <div className="bg-card p-4 border rounded">
        {inventories.map((inv: any) => (
          <div key={inv.id} className="flex items-center gap-2 p-2 border-b">
            <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleSelect(inv.id)} />
            <span>{inv.assetCode}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
