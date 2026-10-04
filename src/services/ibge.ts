/**
 * API de localidades do IBGE (pública, sem chave).
 * https://servicodados.ibge.gov.br/api/docs/localidades
 *
 * Estados: `[{ id, sigla, nome }]`; municípios: `[{ id, nome }]`. Lemos só
 * esses campos e descartamos o que vier fora desse formato.
 */

const BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";

export type IbgeState = { uf: string; name: string };
export type IbgeCity = { ibgeCode: string; name: string };

async function getJson(path: string): Promise<unknown[]> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`IBGE respondeu ${response.status}`);

  const data: unknown = await response.json();
  return Array.isArray(data) ? data : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getStates(): Promise<IbgeState[]> {
  const data = await getJson("/estados?orderBy=nome");

  return data
    .map((item) => {
      const raw = item as { sigla?: unknown; nome?: unknown };
      return { uf: text(raw.sigla).toUpperCase(), name: text(raw.nome) };
    })
    .filter((state) => state.uf.length === 2 && state.name);
}

export async function getCities(uf: string): Promise<IbgeCity[]> {
  const sigla = uf.trim().toUpperCase();
  if (sigla.length !== 2) return [];

  const data = await getJson(
    `/estados/${encodeURIComponent(sigla)}/municipios?orderBy=nome`,
  );

  return data
    .map((item) => {
      const raw = item as { id?: unknown; nome?: unknown };
      return {
        ibgeCode: raw.id === undefined || raw.id === null ? "" : String(raw.id),
        name: text(raw.nome),
      };
    })
    .filter((city) => city.name);
}
