import { describe, expect, it } from "vitest";

import { getNeighborhoods } from "./neighborhoods";

// Lei Municipal de Castelo nº 4.641/2026, grafia conforme LDMF-264.
const OFFICIAL_CASTELO = [
  "Aracuí", "Baixa Itália", "Bela Vista", "Caparaó", "Castelo III", "Cava-Roxa",
  "Centro", "Esplanada", "Exposição", "Garagem", "Independência",
  "Jardim Primavera", "Jardins", "Maravilha", "Niterói",
  "Nossa Senhora Aparecida", "Pantanal", "Pedra Luz", "Pouso Alto", "Prainha",
  "Santa Bárbara", "Santa Fé", "Santa Mônica", "Santo Agostinho",
  "Santo Andrezinho", "São Miguel", "Vila Barbosa", "Vila Izabel", "Vila Nova",
  "Vista do Rio", "Vista Linda", "Volta Redonda",
];

describe("getNeighborhoods", () => {
  it("Castelo/ES tem os 32 bairros oficiais com a grafia da lei", async () => {
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
});
