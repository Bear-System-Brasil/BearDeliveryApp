import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, type User } from "./auth-store";
import { useFavoritesStore, VISITOR_KEY } from "./favorites-store";
import { STORAGE_KEYS } from "@/utils/storage-manager";

const initialAuthState = useAuthStore.getState();

function makeUser(id: string): User {
  return {
    id,
    name: `Cliente ${id}`,
    email: `${id}@example.com`,
    cpf: "",
    phone: "",
    birthDate: "",
    role: "client",
  };
}

function persisted() {
  const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
  return raw ? JSON.parse(raw) : null;
}

const favorites = () => useFavoritesStore.getState().favorites;

beforeEach(() => {
  useAuthStore.setState(initialAuthState, true);
  useFavoritesStore.setState({ favorites: [], byUser: {}, ownerId: null });
  localStorage.clear();
});

afterEach(() => {
  useAuthStore.getState().logout();
  localStorage.clear();
});

describe("useFavoritesStore", () => {
  it("começa sem favoritos", () => {
    expect(favorites()).toEqual([]);
  });

  it("addFavorite adiciona um restaurante e evita duplicar", () => {
    useFavoritesStore.getState().addFavorite("rest-1");
    useFavoritesStore.getState().addFavorite("rest-1");

    expect(favorites()).toEqual(["rest-1"]);
  });

  it("removeFavorite remove só o restaurante indicado", () => {
    useFavoritesStore.getState().addFavorite("rest-1");
    useFavoritesStore.getState().addFavorite("rest-2");

    useFavoritesStore.getState().removeFavorite("rest-1");

    expect(favorites()).toEqual(["rest-2"]);
  });

  it("toggleFavorite adiciona quando não é favorito e remove quando já é", () => {
    useFavoritesStore.getState().toggleFavorite("rest-1");
    expect(favorites()).toEqual(["rest-1"]);

    useFavoritesStore.getState().toggleFavorite("rest-1");
    expect(favorites()).toEqual([]);
  });

  it("isFavorite reflete o estado atual", () => {
    expect(useFavoritesStore.getState().isFavorite("rest-1")).toBe(false);

    useFavoritesStore.getState().addFavorite("rest-1");
    expect(useFavoritesStore.getState().isFavorite("rest-1")).toBe(true);
  });

  it("clearFavorites esvazia a lista", () => {
    useFavoritesStore.getState().addFavorite("rest-1");
    useFavoritesStore.getState().addFavorite("rest-2");

    useFavoritesStore.getState().clearFavorites();

    expect(favorites()).toEqual([]);
  });

  it("persiste os favoritos no localStorage, na lista da conta", () => {
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-1");

    expect(persisted().state.byUser).toEqual({ a: ["rest-1"] });
  });
});

describe("favoritos x sessão (LDMF-244)", () => {
  it("conta B não vê os favoritos da A", () => {
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-a");
    useAuthStore.getState().logout();

    useAuthStore.getState().login(makeUser("b"));

    expect(favorites()).toEqual([]);
  });

  it("troca direta de conta, sem passar pelo logout, também separa", () => {
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-a");

    useAuthStore.getState().login(makeUser("b"));

    expect(favorites()).toEqual([]);
  });

  it("conta A reencontra os próprios favoritos ao voltar", () => {
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-a");
    useAuthStore.getState().logout();
    useAuthStore.getState().login(makeUser("b"));
    useFavoritesStore.getState().addFavorite("rest-b");
    useAuthStore.getState().logout();

    useAuthStore.getState().login(makeUser("a"));

    expect(favorites()).toEqual(["rest-a"]);
  });

  it("logout não mostra os favoritos da conta que saiu", () => {
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-a");

    useAuthStore.getState().logout();

    expect(favorites()).toEqual([]);
  });

  it("favoritos de antes do login ficam com a conta que entra, e só com ela", () => {
    useFavoritesStore.getState().addFavorite("rest-visitante");
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-a");

    expect(favorites()).toEqual(["rest-visitante", "rest-a"]);

    useAuthStore.getState().logout();
    expect(favorites()).toEqual([]);

    useAuthStore.getState().login(makeUser("b"));
    expect(favorites()).toEqual([]);
    expect(persisted().state.byUser[VISITOR_KEY]).toBeUndefined();
  });

  it("atualizar o perfil da mesma conta mantém os favoritos", () => {
    useAuthStore.getState().login(makeUser("a"));
    useFavoritesStore.getState().addFavorite("rest-a");

    useAuthStore.getState().updateUser({ name: "Novo nome" });

    expect(favorites()).toEqual(["rest-a"]);
  });
});

describe("migração da lista sem dono (v1)", () => {
  // Recarrega os módulos pra hidratar a partir do localStorage, como no boot
  async function boot(auth: User | null) {
    localStorage.setItem(
      STORAGE_KEYS.FAVORITES,
      JSON.stringify({ state: { favorites: ["rest-antigo"] }, version: 1 }),
    );
    if (auth) {
      localStorage.setItem(
        STORAGE_KEYS.AUTH,
        JSON.stringify({
          state: { user: auth, isAuthenticated: true },
          version: 1,
        }),
      );
    }
    vi.resetModules();
    const { useFavoritesStore: fresh } = await import("./favorites-store");
    return fresh.getState();
  }

  it("fica com a conta logada no boot", async () => {
    const state = await boot(makeUser("a"));

    expect(state.favorites).toEqual(["rest-antigo"]);
    expect(state.byUser).toEqual({ a: ["rest-antigo"] });
  });

  it("sem ninguém logado, é descartada", async () => {
    const state = await boot(null);

    expect(state.favorites).toEqual([]);
    expect(state.byUser).toEqual({});
  });
});
