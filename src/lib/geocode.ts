import { Coords } from "@/types/restaurant";
import { isInCity, type CityRef, type NominatimAddress } from "@/lib/nominatim";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export type GeocodableAddress = {
  city?: string | null;
  neighborhood?: string | null;
  number?: string | null;
  state?: string | null;
  street?: string | null;
  zipCode?: string | null;
};

export function normalizeText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Converte latitude/longitude vindas da API (string, number ou null) em Coords.
 * Retorna null quando o endereço não tem coordenada utilizavel.
 */
export function parseCoords(lat: unknown, lng: unknown): Coords | null {
  if (lat === null || lat === undefined || lat === "") return null;
  if (lng === null || lng === undefined || lng === "") return null;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  if (parsedLat === 0 && parsedLng === 0) return null;

  return { lat: parsedLat, lng: parsedLng };
}

/**
 * Compara a cidade do cliente com a cidade de um endereço.
 * O valor do cliente pode vir como "Castelo" ou "Castelo, ES", entao usamos
 * apenas o primeiro trecho e aceitamos correspondencia parcial em nomes longos.
 */
export function isSameCity(cityA?: string | null, cityB?: string | null) {
  const a = normalizeText(cityA?.split(",")[0]);
  const b = normalizeText(cityB?.split(",")[0]);

  if (!a || !b) return false;
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;

  return shorter.length >= 4 && longer.includes(shorter);
}

type NominatimResult = {
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

async function searchNominatim(
  query: string,
  cityRef?: CityRef | null,
): Promise<Coords | null> {
  if (!query.trim()) return null;

  try {
    const response = await fetch(
      `${NOMINATIM_SEARCH_URL}?q=${encodeURIComponent(
        query,
      )}&format=jsonv2&limit=1&addressdetails=1`,
    );

    if (!response.ok) return null;

    const results = await response.json();
    const result: NominatimResult | null =
      Array.isArray(results) && results[0] ? results[0] : null;

    if (!result) return null;

    if (cityRef && !isInCity(result.address, cityRef)) {
      return null;
    }

    return parseCoords(result.lat, result.lon);
  } catch {
    return null;
  }
}

/**
 * Geocodifica um endereço usando o Nominatim.
 *
 * O resultado só é aceito se o ponto cair dentro da cidade do endereço
 * (verificação via `isInCity`). Se o ponto retornado for de outra cidade
 * ou se o endereço não for localizado, devolve `null` para que o chamador
 * (como `resolveAddressCoordinates` no checkout) use a coordenada do CEP
 * (centro da cidade).
 */
export async function geocodeAddress(
  address: GeocodableAddress,
): Promise<Coords | null> {
  const city = address.city?.trim();
  const state = address.state?.trim();
  const cityRef: CityRef | null =
    city && state ? { city, state } : null;

  const fullQuery = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.zipCode,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");

  return searchNominatim(fullQuery, cityRef);
}
