import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { normalizeAuthUser, useAuthStore, type User } from "./auth-store";
import { STORAGE_KEYS } from "@/utils/storage-manager";
import type { RawAuthUser } from "@/services/api";

const initialState = useAuthStore.getState();

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(initialState, true);
  });

  it("começa deslogado", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("login autentica o usuário e desliga o loading", () => {
    const user: User = {
      id: "1",
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
      birthDate: "1990-01-01",
      role: "client",
    };

    act(() => {
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().login(user);
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("logout limpa usuário e autenticação", () => {
    const user: User = {
      id: "1",
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
      birthDate: "1990-01-01",
      role: "client",
    };

    act(() => {
      useAuthStore.getState().login(user);
      useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("updateUser faz merge parcial sem perder os outros campos", () => {
    const user: User = {
      id: "1",
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
      birthDate: "1990-01-01",
      role: "client",
    };

    act(() => {
      useAuthStore.getState().login(user);
      useAuthStore.getState().updateUser({ name: "Maria Silva" });
    });

    expect(useAuthStore.getState().user).toEqual({ ...user, name: "Maria Silva" });
  });

  it("updateUser não faz nada quando não há usuário logado", () => {
    act(() => {
      useAuthStore.getState().updateUser({ name: "Fantasma" });
    });

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("persiste user/isAuthenticated no localStorage, mas não isLoading", () => {
    const user: User = {
      id: "1",
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
      birthDate: "1990-01-01",
      role: "client",
    };

    act(() => {
      useAuthStore.getState().login(user);
    });

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) ?? "{}");
    expect(persisted.state.user).toEqual(user);
    expect(persisted.state.isAuthenticated).toBe(true);
    expect(persisted.state.isLoading).toBeUndefined();
  });
});

describe("normalizeAuthUser", () => {
  const baseRaw: RawAuthUser = {
    id: "u1",
    email: "user@example.com",
  };

  it("mapeia cliente (role ausente cai para 'client') com os campos de pessoa física", () => {
    const raw: RawAuthUser = { ...baseRaw, name: "João", cpf: "11122233344" };
    const user = normalizeAuthUser(raw);

    expect(user).toEqual({
      id: "u1",
      name: "João",
      email: "user@example.com",
      cpf: "11122233344",
      phone: "",
      birthDate: "",
      role: "client",
      companyId: undefined,
      photoUrl: undefined,
    });
  });

  it("mapeia usuário de empresa usando tradeName > legalName > name, e cnpj no lugar de cpf", () => {
    const raw: RawAuthUser = {
      ...baseRaw,
      role: "owner",
      tradeName: "Pizzaria do João",
      legalName: "João Pizzas ME",
      cnpj: "12345678000199",
      companyId: "company-1",
    };

    const user = normalizeAuthUser(raw);

    expect(user.name).toBe("Pizzaria do João");
    expect(user.cpf).toBe("12345678000199");
    expect(user.companyId).toBe("company-1");
  });

  it("usuário de empresa sem tradeName cai para legalName, depois para name, depois 'Empresa'", () => {
    expect(normalizeAuthUser({ ...baseRaw, role: "manager", legalName: "Legal Co" }).name).toBe(
      "Legal Co",
    );
    expect(normalizeAuthUser({ ...baseRaw, role: "manager", name: "Nome Cru" }).name).toBe(
      "Nome Cru",
    );
    expect(normalizeAuthUser({ ...baseRaw, role: "manager" }).name).toBe("Empresa");
  });

  it("usuário de empresa usa logo_url como fallback de photoUrl", () => {
    const user = normalizeAuthUser({
      ...baseRaw,
      role: "cook",
      logo_url: "https://cdn/logo.png",
    });
    expect(user.photoUrl).toBe("https://cdn/logo.png");
  });

  it("trata 'delivery' como role de empresa (isCompanyUser)", () => {
    const user = normalizeAuthUser({ ...baseRaw, role: "delivery", tradeName: "Frota X" });
    expect(user.cpf).toBe(""); // sem cnpj/cpf informado, mesmo sendo "empresa"
    expect(user.name).toBe("Frota X");
  });

  it("companyId ausente/vazio vira undefined, não string vazia", () => {
    expect(normalizeAuthUser({ ...baseRaw, companyId: "" }).companyId).toBeUndefined();
    expect(normalizeAuthUser({ ...baseRaw, companyId: null }).companyId).toBeUndefined();
  });
});
