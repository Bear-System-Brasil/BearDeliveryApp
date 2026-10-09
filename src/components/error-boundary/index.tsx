'use client'

import { Button } from '@/components/ui/button'
import * as Sentry from '@sentry/nextjs'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error Boundary Component - Captura erros JavaScript e exibe UI de fallback
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)

    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-6 text-center">
            <div className="text-red-500 dark:text-red-400 mb-4">
              <AlertCircle className="h-16 w-16 mx-auto" />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              Oops! Algo deu errado
            </h2>

            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Por favor, tente novamente ou recarregue a página.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                  Detalhes do erro (apenas em desenvolvimento)
                </summary>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1 cursor-pointer"
              >
                Tentar novamente
              </Button>

              <Button
                onClick={this.handleReload}
                className="flex-1 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}