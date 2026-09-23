import { afterEach, describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

afterEach(() => {
  useUIStore.setState({
    isAuthModalOpen: false,
    isAddressModalOpen: false,
    isMenuItemModalOpen: false,
    isCategoryModalOpen: false,
    isGlobalLoading: false,
    loadingMessage: null,
  });
});

describe("useUIStore", () => {
  it("todos os modais começam fechados", () => {
    const state = useUIStore.getState();
    expect(state.isAuthModalOpen).toBe(false);
    expect(state.isAddressModalOpen).toBe(false);
    expect(state.isMenuItemModalOpen).toBe(false);
    expect(state.isCategoryModalOpen).toBe(false);
  });

  it("abre e fecha o modal de autenticação de forma independente dos outros", () => {
    useUIStore.getState().openAuthModal();
    expect(useUIStore.getState().isAuthModalOpen).toBe(true);
    expect(useUIStore.getState().isAddressModalOpen).toBe(false);

    useUIStore.getState().closeAuthModal();
    expect(useUIStore.getState().isAuthModalOpen).toBe(false);
  });

  it("abre e fecha o modal de endereço", () => {
    useUIStore.getState().openAddressModal();
    expect(useUIStore.getState().isAddressModalOpen).toBe(true);

    useUIStore.getState().closeAddressModal();
    expect(useUIStore.getState().isAddressModalOpen).toBe(false);
  });

  it("abre e fecha o modal de item de menu", () => {
    useUIStore.getState().openMenuItemModal();
    expect(useUIStore.getState().isMenuItemModalOpen).toBe(true);

    useUIStore.getState().closeMenuItemModal();
    expect(useUIStore.getState().isMenuItemModalOpen).toBe(false);
  });

  it("abre e fecha o modal de categoria", () => {
    useUIStore.getState().openCategoryModal();
    expect(useUIStore.getState().isCategoryModalOpen).toBe(true);

    useUIStore.getState().closeCategoryModal();
    expect(useUIStore.getState().isCategoryModalOpen).toBe(false);
  });

  it("setGlobalLoading liga o loading com uma mensagem opcional", () => {
    useUIStore.getState().setGlobalLoading(true, "Carregando pedido...");
    expect(useUIStore.getState()).toMatchObject({
      isGlobalLoading: true,
      loadingMessage: "Carregando pedido...",
    });
  });

  it("setGlobalLoading sem mensagem usa null", () => {
    useUIStore.getState().setGlobalLoading(true);
    expect(useUIStore.getState().loadingMessage).toBeNull();
  });

  it("clearLoading desliga o loading e limpa a mensagem", () => {
    useUIStore.getState().setGlobalLoading(true, "Carregando...");
    useUIStore.getState().clearLoading();

    expect(useUIStore.getState()).toMatchObject({
      isGlobalLoading: false,
      loadingMessage: null,
    });
  });
});
