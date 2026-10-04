import { describe, expect, it } from "vitest";

import {
  findNeighborhood,
  getNeighborhoods,
  isSpellingVariant,
  neighborhoodLabel,
} from "./neighborhoods";

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

  it("coordenadas exatamente como no levantamento da LDMF-264; sem fonte, null", async () => {
    const list = await getNeighborhoods("ES", "Castelo");
    const coords = Object.fromEntries(
      list!.neighborhoods.map((n) => [n.name, n.lat === null ? null : [n.lat, n.lng]]),
    );

    expect(coords).toEqual({
      Aracuí: [-20.6407875, -41.2107832],
      "Baixa Itália": [-20.6016974, -41.2019081],
      "Bela Vista": [-20.6146347, -41.2079093],
      Caparaó: null,
      "Castelo III": [-20.633576, -41.2041395],
      "Cava-Roxa": [-20.6195768, -41.1988949],
      Centro: [-20.6030775, -41.2051535],
      Esplanada: [-20.6172327, -41.203373],
      Exposição: [-20.6096767, -41.2123698],
      Garagem: [-20.5957987, -41.2150298],
      Independência: [-20.5980544, -41.2053881],
      Jardins: null,
      Maravilha: null,
      Niterói: [-20.607208, -41.1976926],
      "Nossa Senhora Aparecida": [-20.6065512, -41.2057867],
      Pantanal: [-20.646966, -41.2076957],
      "Pedra Luz": null,
      "Pouso Alto": [-20.5981755, -41.2003934],
      Prainha: [-20.5975403, -41.2102605],
      "Santa Bárbara": [-20.6303167, -41.2060421],
      "Santa Fé": null,
      "Santa Mônica": [-20.6121192, -41.2097285],
      "Santo Agostinho": [-20.611107, -41.2068908],
      "Santo Andrezinho": [-20.6061586, -41.2016773],
      "São Miguel": [-20.6097534, -41.2017916],
      "Vila Barbosa": [-20.6035275, -41.2122148],
      "Vila Izabel": [-20.6020524, -41.2094684],
      "Vila Nova": [-20.6231323, -41.2012378],
      "Vista do Rio": null,
      "Vista Linda": null,
      "Volta Redonda": [-20.5995334, -41.2113195],
    });
    expect(list!.neighborhoods.filter((n) => n.lat !== null)).toHaveLength(24);
  });

  it("center é a média dos 24 bairros com coordenada, com 7 casas", async () => {
    const list = await getNeighborhoods("ES", "Castelo");
    const points = list!.neighborhoods.filter(
      (item): item is typeof item & { lat: number; lng: number } =>
        item.lat !== null && item.lng !== null,
    );
    const mean = (values: number[]) =>
      Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(7));

    expect(points).toHaveLength(24);
    expect(list!.center).toEqual({
      lat: mean(points.map((item) => item.lat)),
      lng: mean(points.map((item) => item.lng)),
    });
    expect(list!.center).toEqual({ lat: -20.6120106, lng: -41.2061312 });
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
      "Castelo III": ["Castelo 3", "Castelo Três", "Pombal", "Ivo Martins"],
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
    expect(findNeighborhood(list, "Pombal")?.name).toBe("Castelo III");
    expect(findNeighborhood(list, "castelo 3")?.name).toBe("Castelo III");
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

describe("texto da opção na lista", () => {
  it("mostra entre parênteses só os nomes diferentes, não as variações de grafia", async () => {
    const list = await getNeighborhoods("ES", "Castelo");
    const label = (name: string) =>
      neighborhoodLabel(list!.neighborhoods.find((n) => n.name === name)!);

    expect(label("Castelo III")).toBe("Castelo III (Pombal, Ivo Martins)");
    expect(label("Pantanal")).toBe("Pantanal (Jardim Primavera)");
    expect(label("Cava-Roxa")).toBe("Cava-Roxa");
    expect(label("Centro")).toBe("Centro");
  });

  it("variação de grafia: caixa, acento, pontuação, romano e número por extenso", () => {
    expect(isSpellingVariant("Castelo III", "Castelo 3")).toBe(true);
    expect(isSpellingVariant("Castelo III", "Castelo Três")).toBe(true);
    expect(isSpellingVariant("Cava-Roxa", "Cava Roxa")).toBe(true);
    expect(isSpellingVariant("Castelo III", "Pombal")).toBe(false);
    expect(isSpellingVariant("Pantanal", "Jardim Primavera")).toBe(false);
  });
});
