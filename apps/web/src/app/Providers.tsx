import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui'
import { queryClient } from './queryClient'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* TooltipProvider dipasang di level root supaya Tooltip (mis. di ThemeToggle
          pada halaman login) tidak crash karena berada di luar Layout. */}
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>{children}</BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
