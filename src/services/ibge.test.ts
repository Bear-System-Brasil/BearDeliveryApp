import { afterEach, describe, expect, it, vi } from "vitest";

import { getCities, getStates } from "./ibge";

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("IBGE", () => {
  it("estados viram { uf, name } na ordem da API", async () => {
    const fetchMock = stubFetch([
      { id: 32, sigla: "ES", nome: "Espírito Santo" },
      { id: 31, sigla: "mg", nome: "Minas Gerais" },
      { id: 0, nome: "sem sigla" },
    ]);

    expect(await getStates()).toEqual([
      { uf: "ES", name: "Espírito Santo" },
      { uf: "MG", name: "Minas Gerais" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
    );
  });

  it("municípios do estado trazem o código IBGE", async () => {
    const fetchMock = stubFetch([{ id: 3201407, nome: "Castelo" }, { id: 1 }]);

    expect(await getCities("es")).toEqual([{ ibgeCode: "3201407", name: "Castelo" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados/ES/municipios?orderBy=nome",
    );
  });

  it("UF inválida não chama a API", async () => {
    const fetchMock = stubFetch([]);

    expect(await getCities("")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("erro da API vira exceção (quem chama decide o fallback)", async () => {
    stubFetch([], false);

    await expect(getStates()).rejects.toThrow("IBGE respondeu 500");
  });
});
