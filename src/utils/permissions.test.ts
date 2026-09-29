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

/**
 * O menu passou a listar todas as areas de trabalho para quem administra o
 * restaurante - o primeiro cliente e uma pessoa so, que e dono, cozinheiro e
 * entregador. Item de menu que aponta pra rota que a role nao alcanca leva
 * direto pro "Acesso Negado", entao cada area listada precisa estar liberada
 * aqui. Estes testes travam esse par.
 */
describe("areas de trabalho das roles de gestao", () => {
  const AREAS = [
    "/menu-management",
    "/kitchen",
    "/order-management",
    "/delivery-dashboard",
    "/financial-management/dashboard",
  ];

  it.each(["owner", "admin", "manager"])("%s alcanca todas as areas", (role) => {
    for (const area of AREAS) {
      expect(hasRoutePermission(area, role)).toBe(true);
    }
  });

  it("a area de entregas continua aberta pro entregador", () => {
    expect(hasRoutePermission("/delivery-dashboard", "delivery")).toBe(true);
  });

  it("nao abre as demais areas pra quem faz uma coisa so", () => {
    // Estas roles continuam com um destino unico no menu, e o mapa tem de
    // dizer o mesmo - senao a lista de areas e a permissao divergem.
    expect(hasRoutePermission("/menu-management", "cook")).toBe(false);
    expect(hasRoutePermission("/delivery-dashboard", "cook")).toBe(false);
    expect(hasRoutePermission("/kitchen", "delivery")).toBe(false);
    expect(hasRoutePermission("/menu-management", "financial")).toBe(false);
    expect(hasRoutePermission("/delivery-dashboard", "financial")).toBe(false);
  });

  it("cliente nao entra em area de trabalho nenhuma", () => {
    for (const area of AREAS) {
      expect(hasRoutePermission(area, "client")).toBe(false);
    }
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
