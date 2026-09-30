/**
 * =============================================================================
 * STORAGE MANAGER - GERENCIAMENTO CENTRALIZADO DE ARMAZENAMENTO
 * =============================================================================
 * 
 * Gerencia localStorage, sessionStorage e define padrões de armazenamento
 * seguindo melhores práticas de apps de delivery modernos (iFood, Uber Eats, Rappi)
 * 
 * ESTRATÉGIA DE ARMAZENAMENTO:
 * 
 * 1. localStorage (Persistente entre sessões):
 *    - Autenticação (token + user) via Zustand persist
 *    - Preferências do usuário (theme, notifications, language)
 *    - Favoritos
 *    - Endereços salvos
 *    - Carrinho (orderId) para recuperar carrinhos abandonados
 * 
 * 2. sessionStorage (Apenas sessão atual):
 *    - Contexto temporário de navegação
 *    - Filtros de busca temporários
 *    - Dados de formulários em progresso
 * 
 * 3. Memory (Zustand sem persist):
 *    - UI states (modais, loading)
 *    - Dados temporários de performance
 * 
 * 4. Backend/Redis (Fonte da verdade):
 *    - Carrinho completo (itens, quantidades)
 *    - Pedidos
 *    - Histórico
 * 
 * SEGURANÇA:
 * - Tokens em localStorage (aceitável para SPA)
 * - Para produção crítica, considere httpOnly cookies (requer backend)
 * - Nunca armazenar: senhas, dados de pagamento completos
 */

// Storage keys padronizados
export const STORAGE_KEYS = {
  // Auth (gerenciado por Zustand)
  AUTH: 'auth-storage',

  // User preferences
  PREFERENCES: 'user-preferences',
  FINANCIAL_PREFERENCES: 'financial-preferences',
  // Entregador: pular o diálogo de confirmação ao aceitar uma entrega.
  // Religável em /delivery-dashboard/ajustes - ver use-accept-confirmation.
  DELIVERY_SKIP_ACCEPT_CONFIRM: 'delivery-skip-accept-confirm',

  // Notifications (gerenciado por Zustand)
  NOTIFICATIONS: 'like-delivery-notifications',

  // Favorites (gerenciado por Zustand)
  FAVORITES: 'like-delivery-favorites',

  // Cart
  CART_ORDER_ID: 'cart-order-id',

  // Checkout: troca temporária do endereço padrão durante a finalização de
  // uma entrega. Guardada para ser desfeita se a aba fechar no meio do
  // caminho - ver src/lib/default-address.ts.
  PENDING_DEFAULT_ADDRESS: 'pending-default-address',

  // Session temporary data
  SESSION_CONTEXT: 'session-context',
  SEARCH_FILTERS: 'search-filters',

  // Legacy (para migração)
  LEGACY_TOKEN: 'token',
  LEGACY_USER: 'user',
  LEGACY_USER_TYPE: 'userType',
  LEGACY_USER_CONTEXT: 'userContext',
} as const

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

/**
 * Storage adapter abstrato para consistência
 */
class StorageAdapter {
  constructor(private storage: Storage | null) { }

  private isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    if (!this.storage) return false

    try {
      const testKey = '__storage_test__'
      this.storage.setItem(testKey, 'test')
      this.storage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  getItem<T = string>(key: string): T | null {
    if (!this.isAvailable()) return null

    try {
      const item = this.storage!.getItem(key)
      if (!item) return null

      // Tentar parsear como JSON, se falhar retornar string
      try {
        return JSON.parse(item) as T
      } catch {
        return item as T
      }
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error)
      return null
    }
  }

  setItem<T = unknown>(key: string, value: T): boolean {
    if (!this.isAvailable()) return false

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      this.storage!.setItem(key, serialized)
      return true
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error)

      // Se quota excedida, tentar limpar dados não essenciais
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing non-essential data...')
        this.clearNonEssential()

        try {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value)
          this.storage!.setItem(key, serialized)
          return true
        } catch {
          return false
        }
      }

      return false
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) return

    try {
      this.storage!.removeItem(key)
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error)
    }
  }

  clear(): void {
    if (!this.isAvailable()) return

    try {
      this.storage!.clear()
    } catch (error) {
      console.error('Error clearing storage:', error)
    }
  }

  private clearNonEssential(): void {
    // Remover dados temporários que podem ser recuperados
    const nonEssentialKeys = [
      'productImages',
      'productCategories',
      STORAGE_KEYS.SEARCH_FILTERS,
    ]

    nonEssentialKeys.forEach(key => this.removeItem(key))
  }

  /**
   * Migrar dados de chaves antigas para novas
   */
  migrate(oldKey: string, newKey: string): void {
    const value = this.getItem(oldKey)
    if (value) {
      this.setItem(newKey, value)
      this.removeItem(oldKey)
    }
  }
}

// Instâncias dos adapters
export const localStorageAdapter = new StorageAdapter(
  typeof window !== 'undefined' ? window.localStorage : null
)

export const sessionStorageAdapter = new StorageAdapter(
  typeof window !== 'undefined' ? window.sessionStorage : null
)

/**
 * StorageManager principal
 */
export const storageManager = {
  // localStorage methods
  local: {
    get: <T = unknown>(key: StorageKey): T | null => localStorageAdapter.getItem<T>(key),
    set: <T = unknown>(key: StorageKey, value: T): boolean => localStorageAdapter.setItem(key, value),
    remove: (key: StorageKey): void => localStorageAdapter.removeItem(key),
    clear: (): void => localStorageAdapter.clear(),
  },

  // sessionStorage methods
  session: {
    get: <T = unknown>(key: StorageKey): T | null => sessionStorageAdapter.getItem<T>(key),
    set: <T = unknown>(key: StorageKey, value: T): boolean => sessionStorageAdapter.setItem(key, value),
    remove: (key: StorageKey): void => sessionStorageAdapter.removeItem(key),
    clear: (): void => sessionStorageAdapter.clear(),
  },

  // Utility methods
  utils: {
    /**
     * Migrate legacy localStorage data to new format
     */
    migrateLegacyData: (): void => {
      // Migration handled automatically by Zustand stores
    },

    /**
     * Limpar todos os dados de autenticação
     */
    clearAuth: (): void => {
      localStorageAdapter.removeItem(STORAGE_KEYS.AUTH)
      localStorageAdapter.removeItem(STORAGE_KEYS.LEGACY_TOKEN)
      localStorageAdapter.removeItem(STORAGE_KEYS.LEGACY_USER)
      localStorageAdapter.removeItem(STORAGE_KEYS.LEGACY_USER_TYPE)
      localStorageAdapter.removeItem(STORAGE_KEYS.LEGACY_USER_CONTEXT)
    },

    /**
     * Limpar dados de sessão
     */
    clearSession: (): void => {
      sessionStorageAdapter.clear()
    },

    /**
     * Obter tamanho aproximado do localStorage em uso
     */
    getStorageSize: (): { used: number; total: number } => {
      if (typeof window === 'undefined') {
        return { used: 0, total: 0 }
      }

      try {
        let used = 0
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            used += localStorage[key].length + key.length
          }
        }

        // Limite típico é ~5MB (5 * 1024 * 1024 bytes)
        const total = 5 * 1024 * 1024

        return { used, total }
      } catch {
        return { used: 0, total: 0 }
      }
    },

    /**
     * Verificar se está próximo do limite
     */
    isNearLimit: (): boolean => {
      const { used, total } = storageManager.utils.getStorageSize()
      return used / total > 0.8 // 80% do limite
    },
  },
}

/**
 * Hook helper para detectar mudanças no storage (entre abas)
 */
export function useStorageEvent(
  key: StorageKey,
  callback: (newValue: unknown) => void
): () => void {
  if (typeof window === 'undefined') return () => { }

  const handler = (e: StorageEvent) => {
    if (e.key === key && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        callback(parsed)
      } catch {
        callback(e.newValue)
      }
    }
  }

  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export default storageManager
