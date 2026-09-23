import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useFavoritesStore } from "./favorites-store";

const initialState = useFavoritesStore.getState();

describe("useFavoritesStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState(initialState, true);
  });

  it("começa sem favoritos", () => {
    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it("addFavorite adiciona e isFavorite reflete o estado atual", () => {
    act(() => useFavoritesStore.getState().addFavorite("r1"));

    expect(useFavoritesStore.getState().favorites).toEqual(["r1"]);
    expect(useFavoritesStore.getState().isFavorite("r1")).toBe(true);
    expect(useFavoritesStore.getState().isFavorite("r2")).toBe(false);
  });

  it("addFavorite não duplica o mesmo id", () => {
    act(() => {
      useFavoritesStore.getState().addFavorite("r1");
      useFavoritesStore.getState().addFavorite("r1");
    });

    expect(useFavoritesStore.getState().favorites).toEqual(["r1"]);
  });

  it("removeFavorite remove só o id indicado", () => {
    act(() => {
      useFavoritesStore.getState().addFavorite("r1");
      useFavoritesStore.getState().addFavorite("r2");
      useFavoritesStore.getState().removeFavorite("r1");
    });

    expect(useFavoritesStore.getState().favorites).toEqual(["r2"]);
  });

  it("toggleFavorite adiciona quando ausente e remove quando presente", () => {
    act(() => useFavoritesStore.getState().toggleFavorite("r1"));
    expect(useFavoritesStore.getState().favorites).toEqual(["r1"]);

    act(() => useFavoritesStore.getState().toggleFavorite("r1"));
    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it("clearFavorites esvazia a lista", () => {
    act(() => {
      useFavoritesStore.getState().addFavorite("r1");
      useFavoritesStore.getState().addFavorite("r2");
      useFavoritesStore.getState().clearFavorites();
    });

    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it("persiste a lista de favoritos no localStorage", () => {
    act(() => useFavoritesStore.getState().addFavorite("r1"));

    const persisted = JSON.parse(
      localStorage.getItem("like-delivery-favorites") ?? "{}",
    );
    expect(persisted.state.favorites).toEqual(["r1"]);
  });
});
