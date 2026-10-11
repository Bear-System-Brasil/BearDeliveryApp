import { describe, expect, it } from "vitest";
import type { Delivery } from "@/services/api";
import {
  MAX_ACCEPT_DISTANCE_KM,
  checkAcceptDistance,
  straightLineKm,
} from "./accept-distance";

// Centro de Castelo/ES e o endereço de um cliente lá.
const CASTELO = { lat: -20.6036, lng: -41.1847 };

const withCustomerAt = (latitude: unknown, longitude: unknown) =>
  ({ id: "n1", deliveryAddress: { latitude, longitude } }) as unknown as Delivery;

describe("straightLineKm", () => {
  it("mesmo ponto dá zero", () => {
    expect(straightLineKm(CASTELO, CASTELO)).toBe(0);
  });

  it("um grau de latitude dá ~111 km", () => {
    const north = { lat: CASTELO.lat + 1, lng: CASTELO.lng };
    expect(straightLineKm(CASTELO, north)).toBeCloseTo(111.2, 0);
  });
});

describe("checkAcceptDistance", () => {
  it("cliente perto: libera e diz a distância", () => {
    const result = checkAcceptDistance(
      withCustomerAt("-20.6146", "-41.2077"),
      CASTELO,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.km).toBeLessThan(5);
  });

  // LDMF-314: posição em Curitiba pra uma entrega em Recife virou frete de
  // R$ 3.698 - o backend aceitou sem reclamar.
  it("posição a milhares de km bloqueia", () => {
    const result = checkAcceptDistance(
      withCustomerAt("-8.05389", "-34.88111"),
      { lat: -25.4130843, lng: -49.346006 },
    );

    expect(result).toMatchObject({ ok: false, reason: "too-far" });
  });

  it("o limite vale: logo acima bloqueia, logo abaixo libera", () => {
    // ~0,009 grau de latitude por km
    const kmToLat = 1 / 111.2;
    const customer = (km: number) =>
      withCustomerAt(String(CASTELO.lat + km * kmToLat), String(CASTELO.lng));

    expect(
      checkAcceptDistance(customer(MAX_ACCEPT_DISTANCE_KM - 0.5), CASTELO).ok,
    ).toBe(true);
    expect(
      checkAcceptDistance(customer(MAX_ACCEPT_DISTANCE_KM + 0.5), CASTELO).ok,
    ).toBe(false);
  });

  it.each([
    ["sem endereço", undefined, undefined],
    ["coordenada nula", null, null],
    ["coordenada vazia", "", ""],
    ["0,0", "0", "0"],
  ])("cliente %s: bloqueia por falta de coordenada", (_, lat, lng) => {
    const delivery =
      lat === undefined
        ? ({ id: "n1" } as unknown as Delivery)
        : withCustomerAt(lat, lng);

    expect(checkAcceptDistance(delivery, CASTELO)).toEqual({
      ok: false,
      reason: "no-customer-coords",
    });
  });
});
