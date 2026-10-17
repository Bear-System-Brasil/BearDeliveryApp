import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress, isSameCity, normalizeText, parseCoords } from "./geocode";

describe("geocode - normalizeText & parseCoords", () => {
  it("normaliza texto removendo acentos e convertendo para minúsculas", () => {
    expect(normalizeText("São Paulo")).toBe("sao paulo");
    expect(normalizeText("Espírito Santo")).toBe("espirito santo");
    expect(normalizeText("  Alegre  ")).toBe("alegre");
  });

  it("converte coordenadas numéricas ou string válidas para Coords", () => {
    expect(parseCoords("-20.76", "-41.53")).toEqual({ lat: -20.76, lng: -41.53 });
    expect(parseCoords(-20.76, -41.53)).toEqual({ lat: -20.76, lng: -41.53 });
  });

  it("retorna null para coordenadas inválidas ou zeradas", () => {
    expect(parseCoords(null, null)).toBeNull();
    expect(parseCoords(0, 0)).toBeNull();
    expect(parseCoords("invalid", "coords")).toBeNull();
  });

  it("compara nomes de cidades tolerando trechos", () => {
    expect(isSameCity("Castelo", "Castelo, ES")).toBe(true);
    expect(isSameCity("Alegre", "Alegre")).toBe(true);
    expect(isSameCity("Alegre", "Vitória")).toBe(false);
  });
});

describe("geocodeAddress - validação de cidade (LDMF-360)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("ponto na cidade (aceita): retorna as coordenadas quando o Nominatim confirma o município", async () => {
    const addressInAlegre = {
      lat: "-20.7649",
      lon: "-41.5336",
      address: {
        road: "Rua Dr. Chaban",
        town: "Alegre",
        state: "Espírito Santo",
        "ISO3166-2-lvl4": "BR-ES",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [addressInAlegre],
    } as Response);

    const result = await geocodeAddress({
      street: "Rua Dr. Chaban",
      number: "100",
      neighborhood: "Centro",
      city: "Alegre",
      state: "ES",
      zipCode: "29500-000",
    });

    expect(result).toEqual({ lat: -20.7649, lng: -41.5336 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("ponto em outra cidade (descarta): 'Rua São Paulo, 10, Centro, Alegre, ES' voltando Ponto Belo é descartado", async () => {
    // Exemplo medido no card LDMF-360: Nominatim acha Rua São Paulo em Ponto Belo/ES (~300 km de Alegre)
    const addressInPontoBelo = {
      lat: "-18.7320",
      lon: "-40.5420",
      address: {
        road: "Rua São Paulo",
        town: "Ponto Belo",
        state: "Espírito Santo",
        "ISO3166-2-lvl4": "BR-ES",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [addressInPontoBelo],
    } as Response);

    const result = await geocodeAddress({
      street: "Rua São Paulo",
      number: "10",
      neighborhood: "Centro",
      city: "Alegre",
      state: "ES",
      zipCode: "29500-000",
    });

    expect(result).toBeNull();
  });

  it("ponto em outro estado de mesmo nome é descartado", async () => {
    const addressInCasteloPI = {
      lat: "-5.32",
      lon: "-41.55",
      address: {
        town: "Castelo",
        state: "Piauí",
        "ISO3166-2-lvl4": "BR-PI",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [addressInCasteloPI],
    } as Response);

    const result = await geocodeAddress({
      street: "Rua das Flores",
      number: "50",
      city: "Castelo",
      state: "ES",
    });

    expect(result).toBeNull();
  });

  it("endereço não encontrado: retorna null quando a busca no Nominatim volta vazia", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const result = await geocodeAddress({
      street: "Rua Inexistente Que Não Está no OSM",
      number: "9999",
      city: "Alegre",
      state: "ES",
    });

    expect(result).toBeNull();
  });

  it("erro de rede no Nominatim retorna null sem quebrar a execução", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    const result = await geocodeAddress({
      street: "Rua São Paulo",
      number: "10",
      city: "Alegre",
      state: "ES",
    });

    expect(result).toBeNull();
  });

  it("quando a resposta não tem address details, descarta para evitar falso positivo", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "-20.76", lon: "-41.53" }],
    } as Response);

    const result = await geocodeAddress({
      street: "Rua Qualquer",
      city: "Alegre",
      state: "ES",
    });

    expect(result).toBeNull();
  });

  it("endereço sem cidade ou estado informados aceita o ponto retornado", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "-20.0", lon: "-40.0" }],
    } as Response);

    const result = await geocodeAddress({
      street: "Avenida Brasil",
    });

    expect(result).toEqual({ lat: -20.0, lng: -40.0 });
  });
});

