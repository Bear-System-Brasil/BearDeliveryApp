import { apiService } from '@/services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Hook para buscar todas as especialidades (tipos de restaurante)
 */
export const useSpecialties = () => {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const response = await apiService.getAllSpecialties()
      if (!response.success || !response.data) {
        throw new Error('Falha ao carregar especialidades')
      }
      return response.data
    },
    staleTime: 1000 * 60 * 30, // 30 minutos - especialidades raramente mudam
  })
}

/**
 * Hook para buscar empresas por especialidade
 */
export const useCompaniesBySpecialty = (specialtyId: string | null) => {
  return useQuery({
    queryKey: ['specialty', specialtyId, 'companies'],
    queryFn: async () => {
      if (!specialtyId) throw new Error('Specialty ID is required')
      const response = await apiService.getCompaniesBySpecialty(specialtyId)
      if (!response.success || !response.data) {
        throw new Error('Falha ao carregar empresas')
      }
      return response.data
    },
    enabled: !!specialtyId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook para vincular especialidade à empresa autenticada
 */
export const useAssignSpecialty = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (specialtyId: string) => {
      const response = await apiService.assignSpecialtyToCompany(specialtyId)
      if (!response.success) {
        throw new Error('Falha ao vincular especialidade')
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] })
      queryClient.invalidateQueries({ queryKey: ['specialties'] })
      toast.success('Especialidade vinculada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao vincular especialidade')
    },
  })
}

/**
 * Hook para remover especialidade da empresa autenticada
 */
export const useRemoveSpecialty = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (specialtyId: string) => {
      const response = await apiService.removeSpecialtyFromCompany(specialtyId)
      if (!response.success) {
        throw new Error('Falha ao remover especialidade')
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] })
      queryClient.invalidateQueries({ queryKey: ['specialties'] })
      toast.success('Especialidade removida com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover especialidade')
    },
  })
}
