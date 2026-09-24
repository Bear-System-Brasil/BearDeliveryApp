import { apiService, type Company } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getRestaurant } from "@/services/restaurant";
import { getActiveRestaurants } from "@/services/restaurants";
import { UserLocation } from "@/types/restaurant";

/**
 * Hook para buscar todos os restaurantes ativos
 * Otimizado com cache agressivo + placeholderData para feedback instantâneo
 */
export const useRestaurants = (
  userLocation?: UserLocation,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["restaurants", "active", userLocation],
    queryFn: () => getActiveRestaurants(userLocation),
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutos - restaurantes não mudam com frequência
    gcTime: 60 * 60 * 1000, // 1 hora - mantém cache por mais tempo
    placeholderData: (previousData) => previousData,
    notifyOnChangeProps: ["data", "error"], // Otimiza re-renders - só atualiza se dados mudarem
  });
};

/**
 * Hook para buscar detalhes de um restaurante específico
 * Com cache agressivo para dados de restaurante
 */
export const useRestaurant = (restaurantId: string | null) => {
  return useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => getRestaurant(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 15 * 60 * 1000, // 15 minutos - dados do restaurante são estáveis
    gcTime: 60 * 60 * 1000, // 1 hora
  });
};

/**
 * Hook para atualizar dados do restaurante
 */
export const useUpdateRestaurant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Company>;
    }) => {
      const response = await apiService.companies.update(id, data);
      if (!response.success) {
        throw new Error("Falha ao atualizar restaurante");
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant", variables.id] });
      toast.success("Restaurante atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar restaurante");
    },
  });
};
