import casteloEs from "@/data/neighborhoods/es-castelo.json";
import { normalizeText } from "@/lib/geocode";

/**
 * Bairro da lista oficial da cidade. `lat`/`lng` ficam `null` até serem
 * levantados - sem eles o pino começa no centro da cidade.
 */
export type Neighborhood = {
  name: string;
  lat: number | null;
  lng: number | null;
};

/**
 * Formato combinado para a futura rota de bairros do backend (LDMF-264).
 * `ibgeCode` e `cep` ficam `null` enquanto não forem confirmados em fonte
 * oficial.
 */
export type CityNeighborhoods = {
  state: string;
  city: string;
  ibgeCode: string | null;
  cep: string | null;
  neighborhoods: Neighborhood[];
};

// Lista local temporária (LDMF-260). Fonte: Lei Municipal de Castelo nº 4.641,
// de 15/09/2026 - 32 bairros, grafia da lei.
const LOCAL_LISTS: CityNeighborhoods[] = [casteloEs as CityNeighborhoods];

/**
 * Bairros de uma cidade, ou `null` quando ainda não temos lista para ela.
 *
 * Assíncrona de propósito: tem a mesma assinatura que a chamada à rota do
 * backend vai ter, então trocar a origem não muda quem usa.
 */
export async function getNeighborhoods(
  state: string,
  city: string,
): Promise<CityNeighborhoods | null> {
  const stateKey = normalizeText(state);
  const cityKey = normalizeText(city);

  if (!stateKey || !cityKey) return null;

  return (
    LOCAL_LISTS.find(
      (list) =>
        normalizeText(list.state) === stateKey &&
        normalizeText(list.city) === cityKey,
    ) ?? null
  );
}
