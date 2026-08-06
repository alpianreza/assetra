import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api-helper';

/**
 * Printed QR codes keep pointing to /q/:publicId. Once authenticated, this
 * resolver sends the user to the canonical inventory detail page.
 */
export function PublicQrPage() {
  const { publicId } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['qr-inventory-resolve', publicId],
    queryFn: () => apiRequest<any>(`/public/inventory/${encodeURIComponent(publicId!)}`),
    enabled: !!publicId,
    retry: false,
  });

  if (isLoading) return <p className="text-center py-8 text-muted-foreground">Membuka detail inventaris...</p>;
  if (isError || !data?.data?.id) {
    return <p className="text-center py-8 text-red-500">{(error as any)?.message || 'Inventaris tidak ditemukan atau akses ditolak.'}</p>;
  }

  return <Navigate to={`/inventory/${data.data.id}`} replace state={{ fromQr: true }} />;
}
