import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

const initialState = useUIStore.getState();

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState(initialState, true);
  });

  it("começa com todos os modais fechados e sem loading", () => {
    const state = useUIStore.getState();
    expect(state.isAuthModalOpen).toBe(false);
    expect(state.isAddressModalOpen).toBe(false);
    expect(state.isMenuItemModalOpen).toBe(false);
    expect(state.isCategoryModalOpen).toBe(false);
    expect(state.isGlobalLoading).toBe(false);
    expect(state.loadingMessage).toBeNull();
  });

  it.each([
    ["Auth", "openAuthModal", "closeAuthModal", "isAuthModalOpen"],
    ["Address", "openAddressModal", "closeAddressModal", "isAddressModalOpen"],
    ["MenuItem", "openMenuItemModal", "closeMenuItemModal", "isMenuItemModalOpen"],
    ["Category", "openCategoryModal", "closeCategoryModal", "isCategoryModalOpen"],
  ] as const)("abre e fecha o modal de %s de forma independente dos outros", (_label, openKey, closeKey, flagKey) => {
    act(() => useUIStore.getState()[openKey]());
    expect(useUIStore.getState()[flagKey]).toBe(true);

    // os outros modais continuam intocados
    const others = (["isAuthModalOpen", "isAddressModalOpen", "isMenuItemModalOpen", "isCategoryModalOpen"] as const).filter(
      (k) => k !== flagKey,
    );
    for (const other of others) {
      expect(useUIStore.getState()[other]).toBe(false);
    }

    act(() => useUIStore.getState()[closeKey]());
    expect(useUIStore.getState()[flagKey]).toBe(false);
  });

  it("setGlobalLoading liga o loading com mensagem opcional", () => {
    act(() => useUIStore.getState().setGlobalLoading(true, "Carregando pedido..."));

    const state = useUIStore.getState();
    expect(state.isGlobalLoading).toBe(true);
    expect(state.loadingMessage).toBe("Carregando pedido...");
  });

  it("setGlobalLoading sem mensagem zera loadingMessage (null, não undefined)", () => {
    act(() => {
      useUIStore.getState().setGlobalLoading(true, "Mensagem antiga");
      useUIStore.getState().setGlobalLoading(true);
    });

    expect(useUIStore.getState().loadingMessage).toBeNull();
  });

  it("clearLoading desliga o loading e limpa a mensagem", () => {
    act(() => {
      useUIStore.getState().setGlobalLoading(true, "Enviando...");
      useUIStore.getState().clearLoading();
    });

    const state = useUIStore.getState();
    expect(state.isGlobalLoading).toBe(false);
    expect(state.loadingMessage).toBeNull();
  });
});
