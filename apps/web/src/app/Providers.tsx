import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { LegacyLanguageBridge } from '@/i18n/LegacyLanguageBridge';
import { BrandingFavicon } from '@/components/branding/BrandingFavicon';
import { queryClient } from './queryClient';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <QueryClientProvider client={queryClient}><LanguageProvider><LegacyLanguageBridge /><BrandingFavicon /><TooltipProvider delayDuration={200}><BrowserRouter>{children}</BrowserRouter></TooltipProvider></LanguageProvider></QueryClientProvider>;
}
