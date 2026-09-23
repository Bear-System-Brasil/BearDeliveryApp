import { describe, expect, it } from "vitest";
import {
  getAccessibleRoutes,
  hasRoutePermission,
  isClient,
  isRestaurantStaff,
  ROUTE_PERMISSIONS,
  USER_ROLES,
} from "./permissions";

describe("hasRoutePermission", () => {
  it("permite quando a role está na lista da rota", () => {
    expect(hasRoutePermission("/menu-management", "owner")).toBe(true);
  });

  it("bloqueia quando a role não está na lista da rota", () => {
    expect(hasRoutePermission("/menu-management", "client")).toBe(false);
  });

  it("bloqueia por padrão rota não mapeada, por segurança", () => {
    expect(hasRoutePermission("/rota-inexistente", "owner")).toBe(false);
  });

  it("resolve segmento dinâmico [id] contra pathname real", () => {
    expect(hasRoutePermission("/restaurant/abc123", "client")).toBe(true);
    expect(hasRoutePermission("/restaurant/abc123", "cook")).toBe(true);
  });

  it("não confunde rota dinâmica com número de segmentos diferente", () => {
    // /restaurant/[id] tem 2 segmentos; /restaurant/abc/extra tem 3
    expect(hasRoutePermission("/restaurant/abc/extra", "client")).toBe(false);
  });

  it("dá acesso ao financeiro em todas as telas de financial-management", () => {
    for (const route of Object.keys(ROUTE_PERMISSIONS)) {
      if (route.startsWith("/financial-management")) {
        expect(hasRoutePermission(route, "financial")).toBe(true);
      }
    }
  });
});

describe("getAccessibleRoutes", () => {
  it("retorna todas as rotas cujo mapa inclui a role", () => {
    const routes = getAccessibleRoutes("cook");
    expect(routes).toContain("/kitchen");
    expect(routes).toContain("/order-management");
    expect(routes).not.toContain("/company-profile");
  });

  it("retorna lista vazia para role sem nenhuma rota mapeada", () => {
    expect(getAccessibleRoutes("role-que-nao-existe")).toEqual([]);
  });
});

describe("isRestaurantStaff / isClient", () => {
  it("reconhece owner, admin e manager como staff administrativo", () => {
    expect(isRestaurantStaff(USER_ROLES.OWNER)).toBe(true);
    expect(isRestaurantStaff(USER_ROLES.ADMIN)).toBe(true);
    expect(isRestaurantStaff(USER_ROLES.MANAGER)).toBe(true);
  });

  it("não considera cook/delivery/financial como staff administrativo", () => {
    expect(isRestaurantStaff(USER_ROLES.COOK)).toBe(false);
    expect(isRestaurantStaff(USER_ROLES.DELIVERY)).toBe(false);
    expect(isRestaurantStaff(USER_ROLES.FINANCIAL)).toBe(false);
  });

  it("identifica client", () => {
    expect(isClient(USER_ROLES.CLIENT)).toBe(true);
    expect(isClient(USER_ROLES.OWNER)).toBe(false);
  });
});
