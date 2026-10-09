import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeEndpoint, reportApiFailure } from "./monitoring";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

const ORDER_ID = "3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b";

describe("normalizeEndpoint", () => {
  it("troca uuid, chave de carrinho e numero por :id", () => {
    expect(normalizeEndpoint(`/order/${ORDER_ID}`)).toBe("/order/:id");
    expect(normalizeEndpoint("/order/cart:abc")).toBe("/order/:id");
    expect(normalizeEndpoint("/delivery/42/status")).toBe("/delivery/:id/status");
  });

  it("descarta a query string", () => {
    expect(normalizeEndpoint("/company?lat=-3.1&lng=-60.0")).toBe("/company");
  });
});

describe("reportApiFailure", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureMessage).mockClear();
  });

  it("reporta 5xx em qualquer rota", () => {
    reportApiFailure({ method: "GET", endpoint: "/company", status: 503 });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "API GET /company falhou (503)",
      expect.objectContaining({
        tags: expect.objectContaining({ "api.status": "503" }),
      }),
    );
  });

  it("ignora 4xx e falha de rede fora da finalizacao", () => {
    reportApiFailure({ method: "POST", endpoint: "/address/me", status: 400 });
    reportApiFailure({ method: "GET", endpoint: "/company" });

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("reporta 4xx e falha de rede ao finalizar pedido", () => {
    reportApiFailure({
      method: "POST",
      endpoint: `/order/${ORDER_ID}`,
      status: 400,
      message: "Estoque insuficiente",
    });
    reportApiFailure({ method: "POST", endpoint: `/order/${ORDER_ID}` });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(2);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "API POST /order/:id falhou (400)",
      expect.objectContaining({ extra: { serverMessage: "Estoque insuficiente" } }),
    );
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "API POST /order/:id falhou (rede)",
      expect.anything(),
    );
  });

  it("ignora 401 ao finalizar (sessao expirada tem fluxo proprio)", () => {
    reportApiFailure({ method: "POST", endpoint: `/order/${ORDER_ID}`, status: 401 });

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("nao confunde abrir carrinho (POST /order) com finalizar", () => {
    reportApiFailure({ method: "POST", endpoint: "/order", status: 400 });

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
