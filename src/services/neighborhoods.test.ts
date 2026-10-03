import { describe, expect, it } from "vitest";

import { findNeighborhood, getNeighborhoods } from "./neighborhoods";

// Lei Municipal de Castelo nº 4.641/2026, grafia conforme LDMF-264, sem
// "Jardim Primavera", que virou nome alternativo do Pantanal (LDMF-278).
const OFFICIAL_CASTELO = [
  "Aracuí", "Baixa Itália", "Bela Vista", "Caparaó", "Castelo III", "Cava-Roxa",
  "Centro", "Esplanada", "Exposição", "Garagem", "Independência",
  "Jardins", "Maravilha", "Niterói",
  "Nossa Senhora Aparecida", "Pantanal", "Pedra Luz", "Pouso Alto", "Prainha",
  "Santa Bárbara", "Santa Fé", "Santa Mônica", "Santo Agostinho",
  "Santo Andrezinho", "São Miguel", "Vila Barbosa", "Vila Izabel", "Vila Nova",
  "Vista do Rio", "Vista Linda", "Volta Redonda",
];

describe("getNeighborhoods", () => {
  it("Castelo/ES tem os 31 bairros com a grafia da lei", async () => {
    const list = await getNeighborhoods("ES", "Castelo");

    expect(list?.neighborhoods.map((n) => n.name)).toEqual(OFFICIAL_CASTELO);
  });

  it("nenhum bairro tem coordenada inventada", async () => {
    const list = await getNeighborhoods("ES", "Castelo");

    expect(list?.neighborhoods.every((n) => n.lat === null && n.lng === null)).toBe(true);
  });

  it("traz o CEP da cidade e o código IBGE confirmados", async () => {
    const list = await getNeighborhoods("ES", "Castelo");

    expect(list).toMatchObject({
      state: "ES",
      city: "Castelo",
      ibgeCode: "3201407",
      cep: "29360-000",
    });
  });

  it("ignora caixa e acento na cidade e no estado", async () => {
    expect(await getNeighborhoods("es", "CASTELO")).not.toBeNull();
  });

  it("cidade sem lista devolve null", async () => {
    expect(await getNeighborhoods("ES", "Alegre")).toBeNull();
    expect(await getNeighborhoods("ES", "Conceição do Castelo")).toBeNull();
    expect(await getNeighborhoods("", "")).toBeNull();
  });

  it("nomes alternativos do levantamento (LDMF-278), sem o erro de grafia \"Garage\"", async () => {
    const list = await getNeighborhoods("ES", "Castelo");
    const altNames = Object.fromEntries(
      list!.neighborhoods.filter((n) => n.altNames).map((n) => [n.name, n.altNames]),
    );

    expect(altNames).toEqual({
      "Castelo III": ["Castelo Três", "Ivo Martins"],
      "Cava-Roxa": ["Cava Roxa"],
      Pantanal: ["Jardim Primavera"],
    });
    expect(JSON.stringify(list)).not.toContain("Garage\"");
  });
});

describe("findNeighborhood", () => {
  it("nome alternativo encontra o bairro oficial", async () => {
    const list = await getNeighborhoods("ES", "Castelo");

    expect(findNeighborhood(list, "Jardim Primavera")?.name).toBe("Pantanal");
    expect(findNeighborhood(list, "castelo tres")?.name).toBe("Castelo III");
    expect(findNeighborhood(list, "Ivo Martins")?.name).toBe("Castelo III");
    expect(findNeighborhood(list, "Cava Roxa")?.name).toBe("Cava-Roxa");
  });

  it("nome oficial encontra o próprio bairro, sem caixa e acento", async () => {
    const list = await getNeighborhoods("ES", "Castelo");

    expect(findNeighborhood(list, "SAO MIGUEL")?.name).toBe("São Miguel");
  });

  it("nome fora da lista não encontra nada", async () => {
    const list = await getNeighborhoods("ES", "Castelo");

    expect(findNeighborhood(list, "Garage")).toBeNull();
    expect(findNeighborhood(list, "Boa Fé")).toBeNull();
    expect(findNeighborhood(list, "")).toBeNull();
    expect(findNeighborhood(null, "Centro")).toBeNull();
  });
});
