import { describe, expect, it } from "vitest";
import {
  getAccessibleRoutes,
  hasRoutePermission,
  isClient,
  isRestaurantStaff,
} from "./permissions";

describe("hasRoutePermission", () => {
  it("permite quando o role está na lista da rota", () => {
    expect(hasRoutePermission("/menu-management", "owner")).toBe(true);
    expect(hasRoutePermission("/cart", "client")).toBe(true);
  });

  it("nega quando o role não está na lista da rota", () => {
    expect(hasRoutePermission("/menu-management", "client")).toBe(false);
    expect(hasRoutePermission("/cart", "cook")).toBe(false);
  });

  it("bloqueia por padrão uma rota não mapeada (segurança)", () => {
    expect(hasRoutePermission("/rota-inexistente", "owner")).toBe(false);
  });

  it("resolve rotas com segmento dinâmico contra o pathname real", () => {
    expect(hasRoutePermission("/restaurant/abc123", "client")).toBe(true);
    expect(hasRoutePermission("/restaurant/abc123", "cook")).toBe(true);
  });

  it("não confunde rota dinâmica com uma de tamanho diferente", () => {
    expect(hasRoutePermission("/restaurant/abc123/delivery", "client")).toBe(false);
  });
});

describe("getAccessibleRoutes", () => {
  it("retorna só as rotas cujo role tem acesso", () => {
    const routes = getAccessibleRoutes("financial");
    expect(routes).toContain("/financial-management");
    expect(routes).toContain("/financial-management/cash-register");
    expect(routes).not.toContain("/menu-management");
  });
});

describe("isRestaurantStaff / isClient", () => {
  it("identifica staff administrativo (owner, admin, manager)", () => {
    expect(isRestaurantStaff("owner")).toBe(true);
    expect(isRestaurantStaff("manager")).toBe(true);
    expect(isRestaurantStaff("cook")).toBe(false);
  });

  it("identifica cliente", () => {
    expect(isClient("client")).toBe(true);
    expect(isClient("owner")).toBe(false);
  });
});
