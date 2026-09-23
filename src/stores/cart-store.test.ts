import { afterEach, describe, expect, it } from "vitest";
import {
  getDeliveryDiscount,
  getPromoDiscount,
  isValidPromoCode,
  useCartStore,
  type CartItem,
} from "./cart-store";

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "item-1",
    productId: "prod-1",
    name: "Feijoada",
    price: 35,
    quantity: 1,
    restaurantId: "rest-1",
    restaurantName: "Restaurante do Zé",
    ...overrides,
  };
}

afterEach(() => {
  useCartStore.setState(
    {
      items: [],
      restaurant: null,
      isOpen: false,
      orderId: null,
      isLoading: false,
      lastSynced: null,
      appliedPromo: null,
    },
    false,
  );
});

describe("isValidPromoCode", () => {
  it("aceita os cupons de demonstração conhecidos", () => {
    expect(isValidPromoCode("PRIMEIRA20")).toBe(true);
    expect(isValidPromoCode("FRETE10")).toBe(true);
  });

  it("rejeita qualquer outro código", () => {
    expect(isValidPromoCode("QUALQUERCOISA")).toBe(false);
    expect(isValidPromoCode("")).toBe(false);
  });
});

describe("getPromoDiscount", () => {
  it("dá 20% de desconto no subtotal para PRIMEIRA20", () => {
    expect(getPromoDiscount("PRIMEIRA20", 100)).toBe(20);
  });

  it("não dá desconto pra outros cupons, inclusive FRETE10 e null", () => {
    expect(getPromoDiscount("FRETE10", 100)).toBe(0);
    expect(getPromoDiscount(null, 100)).toBe(0);
  });
});

describe("getDeliveryDiscount", () => {
  it("desconta até R$10 da entrega com FRETE10", () => {
    expect(getDeliveryDiscount("FRETE10", 15)).toBe(10);
  });

  it("não desconta mais do que a própria taxa de entrega", () => {
    expect(getDeliveryDiscount("FRETE10", 5)).toBe(5);
  });

  it("não dá desconto pra outros cupons, inclusive PRIMEIRA20 e null", () => {
    expect(getDeliveryDiscount("PRIMEIRA20", 15)).toBe(0);
    expect(getDeliveryDiscount(null, 15)).toBe(0);
  });
});

describe("useCartStore", () => {
  it("getTotalItems soma a quantidade de todas as linhas", () => {
    useCartStore.getState().setItems([
      makeItem({ id: "a", quantity: 2 }),
      makeItem({ id: "b", quantity: 3 }),
    ]);
    expect(useCartStore.getState().getTotalItems()).toBe(5);
  });

  it("getSubtotal soma preço × quantidade de cada linha", () => {
    useCartStore.getState().setItems([
      makeItem({ id: "a", price: 35, quantity: 2 }),
      makeItem({ id: "b", price: 10, quantity: 1 }),
    ]);
    expect(useCartStore.getState().getSubtotal()).toBe(80);
  });

  it("getTotalPrice é um alias depreciado de getSubtotal", () => {
    useCartStore.getState().setItems([makeItem({ price: 35, quantity: 2 })]);
    expect(useCartStore.getState().getTotalPrice()).toBe(
      useCartStore.getState().getSubtotal(),
    );
  });

  it("getTotal soma o subtotal com a taxa de entrega recebida", () => {
    useCartStore.getState().setItems([makeItem({ price: 35, quantity: 2 })]);
    expect(useCartStore.getState().getTotal(8)).toBe(78);
  });

  it("getTotal sem taxa de entrega equivale ao subtotal", () => {
    useCartStore.getState().setItems([makeItem({ price: 35, quantity: 2 })]);
    expect(useCartStore.getState().getTotal()).toBe(70);
  });

  it("setRestaurant / setOrderId / setLoading / setAppliedPromo atualizam o estado", () => {
    const restaurant = { id: "rest-1", name: "Restaurante do Zé" };
    useCartStore.getState().setRestaurant(restaurant);
    useCartStore.getState().setOrderId("order-1");
    useCartStore.getState().setLoading(true);
    useCartStore.getState().setAppliedPromo("PRIMEIRA20");

    const state = useCartStore.getState();
    expect(state.restaurant).toEqual(restaurant);
    expect(state.orderId).toBe("order-1");
    expect(state.isLoading).toBe(true);
    expect(state.appliedPromo).toBe("PRIMEIRA20");
  });

  it("clearCart reseta itens, pedido, restaurante e cupom, mas não fecha o carrinho", () => {
    useCartStore.getState().setItems([makeItem()]);
    useCartStore.getState().setRestaurant({ id: "rest-1", name: "Restaurante do Zé" });
    useCartStore.getState().setOrderId("order-1");
    useCartStore.getState().setAppliedPromo("FRETE10");
    useCartStore.getState().openCart();

    useCartStore.getState().clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.restaurant).toBeNull();
    expect(state.orderId).toBeNull();
    expect(state.appliedPromo).toBeNull();
    expect(state.isOpen).toBe(true);
  });

  it("openCart / closeCart / toggleCart controlam a visibilidade do carrinho", () => {
    expect(useCartStore.getState().isOpen).toBe(false);

    useCartStore.getState().openCart();
    expect(useCartStore.getState().isOpen).toBe(true);

    useCartStore.getState().closeCart();
    expect(useCartStore.getState().isOpen).toBe(false);

    useCartStore.getState().toggleCart();
    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("markSynced registra o horário atual da sincronização", () => {
    expect(useCartStore.getState().lastSynced).toBeNull();
    useCartStore.getState().markSynced();
    expect(useCartStore.getState().lastSynced).toEqual(expect.any(Number));
  });
});
