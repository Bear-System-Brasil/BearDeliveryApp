import { beforeEach, describe, expect, it } from "vitest";
import {
  canAccessRoute,
  clearAuth,
  getStoredUser,
  getUserRoleLabel,
  hasAnyRole,
  hasValidToken,
  isAdmin,
  isClient,
  isOwner,
  isRestaurantStaff,
  saveToken,
  saveUser,
} from "./auth-helpers";
import { STORAGE_KEYS } from "./storage-manager";
import type { User } from "@/stores/auth-store";

function persistZustandAuth(user: Partial<User> | null, token = "token-123") {
  localStorage.setItem(
    STORAGE_KEYS.AUTH,
    JSON.stringify({ state: { token, user } }),
  );
}

const baseUser: User = {
  id: "u1",
  name: "Maria",
  email: "maria@example.com",
  cpf: "12345678900",
  phone: "11999999999",
  birthDate: "1990-01-01",
  role: "owner",
};

describe("hasValidToken", () => {
  beforeEach(() => localStorage.clear());

  it("é true quando há token no formato novo (Zustand persist)", () => {
    persistZustandAuth(baseUser, "abc");
    expect(hasValidToken()).toBe(true);
  });

  it("cai para o formato legado quando não há token no formato novo", () => {
    localStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN, "legacy-token");
    expect(hasValidToken()).toBe(true);
  });

  it("é false sem nenhum token salvo", () => {
    expect(hasValidToken()).toBe(false);
  });

  it("é false quando o token do formato novo é uma string vazia", () => {
    persistZustandAuth(baseUser, "");
    expect(hasValidToken()).toBe(false);
  });
});

describe("getStoredUser", () => {
  beforeEach(() => localStorage.clear());

  it("recupera o usuário do formato Zustand", () => {
    persistZustandAuth(baseUser);
    expect(getStoredUser()).toEqual(baseUser);
  });

  it("cai para o usuário legado quando não há usuário no formato novo", () => {
    localStorage.setItem(STORAGE_KEYS.LEGACY_USER, JSON.stringify(baseUser));
    expect(getStoredUser()).toEqual(baseUser);
  });

  it("retorna null sem dados salvos", () => {
    expect(getStoredUser()).toBeNull();
  });
});

describe("saveUser / saveToken", () => {
  beforeEach(() => localStorage.clear());

  it("são no-ops - não escrevem nada no storage (gerenciado só pelo Zustand)", () => {
    saveUser(baseUser);
    saveToken("um-token-qualquer");
    expect(localStorage.length).toBe(0);
  });
});

describe("clearAuth", () => {
  beforeEach(() => localStorage.clear());

  it("remove os dados de autenticação (novos e legados)", () => {
    persistZustandAuth(baseUser);
    localStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN, "x");

    clearAuth();

    expect(localStorage.getItem(STORAGE_KEYS.AUTH)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN)).toBeNull();
  });
});

describe("canAccessRoute", () => {
  beforeEach(() => localStorage.clear());

  it("usa a role do usuário salvo para checar permissão da rota", () => {
    persistZustandAuth({ ...baseUser, role: "owner" });
    expect(canAccessRoute("/company-profile")).toBe(true);
    expect(canAccessRoute("/cart")).toBe(false);
  });

  it("é false sem usuário logado", () => {
    expect(canAccessRoute("/company-profile")).toBe(false);
  });
});

describe("hasAnyRole", () => {
  beforeEach(() => localStorage.clear());

  it("é true quando a role do usuário está na lista", () => {
    persistZustandAuth({ ...baseUser, role: "cook" });
    expect(hasAnyRole(["owner", "cook"])).toBe(true);
  });

  it("é false quando a role não está na lista ou não há usuário", () => {
    persistZustandAuth({ ...baseUser, role: "client" });
    expect(hasAnyRole(["owner", "cook"])).toBe(false);

    localStorage.clear();
    expect(hasAnyRole(["owner"])).toBe(false);
  });
});

describe("getUserRoleLabel", () => {
  beforeEach(() => localStorage.clear());

  it("traduz a role salva para o rótulo em português", () => {
    persistZustandAuth({ ...baseUser, role: "delivery" });
    expect(getUserRoleLabel()).toBe("Entregador");
  });

  it("retorna 'Visitante' sem usuário logado", () => {
    expect(getUserRoleLabel()).toBe("Visitante");
  });

  it("retorna 'Usuário' para role desconhecida", () => {
    persistZustandAuth({ ...baseUser, role: "role-nova-sem-label" });
    expect(getUserRoleLabel()).toBe("Usuário");
  });
});

describe("isRestaurantStaff / isClient / isOwner / isAdmin", () => {
  beforeEach(() => localStorage.clear());

  it("isRestaurantStaff é true para owner/admin/manager", () => {
    persistZustandAuth({ ...baseUser, role: "manager" });
    expect(isRestaurantStaff()).toBe(true);
  });

  it("isClient só é true para role client", () => {
    persistZustandAuth({ ...baseUser, role: "client" });
    expect(isClient()).toBe(true);

    persistZustandAuth({ ...baseUser, role: "owner" });
    expect(isClient()).toBe(false);
  });

  it("isOwner e isAdmin distinguem as roles corretamente", () => {
    persistZustandAuth({ ...baseUser, role: "owner" });
    expect(isOwner()).toBe(true);
    expect(isAdmin()).toBe(false);

    persistZustandAuth({ ...baseUser, role: "admin" });
    expect(isOwner()).toBe(false);
    expect(isAdmin()).toBe(true);
  });
});
