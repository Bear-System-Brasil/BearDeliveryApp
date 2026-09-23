import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { useCartActions } from "./use-cart-actions";
import { apiService, type Order } from "@/services/api";
import { toast } from "sonner";

// Os testes só leem o id do pedido; o resto do Order não importa aqui.
const orderStub = (id: string) => ({ id }) as Order;

const { pushMock, confirmMock, playMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  confirmMock: vi.fn().mockResolvedValue(true),
  playMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/contexts/confirm-provider", () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock("@/hooks/use-sound", () => ({
  useSound: () => ({ play: playMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiService: {
      orders: {
        openCart: vi.fn(),
        viewOrder: vi.fn(),
        clearCart: vi.fn(),
      },
      orderItems: {
        addProductToCart: vi.fn(),
        removeProductFromCart: vi.fn(),
      },
      productAddOns: { getAllPublic: vi.fn() },
      productVariations: { getAllPublic: vi.fn() },
    },
  };
});

const initialAuthState = useAuthStore.getState();
const initialCartState = useCartStore.getState();

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderCartActions() {
  return renderHook(() => useCartActions(), { wrapper });
}

function login(role = "client") {
  act(() => {
    useAuthStore.getState().login({
      id: "user-1",
      name: "Cliente Teste",
      email: "cliente@example.com",
      cpf: "",
      phone: "",
      birthDate: "",
      role,
    });
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("useCartActions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuthStore.setState(initialAuthState, true);
    useCartStore.setState(initialCartState, true);

    confirmMock.mockResolvedValue(true);
    // Sync-on-mount não deve interferir nos testes: sem carrinho no backend.
    vi.mocked(apiService.orders.viewOrder).mockResolvedValue({ success: false });
  });

  describe("handleAddToCart", () => {
    it("exige usuário logado - sem login, mostra erro e não cria carrinho", async () => {
      const { result } = renderCartActions();

      let added: boolean | undefined;
      await act(async () => {
        added = await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza",
          price: 30,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
        });
      });

      expect(added).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        "Você precisa estar logado para adicionar itens ao carrinho",
      );
      expect(apiService.orders.openCart).not.toHaveBeenCalled();
    });

    it("cria um carrinho novo quando não há orderId, e adiciona o item otimisticamente", async () => {
      login();
      vi.mocked(apiService.orders.openCart).mockResolvedValue({
        success: true,
        data: orderStub("order-99"),
      });
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({
        success: true,
        data: orderStub("order-99"),
      });

      const { result } = renderCartActions();

      let added: boolean | undefined;
      await act(async () => {
        added = await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza",
          price: 30,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
        });
      });

      expect(added).toBe(true);
      // Otimista: item já aparece no store antes mesmo do POST resolver.
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]).toMatchObject({
        productId: "prod-1",
        name: "Pizza",
        quantity: 1,
      });
      expect(useCartStore.getState().orderId).toBe("order-99");
      expect(playMock).toHaveBeenCalledWith("cart-add");

      await waitFor(() => {
        expect(apiService.orderItems.addProductToCart).toHaveBeenCalledWith(
          "order-99",
          "prod-1",
          "user-1",
          1,
          expect.objectContaining({ observations: undefined }),
          expect.anything(),
        );
      });
    });

    it("reusa o orderId existente, sem criar um novo carrinho", async () => {
      login();
      act(() => useCartStore.getState().setOrderId("order-existing"));
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza",
          price: 30,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
        });
      });

      expect(apiService.orders.openCart).not.toHaveBeenCalled();
      expect(useCartStore.getState().orderId).toBe("order-existing");
    });

    it("a mesma combinação de produto+variação+adicional soma quantidade na mesma linha", async () => {
      login();
      act(() => useCartStore.getState().setOrderId("order-1"));
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      const item = {
        id: "prod-1",
        name: "Pizza",
        price: 30,
        restaurantId: "r1",
        restaurantName: "Pizzaria",
        variations: [{ productVariationId: "v-grande" }],
      };

      await act(async () => {
        await result.current.handleAddToCart(item);
      });
      await act(async () => {
        await result.current.handleAddToCart(item);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it("a mesma base de produto com variação diferente vira uma linha separada", async () => {
      login();
      act(() => useCartStore.getState().setOrderId("order-1"));
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza P",
          price: 20,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
          variations: [{ productVariationId: "v-pequena" }],
        });
      });
      await act(async () => {
        await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza G",
          price: 35,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
          variations: [{ productVariationId: "v-grande" }],
        });
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.quantity)).toEqual([1, 1]);
    });

    it("trocar de restaurante pede confirmação; cancelando, mantém o carrinho como estava", async () => {
      login();
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setRestaurant({ id: "r1", name: "Pizzaria" });
        useCartStore.getState().setItems([
          { id: "linha-1", productId: "prod-1", name: "Pizza", price: 30, quantity: 1, restaurantId: "r1", restaurantName: "Pizzaria" } as CartItem,
        ]);
      });
      confirmMock.mockResolvedValueOnce(false);

      const { result } = renderCartActions();

      let added: boolean | undefined;
      await act(async () => {
        added = await result.current.handleAddToCart({
          id: "prod-2",
          name: "Burger",
          price: 25,
          restaurantId: "r2",
          restaurantName: "Burgueria",
        });
      });

      expect(confirmMock).toHaveBeenCalled();
      expect(added).toBe(false);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().restaurant?.id).toBe("r1");
    });

    it("trocar de restaurante e confirmar limpa o carrinho antigo e cria um pedido pro novo", async () => {
      login();
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setRestaurant({ id: "r1", name: "Pizzaria" });
        useCartStore.getState().setItems([
          { id: "linha-1", productId: "prod-1", name: "Pizza", price: 30, quantity: 1, restaurantId: "r1", restaurantName: "Pizzaria" } as CartItem,
        ]);
      });
      confirmMock.mockResolvedValueOnce(true);
      vi.mocked(apiService.orders.clearCart).mockResolvedValue({ success: true });
      vi.mocked(apiService.orders.openCart).mockResolvedValue({
        success: true,
        data: orderStub("order-2"),
      });
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      let added: boolean | undefined;
      await act(async () => {
        added = await result.current.handleAddToCart({
          id: "prod-2",
          name: "Burger",
          price: 25,
          restaurantId: "r2",
          restaurantName: "Burgueria",
        });
      });

      expect(added).toBe(true);
      expect(useCartStore.getState().restaurant?.id).toBe("r2");
      expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["prod-2"]);
    });

    it("quando o backend recusa o item (success:false), desfaz a atualização otimista", async () => {
      login();
      act(() => useCartStore.getState().setOrderId("order-1"));
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({
        success: false,
        message: "Produto sem estoque",
      });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza",
          price: 30,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
        });
      });

      // O mock resolve tão rápido quanto o próprio handleAddToCart, então a
      // reversão pode já ter acontecido pelo tempo em que o `act` acima
      // termina de drenar microtasks - o que importa é o estado final.
      await waitFor(() => {
        expect(useCartStore.getState().items).toHaveLength(0);
      });
      expect(toast.error).toHaveBeenCalledWith("Produto sem estoque");
    });

    it("404 no orderId salvo recria o carrinho e reenvia o item automaticamente", async () => {
      login();
      act(() => useCartStore.getState().setOrderId("order-morto"));
      vi.mocked(apiService.orderItems.addProductToCart)
        .mockResolvedValueOnce({ success: false, status: 404, message: "not found" })
        .mockResolvedValueOnce({ success: true });
      vi.mocked(apiService.orders.openCart).mockResolvedValue({
        success: true,
        data: orderStub("order-novo"),
      });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleAddToCart({
          id: "prod-1",
          name: "Pizza",
          price: 30,
          restaurantId: "r1",
          restaurantName: "Pizzaria",
        });
      });

      await waitFor(() => {
        expect(apiService.orderItems.addProductToCart).toHaveBeenCalledTimes(2);
      });
      expect(useCartStore.getState().orderId).toBe("order-novo");
      // o item continua no carrinho local - a 2ª tentativa deu sucesso
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe("handleRemoveFromCart", () => {
    it("remove otimisticamente e, se a API falhar, devolve o item ao carrinho", async () => {
      login();
      const item: CartItem = {
        id: "linha-1",
        productId: "prod-1",
        name: "Pizza",
        price: 30,
        quantity: 1,
        restaurantId: "r1",
        restaurantName: "Pizzaria",
      };
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setItems([item]);
      });
      vi.mocked(apiService.orderItems.removeProductFromCart).mockRejectedValue(
        new Error("falhou"),
      );

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleRemoveFromCart("linha-1");
      });

      await waitFor(() => {
        expect(useCartStore.getState().items).toHaveLength(1);
      });
      expect(toast.error).toHaveBeenCalledWith("Erro ao remover. Tente novamente.");
    });

    it("sem orderId, não faz nada (carrinho local já reflete o backend vazio)", async () => {
      login();
      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleRemoveFromCart("linha-inexistente");
      });

      expect(apiService.orderItems.removeProductFromCart).not.toHaveBeenCalled();
    });
  });

  describe("handleUpdateQuantity", () => {
    it("quantidade 0 remove o item em vez de chamar a API de atualização", async () => {
      login();
      const item: CartItem = {
        id: "linha-1",
        productId: "prod-1",
        name: "Pizza",
        price: 30,
        quantity: 1,
        restaurantId: "r1",
        restaurantName: "Pizzaria",
      };
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setItems([item]);
      });
      vi.mocked(apiService.orderItems.removeProductFromCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleUpdateQuantity("linha-1", 0);
      });

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("faz debounce: só a última quantidade chega na API depois de cliques rápidos", async () => {
      login();
      const item: CartItem = {
        id: "linha-1",
        productId: "prod-1",
        name: "Pizza",
        price: 30,
        quantity: 1,
        restaurantId: "r1",
        restaurantName: "Pizzaria",
      };
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setItems([item]);
      });
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleUpdateQuantity("linha-1", 2);
        await result.current.handleUpdateQuantity("linha-1", 3);
        await result.current.handleUpdateQuantity("linha-1", 5);
      });

      expect(useCartStore.getState().items[0].quantity).toBe(5); // otimista, imediato

      await act(async () => {
        await sleep(350);
      });

      // diff = 5 (final) - 1 (original) = 4, numa única chamada - não 3 chamadas incrementais
      expect(apiService.orderItems.addProductToCart).toHaveBeenCalledTimes(1);
      expect(apiService.orderItems.addProductToCart).toHaveBeenCalledWith(
        "order-1",
        "prod-1",
        "user-1",
        4,
        expect.anything(),
        expect.anything(),
      );
    });

    it("se a atualização falhar no backend, reverte só a diferença tentada por essa chamada", async () => {
      login();
      const item: CartItem = {
        id: "linha-1",
        productId: "prod-1",
        name: "Pizza",
        price: 30,
        quantity: 2,
        restaurantId: "r1",
        restaurantName: "Pizzaria",
      };
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setItems([item]);
      });
      vi.mocked(apiService.orderItems.addProductToCart).mockResolvedValue({
        success: false,
        message: "Sem estoque suficiente",
      });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleUpdateQuantity("linha-1", 5); // diff = +3
      });

      await act(async () => {
        await sleep(350);
      });

      await waitFor(() => {
        expect(useCartStore.getState().items[0].quantity).toBe(2); // 5 - 3
      });
      expect(toast.error).toHaveBeenCalledWith("Sem estoque suficiente");
    });
  });

  describe("handleClearCart", () => {
    it("chama a API e limpa o carrinho local", async () => {
      login();
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setItems([
          { id: "l1", productId: "p1", name: "X", price: 1, quantity: 1, restaurantId: "r1", restaurantName: "R" } as CartItem,
        ]);
      });
      vi.mocked(apiService.orders.clearCart).mockResolvedValue({ success: true });

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleClearCart();
      });

      expect(apiService.orders.clearCart).toHaveBeenCalledWith("user-1", "order-1");
      expect(useCartStore.getState().items).toEqual([]);
      expect(useCartStore.getState().orderId).toBeNull();
      expect(toast.success).toHaveBeenCalledWith("Carrinho limpo com sucesso");
    });

    it("mesmo se a API falhar, limpa o carrinho local (não deixa o usuário travado)", async () => {
      login();
      act(() => {
        useCartStore.getState().setOrderId("order-1");
        useCartStore.getState().setItems([
          { id: "l1", productId: "p1", name: "X", price: 1, quantity: 1, restaurantId: "r1", restaurantName: "R" } as CartItem,
        ]);
      });
      vi.mocked(apiService.orders.clearCart).mockRejectedValue(new Error("boom"));

      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleClearCart();
      });

      expect(useCartStore.getState().items).toEqual([]);
    });

    it("sem orderId, limpa só localmente sem chamar a API", async () => {
      login();
      const { result } = renderCartActions();

      await act(async () => {
        await result.current.handleClearCart();
      });

      expect(apiService.orders.clearCart).not.toHaveBeenCalled();
    });
  });

  describe("helpers derivados", () => {
    it("isItemInCart e getItemQuantity somam todas as combinações do mesmo produto", () => {
      act(() => {
        useCartStore.getState().setItems([
          { id: "l1", productId: "prod-1", name: "P", price: 10, quantity: 2, restaurantId: "r1", restaurantName: "R" } as CartItem,
          { id: "l2", productId: "prod-1", name: "P", price: 12, quantity: 3, restaurantId: "r1", restaurantName: "R" } as CartItem,
          { id: "l3", productId: "prod-2", name: "Q", price: 5, quantity: 1, restaurantId: "r1", restaurantName: "R" } as CartItem,
        ]);
      });

      const { result } = renderCartActions();

      expect(result.current.isItemInCart("prod-1")).toBe(true);
      expect(result.current.isItemInCart("prod-9")).toBe(false);
      expect(result.current.getItemQuantity("prod-1")).toBe(5);
      expect(result.current.getItemQuantity("prod-2")).toBe(1);
    });
  });

  describe("navegação", () => {
    it("handleGoToCheckout bloqueia com carrinho vazio", () => {
      const { result } = renderCartActions();

      act(() => result.current.handleGoToCheckout());

      expect(toast.error).toHaveBeenCalledWith("Seu carrinho está vazio");
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("handleGoToCheckout navega para /checkout com itens no carrinho", () => {
      act(() => {
        useCartStore.getState().setItems([
          { id: "l1", productId: "p1", name: "X", price: 1, quantity: 1, restaurantId: "r1", restaurantName: "R" } as CartItem,
        ]);
      });

      const { result } = renderCartActions();
      act(() => result.current.handleGoToCheckout());

      expect(pushMock).toHaveBeenCalledWith("/checkout");
    });

    it("handleGoToCart navega para /cart mesmo com carrinho vazio", () => {
      const { result } = renderCartActions();
      act(() => result.current.handleGoToCart());
      expect(pushMock).toHaveBeenCalledWith("/cart");
    });
  });
});
