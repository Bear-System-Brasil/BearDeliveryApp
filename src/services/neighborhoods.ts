import casteloEs from "@/data/neighborhoods/es-castelo.json";
import { normalizeText } from "@/lib/geocode";

/**
 * Bairro da lista oficial da cidade. `lat`/`lng` ficam `null` até serem
 * levantados - sem eles o pino começa no centro da cidade.
 */
export type Neighborhood = {
  /** Nome oficial: é o único exibido. */
  name: string;
  /**
   * Outros nomes pelos quais o bairro é conhecido (ex.: o do OpenStreetMap).
   * Servem só para busca e correspondência, nunca para exibição (LDMF-278).
   */
  altNames?: string[];
  lat: number | null;
  lng: number | null;
};

/**
 * Formato combinado para a futura rota de bairros do backend (LDMF-264).
 * `ibgeCode` e `cep` podem ser `null` quando ainda não foram confirmados.
 */
export type CityNeighborhoods = {
  state: string;
  city: string;
  ibgeCode: string | null;
  cep: string | null;
  neighborhoods: Neighborhood[];
};

// Lista local temporária (LDMF-260). Fonte dos nomes: Lei Municipal de Castelo
// nº 4.641, de 15/09/2026, na grafia da lei. "Jardim Primavera" é nome
// alternativo do Pantanal (LDMF-278), então a lista tem 31 entradas. Fontes e
// atribuição em src/data/neighborhoods/README.md.
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

/**
 * Bairro da lista pelo nome oficial ou por um nome alternativo, sem caixa e
 * acento. Devolve o bairro com o nome oficial, que é o que se exibe e salva.
 */
export function findNeighborhood(
  list: CityNeighborhoods | null | undefined,
  query: string | null | undefined,
): Neighborhood | null {
  const key = normalizeText(query);
  if (!list || !key) return null;

  return (
    list.neighborhoods.find((item) => normalizeText(item.name) === key) ??
    list.neighborhoods.find((item) =>
      item.altNames?.some((alt) => normalizeText(alt) === key),
    ) ??
    null
  );
}
