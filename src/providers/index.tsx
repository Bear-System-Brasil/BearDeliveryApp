'use client'

import { ConfirmProvider } from '@/contexts/confirm-provider'
import { Toaster } from '@/components/ui/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { bindQueryCacheToUser } from '@/lib/query-cache-session'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache mais agressivo para dados que mudam pouco
            staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam frescos por mais tempo
            gcTime: 30 * 60 * 1000, // 30 minutos - mantém cache por mais tempo
            refetchOnWindowFocus: false, // Evita refetch desnecessário ao focar janela
            refetchOnMount: false, // Usa cache se disponível ao montar
            refetchOnReconnect: 'always', // Refetch ao reconectar internet
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors (client errors)
              const status =
                error && typeof error === 'object' && 'status' in error
                  ? (error as { status?: number }).status
                  : undefined
              if (status !== undefined && status >= 400 && status < 500) {
                return false
              }
              // Maximum 3 attempts
              return failureCount < 3
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  // Cache sem dado da conta anterior depois de logout ou troca de conta
  useEffect(() => bindQueryCacheToUser(queryClient), [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </ConfirmProvider>
    </QueryClientProvider>
  )
}