import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api-helper';

export function PublicQrPage() {
  const { publicId } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-inventory', publicId],
    queryFn: () => apiRequest<any>(`/public/inventory/${publicId}`),
    enabled: !!publicId,
  });

  if (isLoading) return <p className="text-center py-8 text-muted-foreground">Memuat...</p>;
  if (isError) return <p className="text-center py-8 text-red-500">Inventaris tidak ditemukan.</p>;
  if (!data) return <p className="text-center py-8 text-muted-foreground">Inventaris tidak ditemukan.</p>;

  const inv = data.data;

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="primary text-white p-4 text-center">
          <h1 className="text-xl font-bold">Assetra</h1>
          <p className="text-sm opacity-90">Inventory Information</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h2 className="font-bold text-foreground mb-2">{inv.assetCode}</h2>
            <p className="text-muted-foreground">{inv.itemType || '—'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-muted/50 p-3 rounded">
              <p className="text-muted-foreground">Kategori</p>
              <p className="font-medium">{inv.category || '—'}</p>
            </div>
            <div className="bg-muted/50 p-3 rounded">
              <p className="text-muted-foreground">Area</p>
              <p className="font-medium">{inv.area || '—'}</p>
            </div>
            <div className="bg-muted/50 p-3 rounded">
              <p className="text-muted-foreground">Lokasi</p>
              <p className="font-medium">{inv.specificArea || '—'}</p>
            </div>
            <div className="bg-muted/50 p-3 rounded">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{inv.status || '—'}</p>
            </div>
          </div>

          {inv.picUsers && inv.picUsers.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Person In Charge</h3>
              <ul className="space-y-1">
                {inv.picUsers.map((pic: any) => (
                  <li key={pic.id} className="text-sm text-blue-700">{pic.name}</li>
                ))}
              </ul>
            </div>
          )}

          {inv.latestCompliance && (
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Status Compliance Terbaru</h3>
              <p className="text-sm text-muted-foreground">
                {inv.latestCompliance.status === 'ok' ? '✅ Sesuai' :
                 inv.latestCompliance.status === 'not_ok' ? '❌ Tidak Sesuai' : '⚪ N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Periode: {inv.latestCompliance.periodKey} | Tanggal: {new Date(inv.latestCompliance.checkDate).toLocaleDateString('id-ID')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}