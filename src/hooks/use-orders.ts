import { apiService, type CreateOrderRequest } from '@/services/api'
import type { CustomerOrder } from '@/constants/order-management'
import { isActiveOrder } from '@/lib/order-status'
import { useAuthStore } from '@/stores'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Normaliza o payload da listagem: a API pode devolver o array direto, um
 * envelope (`{ data: [] }` / `{ orders: [] }`) ou corpo vazio quando o cliente
 * ainda não tem pedidos. Nenhum desses casos é erro.
 */
function toOrderList(payload: unknown): CustomerOrder[] {
  if (Array.isArray(payload)) return payload as CustomerOrder[]

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const wrapped = record.data ?? record.orders

    if (Array.isArray(wrapped)) return wrapped as CustomerOrder[]

    // Um único pedido devolvido fora de array.
    if (typeof record.id === 'string' && typeof record.status === 'string') {
      return [payload as CustomerOrder]
    }
  }

  return []
}

/** Intervalo de atualização enquanto houver pedido em andamento. */
const ACTIVE_ORDERS_POLL_MS = 30 * 1000

/**
 * Hook para buscar pedidos do cliente logado (`GET /order/customer/me`).
 * O endpoint devolve todos os pedidos sem filtro de status - o rótulo de cada
 * status cuida de diferenciá-los na tela.
 */
export const useUserOrders = () => {
  const { user, isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['orders', 'user', user?.id],
    queryFn: async () => {
      const response = await apiService.orders.getCustomerOrders()

      // Só é erro quando a chamada de fato falhou. Lista vazia é resposta
      // válida e precisa cair no estado "você ainda não fez pedidos".
      if (!response?.success) {
        const status = response?.status ? ` (HTTP ${response.status})` : ''

        throw new Error(
          `${response?.message || 'Não foi possível carregar seus pedidos'}${status}`,
        )
      }

      // `/order/customer/me` ja devolve exatamente os pedidos do cliente.
      // Nao filtramos por status aqui: qualquer descarte no cliente some com
      // pedido que existe de verdade. O rotulo de cada status cuida do resto.
      return toOrderList(response.data).sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      )
    },
    enabled: !!isAuthenticated,
    // O padrao global do app e cache agressivo com `refetchOnMount: false`.
    // Para pedidos isso congela a tela: a loja avanca o status e o cliente
    // continua vendo o anterior mesmo entrando de novo em "Meus pedidos".
    staleTime: 15 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // So fica consultando enquanto houver pedido em andamento.
    refetchInterval: (query) => {
      const orders = query.state.data

      return Array.isArray(orders) && orders.some(isActiveOrder)
        ? ACTIVE_ORDERS_POLL_MS
        : false
    },
  })
}

/**
 * Hook para buscar pedidos da empresa/restaurante
 */
export const useCompanyOrders = (_companyId?: string | null) => {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['orders', 'company'],
    queryFn: async () => {
      const response = await apiService.orders.getCompanyOrders()
      if (!response?.success || !response?.data) return []
      return response.data.data
    },
    enabled: !!isAuthenticated,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

/**
 * Hook para buscar detalhes de um pedido específico
 * Nota: Aguardando implementação no backend
 */
export const useOrder = (orderId: string | null, customerId?: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId || !customerId) return null

      // Usando viewOrder do apiService
      const response = await apiService.orders.viewOrder(customerId, orderId)
      if (!response?.success || !response?.data) {
        return null
      }
      return response.data
    },
    enabled: !!orderId && !!customerId,
    staleTime: 1000 * 30, // 30 segundos
  })
}

/**
 * Hook para criar um pedido
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => {
      if (!user?.id) throw new Error('User not authenticated')

      // Usando openCart do apiService
      const response = await apiService.orders.openCart(user.id, orderData)
      if (!response?.success) {
        throw new Error('Falha ao criar pedido')
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'user', user?.id] })
      toast.success('Pedido criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar pedido')
    },
  })
}

/**
 * Hook para atualizar status de um pedido
 */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiService.orders.updateOrderStatus(orderId, status)
      if (!response.success) throw new Error(response.message || 'Erro ao atualizar status')
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] })
      toast.success('Status do pedido atualizado!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status')
    },
  })
}

/**
 * Hook para cancelar um pedido
 * Nota: API não implementada no backend. Use clearCart como alternativa.
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      // Usando clearCart como alternativa
      const response = await apiService.orders.clearCart(user.id, orderId)
      // Sem isto, uma recusa do backend caía no onSuccess e a tela dizia
      // "cancelado com sucesso" com o pedido intacto.
      if (!response?.success) {
        throw new Error(response?.message || 'Erro ao cancelar pedido')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Pedido cancelado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cancelar pedido')
    },
  })
}
