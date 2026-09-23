import { Restaurant, UserLocation } from "@/types/restaurant";
import { withDeliveryDefaults } from "@/constants/delivery-defaults";
import { apiService } from "@/services/api";
import { isSameCity, parseCoords } from "@/lib/geocode";

const isActive = (company: Restaurant) => company.status === "active";

function getStoreAddresses(restaurant: Restaurant) {
  return restaurant.Address ?? [];
}

/**
 * A loja tem coordenada cadastrada? Se tiver, o backend consegue calcular a
 * distancia e a ausencia dela na busca por raio significa "longe demais".
 */
function hasMappedCoords(restaurant: Restaurant) {
  return getStoreAddresses(restaurant).some((address) =>
    parseCoords(address.latitude, address.longitude),
  );
}

function isInUserCity(restaurant: Restaurant, userCity?: string) {
  return getStoreAddresses(restaurant).some((address) =>
    isSameCity(address.city, userCity),
  );
}

export async function getActiveRestaurants(userLocation?: UserLocation) {
  if (!userLocation) {
    const response = await apiService.companies.getAll();

    if (!response.success || !response.data) {
      throw new Error("Falha ao carregar restaurantes");
    }

    return response.data.filter(isActive).map(withDeliveryDefaults);
  }

  // Buscamos o catalogo completo em paralelo porque a busca por raio descarta
  // toda loja sem latitude/longitude cadastrada - inclusive as que ficam na
  // mesma cidade do cliente.
  const [nearbyResponse, catalogResponse] = await Promise.all([
    apiService.companies.getAll(userLocation),
    apiService.companies.getAll(),
  ]);

  if (!nearbyResponse.success || !nearbyResponse.data) {
    throw new Error("Falha ao carregar restaurantes");
  }

  const nearby = nearbyResponse.data.filter(isActive).map((restaurant) =>
    withDeliveryDefaults({
      ...restaurant,
      isWithinRadius: restaurant.isWithinRadius ?? true,
    }),
  );

  if (!catalogResponse.success || !catalogResponse.data) return nearby;

  const nearbyIds = new Set(nearby.map((restaurant) => restaurant.id));

  // Loja sem geocodificação so entra se o endereço for da cidade do cliente.
  const unmappedInUserCity = catalogResponse.data
    .filter(
      (restaurant) =>
        isActive(restaurant) &&
        !nearbyIds.has(restaurant.id) &&
        !hasMappedCoords(restaurant) &&
        isInUserCity(restaurant, userLocation.city),
    )
    .map((restaurant) =>
      withDeliveryDefaults({ ...restaurant, isWithinRadius: true }),
    );

  return [...nearby, ...unmappedInUserCity];
}
