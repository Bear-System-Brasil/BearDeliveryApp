import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, type User } from "./auth-store";
import { useCartStore } from "./cart-store";
import { STORAGE_KEYS } from "@/utils/storage-manager";

const initialAuthState = useAuthStore.getState();
const initialCartState = useCartStore.getState();

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

// Carrinho montado como o useCartActions monta depois de adicionar um item.
function fillCart(orderId: string) {
  const cart = useCartStore.getState();
  cart.setOrderId(orderId);
  cart.setRestaurant({ id: "rest-1", name: "Pizzaria" });
  cart.setAppliedPromo("PRIMEIRA20");
  cart.setItems([
    {
      id: "prod-1::::",
      productId: "prod-1",
      name: "Pizza",
      price: 30,
      quantity: 2,
      restaurantId: "rest-1",
      restaurantName: "Pizzaria",
    },
  ]);
}

function persistedOrderId() {
  const raw = localStorage.getItem(STORAGE_KEYS.CART_ORDER_ID);
  return raw ? JSON.parse(raw).state.orderId : undefined;
}

describe("carrinho x sessão (LDMF-239)", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(initialAuthState, true);
    useCartStore.setState(initialCartState, true);
  });

  it("logout limpa itens, pedido, restaurante e cupom - em memória e no localStorage", () => {
    useAuthStore.getState().login(makeUser("user-a"));
    fillCart("cart:user-a");

    useAuthStore.getState().logout();

    const cart = useCartStore.getState();
    expect(cart.items).toEqual([]);
    expect(cart.orderId).toBeNull();
    expect(cart.restaurant).toBeNull();
    expect(cart.appliedPromo).toBeNull();
    expect(persistedOrderId()).toBeNull();
  });

  it("conta B entrando depois da A não herda o carrinho da A", () => {
    useAuthStore.getState().login(makeUser("user-a"));
    fillCart("cart:user-a");
    useAuthStore.getState().logout();

    useAuthStore.getState().login(makeUser("user-b"));

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().orderId).toBeNull();
  });

  it("troca direta de conta, sem passar pelo logout, também limpa", () => {
    useAuthStore.getState().login(makeUser("user-a"));
    fillCart("cart:user-a");

    useAuthStore.getState().login(makeUser("user-b"));

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().orderId).toBeNull();
  });

  it("a mesma conta mantém o carrinho em atualizações do usuário", () => {
    useAuthStore.getState().login(makeUser("user-a"));
    fillCart("cart:user-a");

    useAuthStore.getState().updateUser({ name: "Outro nome" });
    useAuthStore.getState().login(makeUser("user-a"));

    expect(useCartStore.getState().orderId).toBe("cart:user-a");
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe("carrinho x sessão no boot (LDMF-239)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  function persistSession(authUserId: string, cart: Record<string, unknown>) {
    localStorage.setItem(
      STORAGE_KEYS.AUTH,
      JSON.stringify({
        state: { user: makeUser(authUserId), isAuthenticated: true },
        version: 1,
      }),
    );
    localStorage.setItem(
      STORAGE_KEYS.CART_ORDER_ID,
      JSON.stringify({ state: cart, version: 0 }),
    );
  }

  it("descarta orderId persistido de outra conta", async () => {
    persistSession("user-b", { orderId: "cart:user-a", ownerId: "user-a" });

    const { useCartStore: freshCart } = await import("./cart-store");

    expect(freshCart.getState().orderId).toBeNull();
    expect(freshCart.getState().ownerId).toBe("user-b");
  });

  it("mantém orderId persistido da própria conta", async () => {
    persistSession("user-a", { orderId: "cart:user-a", ownerId: "user-a" });

    const { useCartStore: freshCart } = await import("./cart-store");

    expect(freshCart.getState().orderId).toBe("cart:user-a");
  });

  it("descarta orderId gravado antes de existir dono - não dá pra saber de quem é", async () => {
    persistSession("user-b", { orderId: "cart:user-a" });

    const { useCartStore: freshCart } = await import("./cart-store");

    expect(freshCart.getState().orderId).toBeNull();
  });
});
