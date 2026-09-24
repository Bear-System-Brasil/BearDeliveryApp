import { useQuery } from "@tanstack/react-query";

import { getNewDishes } from "@/services/products/new-dishes";
import type { Restaurant, UserLocation } from "@/types/restaurant";

/**
 * Pratos da seção "Novidades" da home. Recebe as lojas já filtradas por
 * raio (a mesma lista das Lojas) porque, sem a rota de recentes no
 * backend, é delas que os pratos são agregados.
 */
export const useNewDishes = (
  restaurants: Restaurant[],
  location?: UserLocation | null,
) => {
  const restaurantIds = restaurants.map((restaurant) => restaurant.id);

  return useQuery({
    queryKey: ["new-dishes", location ?? null, restaurantIds],
    queryFn: () => getNewDishes(restaurants, location),
    enabled: restaurantIds.length > 0,
    staleTime: 10 * 60 * 1000, // mesma janela das lojas - o cardápio muda pouco
    gcTime: 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    notifyOnChangeProps: ["data", "error", "isLoading"],
  });
};
