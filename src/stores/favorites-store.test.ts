import { afterEach, describe, expect, it } from "vitest";
import { useFavoritesStore } from "./favorites-store";

afterEach(() => {
  useFavoritesStore.setState({ favorites: [] });
  localStorage.clear();
});

describe("useFavoritesStore", () => {
  it("começa sem favoritos", () => {
    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it("addFavorite adiciona um restaurante e evita duplicar", () => {
    useFavoritesStore.getState().addFavorite("rest-1");
    useFavoritesStore.getState().addFavorite("rest-1");

    expect(useFavoritesStore.getState().favorites).toEqual(["rest-1"]);
  });

  it("removeFavorite remove só o restaurante indicado", () => {
    useFavoritesStore.getState().addFavorite("rest-1");
    useFavoritesStore.getState().addFavorite("rest-2");

    useFavoritesStore.getState().removeFavorite("rest-1");

    expect(useFavoritesStore.getState().favorites).toEqual(["rest-2"]);
  });

  it("toggleFavorite adiciona quando não é favorito e remove quando já é", () => {
    useFavoritesStore.getState().toggleFavorite("rest-1");
    expect(useFavoritesStore.getState().favorites).toEqual(["rest-1"]);

    useFavoritesStore.getState().toggleFavorite("rest-1");
    expect(useFavoritesStore.getState().favorites).toEqual([]);
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

    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it("persiste os favoritos no localStorage", () => {
    useFavoritesStore.getState().addFavorite("rest-1");

    const raw = localStorage.getItem("like-delivery-favorites");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.favorites).toEqual(["rest-1"]);
  });
});
