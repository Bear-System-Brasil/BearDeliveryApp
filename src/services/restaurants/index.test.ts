import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Restaurant } from "@/types/restaurant";

const getAll = vi.fn();

vi.mock("@/services/api", () => ({
  apiService: {
    companies: {
      getAll: (...args: unknown[]) => getAll(...args),
    },
  },
}));

import { getActiveRestaurants } from "./index";

const CASTELO = { lat: -20.6022, lng: -41.2032, city: "Castelo, ES" };

function store(
  id: string,
  overrides: Omit<Partial<Restaurant>, "Address"> & {
    Address?: Record<string, unknown>[];
    city?: string;
    latitude?: unknown;
    longitude?: unknown;
  } = {},
): Restaurant {
  const { city = "Castelo", latitude, longitude, ...rest } = overrides;
  return {
    id,
    tradeName: `Loja ${id}`,
    status: "active",
    Address: [{ city, latitude, longitude }],
    ...rest,
  } as unknown as Restaurant;
}

/** Primeira chamada com lat/lng (busca por raio), segunda sem (catalogo). */
function mockResponses(nearby: Restaurant[], catalog: Restaurant[] | null) {
  getAll.mockImplementation((location?: unknown) =>
    Promise.resolve(
      location
        ? { success: true, data: nearby }
        : catalog
          ? { success: true, data: catalog }
          : { success: false },
    ),
  );
}

const byId = (list: Restaurant[], id: string) =>
  list.find((restaurant) => restaurant.id === id);

describe("getActiveRestaurants", () => {
  beforeEach(() => {
    getAll.mockReset();
  });

  it("sem localização devolve o catalogo ativo, sem buscar por raio", async () => {
    getAll.mockResolvedValue({
      success: true,
      data: [store("a"), store("b", { status: "inactive" })],
    });

    const result = await getActiveRestaurants();

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledWith();
    expect(result.map((restaurant) => restaurant.id)).toEqual(["a"]);
    expect(result[0].isWithinRadius).toBeUndefined();
  });

  it("marca como dentro do raio o que a busca por raio devolveu sem a flag", async () => {
    const near = store("near", { latitude: "-20.60", longitude: "-41.20" });
    mockResponses([near], [near]);

    const result = await getActiveRestaurants(CASTELO);

    expect(byId(result, "near")?.isWithinRadius).toBe(true);
  });

  it("respeita isWithinRadius enviado pelo backend", async () => {
    const far = store("far", {
      latitude: "-20.60",
      longitude: "-41.20",
      isWithinRadius: false,
    });
    mockResponses([far], [far]);

    const result = await getActiveRestaurants(CASTELO);

    expect(byId(result, "far")?.isWithinRadius).toBe(false);
  });

  it("loja sem coordenada da mesma cidade entra, mas fora do raio", async () => {
    const unmapped = store("unmapped");
    mockResponses([], [unmapped]);

    const result = await getActiveRestaurants(CASTELO);

    expect(byId(result, "unmapped")).toBeDefined();
    expect(byId(result, "unmapped")?.isWithinRadius).toBe(false);
  });

  it("trata coordenada vazia ou 0,0 como ausente", async () => {
    const empty = store("empty", { latitude: "", longitude: "" });
    const zero = store("zero", { latitude: 0, longitude: 0 });
    mockResponses([], [empty, zero]);

    const result = await getActiveRestaurants(CASTELO);

    expect(byId(result, "empty")?.isWithinRadius).toBe(false);
    expect(byId(result, "zero")?.isWithinRadius).toBe(false);
  });

  it("não resgata loja sem coordenada de outra cidade", async () => {
    mockResponses([], [store("vitoria", { city: "Vitória" })]);

    const result = await getActiveRestaurants(CASTELO);

    expect(byId(result, "vitoria")).toBeUndefined();
  });

  it("não resgata loja com coordenada que a busca por raio deixou de fora", async () => {
    const mappedFar = store("mapped-far", {
      latitude: "-20.76",
      longitude: "-41.54",
    });
    mockResponses([], [mappedFar]);

    const result = await getActiveRestaurants(CASTELO);

    expect(byId(result, "mapped-far")).toBeUndefined();
  });

  it("não resgata loja inativa nem duplica loja que já veio por raio", async () => {
    const near = store("near");
    mockResponses([near], [near, store("inactive", { status: "inactive" })]);

    const result = await getActiveRestaurants(CASTELO);

    expect(result.map((restaurant) => restaurant.id)).toEqual(["near"]);
    expect(byId(result, "near")?.isWithinRadius).toBe(true);
  });

  describe("endereço apagado (soft delete, isActive: false)", () => {
    const deleted = {
      city: "Castelo",
      latitude: "-20.60",
      longitude: "-41.20",
      isActive: false,
    };

    it("tira do raio a loja cuja única coordenada é de endereço apagado", async () => {
      const onlyDeleted = store("only-deleted", { Address: [deleted] });
      mockResponses([onlyDeleted], [onlyDeleted]);

      const result = await getActiveRestaurants(CASTELO);

      expect(byId(result, "only-deleted")?.isWithinRadius).toBe(false);
    });

    it("tira do raio quando o endereço ativo não tem coordenada", async () => {
      const activeUnmapped = store("active-unmapped", {
        Address: [
          deleted,
          { city: "Castelo", latitude: null, longitude: null },
        ],
      });
      mockResponses([activeUnmapped], [activeUnmapped]);

      const result = await getActiveRestaurants(CASTELO);

      expect(byId(result, "active-unmapped")?.isWithinRadius).toBe(false);
    });

    it("mantém no raio quando sobra outro endereço ativo com coordenada", async () => {
      const withActive = store("with-active", {
        Address: [
          deleted,
          { city: "Castelo", latitude: "-20.61", longitude: "-41.21" },
        ],
      });
      mockResponses([withActive], [withActive]);

      const result = await getActiveRestaurants(CASTELO);

      expect(byId(result, "with-active")?.isWithinRadius).toBe(true);
    });

    it("sem isActive na resposta, confia no backend", async () => {
      const noFlag = store("no-flag", {
        latitude: "-20.60",
        longitude: "-41.20",
      });
      mockResponses([noFlag], [noFlag]);

      const result = await getActiveRestaurants(CASTELO);

      expect(byId(result, "no-flag")?.isWithinRadius).toBe(true);
    });

    it("sem endereços na resposta, confia no backend", async () => {
      const noAddress = store("no-address", { Address: [] });
      mockResponses([noAddress], [noAddress]);

      const result = await getActiveRestaurants(CASTELO);

      expect(byId(result, "no-address")?.isWithinRadius).toBe(true);
    });

    it("não resgata pela cidade de um endereço apagado", async () => {
      const deletedNoCoords = store("deleted-no-coords", {
        Address: [{ city: "Castelo", isActive: false }],
      });
      mockResponses([], [deletedNoCoords]);

      const result = await getActiveRestaurants(CASTELO);

      expect(byId(result, "deleted-no-coords")).toBeUndefined();
    });
  });

  it("sem o catalogo devolve só a busca por raio", async () => {
    const near = store("near", { latitude: "-20.60", longitude: "-41.20" });
    mockResponses([near], null);

    const result = await getActiveRestaurants(CASTELO);

    expect(result.map((restaurant) => restaurant.id)).toEqual(["near"]);
  });

  it("falha quando a busca por raio falha", async () => {
    getAll.mockResolvedValue({ success: false });

    await expect(getActiveRestaurants(CASTELO)).rejects.toThrow(
      "Falha ao carregar restaurantes",
    );
  });
});
