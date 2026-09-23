import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getDeliveryDiscount,
  getPromoDiscount,
  isValidPromoCode,
  useCartStore,
  type CartItem,
} from "./cart-store";

const initialState = useCartStore.getState();

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "line-1",
    productId: "product-1",
    name: "Feijoada",
    price: 35,
    quantity: 1,
    restaurantId: "r1",
    restaurantName: "Casa da Feijoada",
    ...overrides,
  };
}

describe("useCartStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState(initialState, true);
  });

  it("começa vazio e fechado", () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.isOpen).toBe(false);
    expect(state.getSubtotal()).toBe(0);
  });

  it("getSubtotal soma preço × quantidade de todos os itens", () => {
    act(() => {
      useCartStore.getState().setItems([
        makeItem({ id: "a", price: 10, quantity: 2 }),
        makeItem({ id: "b", price: 5, quantity: 3 }),
      ]);
    });

    expect(useCartStore.getState().getSubtotal()).toBe(35);
  });

  it("getTotalItems soma as quantidades, não a contagem de linhas", () => {
    act(() => {
      useCartStore.getState().setItems([
        makeItem({ id: "a", quantity: 2 }),
        makeItem({ id: "b", quantity: 3 }),
      ]);
    });

    expect(useCartStore.getState().getTotalItems()).toBe(5);
  });

  it("getTotal soma o frete ao subtotal, e usa 0 quando omitido", () => {
    act(() => {
      useCartStore.getState().setItems([makeItem({ price: 20, quantity: 1 })]);
    });

    expect(useCartStore.getState().getTotal()).toBe(20);
    expect(useCartStore.getState().getTotal(8)).toBe(28);
  });

  it("getTotalPrice (deprecated) é sinônimo de getSubtotal", () => {
    act(() => {
      useCartStore.getState().setItems([makeItem({ price: 12, quantity: 2 })]);
    });

    expect(useCartStore.getState().getTotalPrice()).toBe(
      useCartStore.getState().getSubtotal(),
    );
  });

  it("clearCart zera itens, orderId, restaurante e promo aplicada", () => {
    act(() => {
      useCartStore.getState().setItems([makeItem()]);
      useCartStore.getState().setOrderId("order-1");
      useCartStore.getState().setRestaurant({ id: "r1", name: "Casa" });
      useCartStore.getState().setAppliedPromo("PRIMEIRA20");
      useCartStore.getState().clearCart();
    });

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.orderId).toBeNull();
    expect(state.restaurant).toBeNull();
    expect(state.appliedPromo).toBeNull();
  });

  it("toggleCart/openCart/closeCart controlam isOpen", () => {
    act(() => useCartStore.getState().openCart());
    expect(useCartStore.getState().isOpen).toBe(true);

    act(() => useCartStore.getState().toggleCart());
    expect(useCartStore.getState().isOpen).toBe(false);

    act(() => useCartStore.getState().openCart());
    act(() => useCartStore.getState().closeCart());
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("persiste somente o orderId no localStorage (não os itens)", () => {
    act(() => {
      useCartStore.getState().setItems([makeItem()]);
      useCartStore.getState().setOrderId("order-42");
    });

    const persisted = JSON.parse(
      localStorage.getItem("cart-order-id") ?? "{}",
    );
    expect(persisted.state.orderId).toBe("order-42");
    expect(persisted.state.items).toBeUndefined();
  });
});

describe("isValidPromoCode", () => {
  it("reconhece os códigos válidos", () => {
    expect(isValidPromoCode("PRIMEIRA20")).toBe(true);
    expect(isValidPromoCode("FRETE10")).toBe(true);
  });

  it("rejeita código desconhecido ou com case diferente", () => {
    expect(isValidPromoCode("primeira20")).toBe(false);
    expect(isValidPromoCode("QUALQUERCOISA")).toBe(false);
  });
});

describe("getPromoDiscount", () => {
  it("dá 20% de desconto no subtotal com PRIMEIRA20", () => {
    expect(getPromoDiscount("PRIMEIRA20", 100)).toBe(20);
  });

  it("não dá desconto sem promo ou com promo que não afeta o subtotal", () => {
    expect(getPromoDiscount(null, 100)).toBe(0);
    expect(getPromoDiscount("FRETE10", 100)).toBe(0);
  });
});

describe("getDeliveryDiscount", () => {
  it("desconta até R$10 do frete com FRETE10", () => {
    expect(getDeliveryDiscount("FRETE10", 15)).toBe(10);
  });

  it("não desconta mais do que o próprio valor do frete", () => {
    expect(getDeliveryDiscount("FRETE10", 5)).toBe(5);
  });

  it("não desconta sem promo ou com promo que não afeta o frete", () => {
    expect(getDeliveryDiscount(null, 15)).toBe(0);
    expect(getDeliveryDiscount("PRIMEIRA20", 15)).toBe(0);
  });
});
