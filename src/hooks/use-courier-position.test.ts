import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCourierPositionStore } from "@/stores/courier-position-store";
import { useCourierPosition } from "./use-courier-position";

const fetchMock = vi.fn();

const position = () => useCourierPositionStore.getState().position;

/** Busca do Nominatim que foi feita, pelo parâmetro `q`. */
const queries = () =>
  fetchMock.mock.calls.map(([url]) =>
    new URL(String(url)).searchParams.get("q"),
  );

describe("useCourierPosition - texto digitado (LDMF-314)", () => {
  beforeEach(() => {
    useCourierPositionStore.setState({ position: null });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("endereço não encontrado não cai no centro do Brasil", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useCourierPosition());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setFromText("Rua Inexistente 123");
    });

    expect(ok).toBe(false);
    expect(queries()).toEqual(["Rua Inexistente 123, Brasil"]);
    expect(position()).toBeNull();
  });

  it("endereço encontrado vira a posição manual com o texto digitado", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "-20.6", lon: "-41.2" }],
    });
    const { result } = renderHook(() => useCourierPosition());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setFromText("  Rua Sete 50, Castelo  ");
    });

    expect(ok).toBe(true);
    expect(position()).toMatchObject({
      coords: { lat: -20.6, lng: -41.2 },
      source: "manual",
      label: "Rua Sete 50, Castelo",
    });
  });

  it("falha de rede não registra posição", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCourierPosition());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setFromText("Rua Sete 50");
    });

    expect(ok).toBe(false);
    expect(position()).toBeNull();
  });
});

describe("useCourierPosition - GPS sem resposta (LDMF-314)", () => {
  const getCurrentPosition = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    useCourierPositionStore.setState({ position: null });
    getCurrentPosition.mockReset();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
  });

  it("pedido de permissão sem resposta vira timeout em vez de travar", async () => {
    // Navegador que nunca chama nenhum callback.
    getCurrentPosition.mockImplementation(() => {});
    const { result } = renderHook(() => useCourierPosition());

    let outcome: Awaited<ReturnType<typeof result.current.resolvePosition>> | undefined;
    let pending: Promise<unknown>;
    act(() => {
      pending = result.current.resolvePosition().then((value) => {
        outcome = value;
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(19_999);
    });
    expect(outcome).toBeUndefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await pending;
    });
    expect(outcome).toEqual({ ok: false, reason: "timeout" });
    expect(result.current.isLocating).toBe(false);
  });

  it("resposta do navegador antes do teto vale, e o teto não sobrescreve", async () => {
    getCurrentPosition.mockImplementation((ok: PositionCallback) => {
      ok({ coords: { latitude: -20.6, longitude: -41.2 } } as GeolocationPosition);
    });
    const { result } = renderHook(() => useCourierPosition());

    let outcome: Awaited<ReturnType<typeof result.current.resolvePosition>> | undefined;
    await act(async () => {
      outcome = await result.current.resolvePosition();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(outcome).toMatchObject({ ok: true, position: { source: "gps" } });
    expect(position()?.coords).toEqual({ lat: -20.6, lng: -41.2 });
  });
});
