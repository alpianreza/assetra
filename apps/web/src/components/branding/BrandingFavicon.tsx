import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helper';

interface BrandingResponse {
  data?: {
    name?: string;
    logoUrl?: string | null;
  };
}

export function BrandingFavicon() {
  const { data } = useQuery({
    queryKey: ['public-branding'],
    queryFn: () => apiRequest<BrandingResponse>('/branding'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  React.useEffect(() => {
    const branding = data?.data;
    if (branding?.name) document.title = `${branding.name} — Asset & Compliance Management`;
    if (!branding?.logoUrl) return;

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.type = '';
    favicon.href = branding.logoUrl;
  }, [data]);

  return null;
}
