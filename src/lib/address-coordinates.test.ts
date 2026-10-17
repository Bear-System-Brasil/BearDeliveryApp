import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseBrasilApiCoords,
  resolveAddressCoordinates,
  shouldReplaceCoords,
  withCoords,
  type SourcedCoords,
} from "./address-coordinates";

describe("address-coordinates - prioridades e utilitários", () => {
  it("extrai coordenadas válidas do payload da BrasilAPI", () => {
    const payload = {
      location: {
        coordinates: {
          latitude: "-20.7634",
          longitude: "-41.5332",
        },
      },
    };
    expect(parseBrasilApiCoords(payload)).toEqual({
      lat: -20.7634,
      lng: -41.5332,
    });
  });

  it("retorna null quando BrasilAPI responde coordinates vazio", () => {
    expect(parseBrasilApiCoords({ location: { coordinates: {} } })).toBeNull();
    expect(parseBrasilApiCoords(null)).toBeNull();
  });

  it("respeita a hierarquia de fontes (manual/stored > geocode/neighborhood > cep)", () => {
    const cepCoords: SourcedCoords = {
      coords: { lat: -20.76, lng: -41.53 },
      source: "cep",
    };
    const geocodeCoords: SourcedCoords = {
      coords: { lat: -20.764, lng: -41.534 },
      source: "geocode",
    };

    // Geocode substitui CEP
    expect(shouldReplaceCoords(cepCoords, "geocode")).toBe(true);
    // Manual substitui Geocode
    expect(shouldReplaceCoords(geocodeCoords, "manual")).toBe(true);
    // CEP nunca substitui Geocode
    expect(shouldReplaceCoords(geocodeCoords, "cep")).toBe(false);
  });

  it("withCoords aplica a nova coordenada respeitando a prioridade", () => {
    const current: SourcedCoords = {
      coords: { lat: -20.76, lng: -41.53 },
      source: "cep",
    };

    const next = withCoords(current, { lat: -20.765, lng: -41.535 }, "geocode");
    expect(next).toEqual({
      coords: { lat: -20.765, lng: -41.535 },
      source: "geocode",
    });

    const ignored = withCoords(next, { lat: -20.76, lng: -41.53 }, "cep");
    expect(ignored).toBe(next);
  });
});

describe("resolveAddressCoordinates - resolução no checkout (LDMF-360)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Coordenadas que a BrasilAPI devolveu para o CEP de Alegre/ES (centro da cidade)
  const cepCoordsOfAlegre: SourcedCoords = {
    coords: { lat: -20.7634, lng: -41.5332 },
    source: "cep",
  };

  const addressInput = {
    street: "Rua São Paulo",
    number: "10",
    neighborhood: "Centro",
    city: "Alegre",
    state: "ES",
    zipCode: "29500-000",
  };

  it("ponto na cidade (aceita): atualiza para o ponto da rua com source geocode", async () => {
    const nominatimAlegre = {
      lat: "-20.7650",
      lon: "-41.5340",
      address: {
        road: "Rua São Paulo",
        town: "Alegre",
        state: "Espírito Santo",
        "ISO3166-2-lvl4": "BR-ES",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [nominatimAlegre],
    } as Response);

    const resolved = await resolveAddressCoordinates(addressInput, cepCoordsOfAlegre);

    expect(resolved).toEqual({
      coords: { lat: -20.765, lng: -41.534 },
      source: "geocode",
    });
  });

  it("ponto em outra cidade (descarta e usa o CEP): 'Rua São Paulo, 10, Centro, Alegre, ES' voltando Ponto Belo mantém a coordenada do CEP", async () => {
    // Caso real medido: Nominatim acha Rua São Paulo em Ponto Belo (~300 km)
    const nominatimPontoBelo = {
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
      json: async () => [nominatimPontoBelo],
    } as Response);

    const resolved = await resolveAddressCoordinates(addressInput, cepCoordsOfAlegre);

    // Deve descartar o ponto de Ponto Belo e preservar o centro de Alegre vindo do CEP
    expect(resolved).toBe(cepCoordsOfAlegre);
    expect(resolved?.coords).toEqual({ lat: -20.7634, lng: -41.5332 });
    expect(resolved?.source).toBe("cep");
  });

  it("endereço não encontrado (usa o CEP): quando o Nominatim não localiza a rua, mantém a coordenada do CEP", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const resolved = await resolveAddressCoordinates(
      {
        ...addressInput,
        street: "Rua Inexistente no Mapa",
        number: "999",
      },
      cepCoordsOfAlegre,
    );

    expect(resolved).toBe(cepCoordsOfAlegre);
    expect(resolved?.coords).toEqual({ lat: -20.7634, lng: -41.5332 });
    expect(resolved?.source).toBe("cep");
  });

  it("coordenadas manuais (clique no mapa ou GPS) não são sobrescritas pela geocodificação", async () => {
    const manualCoords: SourcedCoords = {
      coords: { lat: -20.768, lng: -41.538 },
      source: "manual",
    };

    const resolved = await resolveAddressCoordinates(addressInput, manualCoords);

    expect(resolved).toBe(manualCoords);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("coordenadas salvas (stored) de endereço não alterado não disparam nova geocodificação", async () => {
    const storedCoords: SourcedCoords = {
      coords: { lat: -20.761, lng: -41.531 },
      source: "stored",
    };

    const resolved = await resolveAddressCoordinates(addressInput, storedCoords);

    expect(resolved).toBe(storedCoords);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
