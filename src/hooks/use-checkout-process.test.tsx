import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O corpo de POST /order/:id (finalizar) é o único lugar por onde o backend
 * fica sabendo se o pedido é entrega ou retirada, e com quanto o cliente vai
 * pagar em dinheiro. Um campo errado aí não quebra nada visivelmente: o
 * pedido entra, e só depois alguém nota que a entrega não foi criada ou que
 * o troco veio errado. Estes testes travam o payload nos quatro casos.
 */

const finishOrder = vi.fn();
const openCart = vi.fn();
const paymentsCreate = vi.fn();
const deleteUserAddress = vi.fn();
const updateUserAddress = vi.fn();
const toastError = vi.fn();

const CART_ITEMS = [
  { id: "line-1", productId: "p1", name: "xTudo", price: 35.9, quantity: 1 },
];

const SOUND = { play: vi.fn(), unlock: vi.fn() };
const AUTH = {
  user: { id: "user-1", name: "Cliente", phone: "11999999999" },
};
const RESTAURANT_QUERY = { data: { id: "comp-1", deliveryFee: "0" } };
const ADDRESS_BASE = {
  id: "addr-1",
  zipCode: "01001000",
  street: "Praça da Sé",
  number: "1",
  neighborhood: "Sé",
  city: "São Paulo",
  state: "SP",
};

const ADDRESSES_WITH_DEFAULT = {
  data: [{ ...ADDRESS_BASE, isDefault: true }],
  isLoading: false,
};

// Cliente que só cadastrou endereço pelo checkout: nada é padrão, porque
// os dois pontos de criação usam isDefault: false.
const ADDRESSES_WITHOUT_DEFAULT = {
  data: [{ ...ADDRESS_BASE, isDefault: false }],
  isLoading: false,
};

let addressesQuery: typeof ADDRESSES_WITH_DEFAULT = ADDRESSES_WITH_DEFAULT;
const ROUTER = { push: vi.fn(), back: vi.fn() };

const cartStore = {
  items: CART_ITEMS,
  restaurant: { id: "comp-1", name: "Lanchonete do Bear" },
  orderId: "cart:user-1",
  appliedPromo: null,
  getTotal: () => 35.9,
  getSubtotal: () => 35.9,
  clearCart: vi.fn(),
  setOrderId: vi.fn(),
};

vi.mock("@/hooks/use-sound", () => ({ useSound: () => SOUND }));

vi.mock("@/stores", () => ({
  useAuthStore: () => AUTH,
  useCartStore: () => cartStore,
}));

vi.mock("@/stores/cart-store", () => ({
  getDeliveryDiscount: () => 0,
  getPromoDiscount: () => 0,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ROUTER }));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: toastError,
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("./use-restaurants", () => ({
  useRestaurant: () => RESTAURANT_QUERY,
}));

// Endereço já salvo e marcado como padrão: o hook auto-seleciona, e o
// caminho de entrega pula geocodificação e criação de endereço.
vi.mock("./use-addresses", () => ({
  useUserAddresses: () => addressesQuery,
}));

vi.mock("@/lib/address-coordinates", () => ({
  resolveAddressCoordinates: vi.fn(),
  withCoords: vi.fn(),
}));

vi.mock("@/lib/geocode", () => ({ parseCoords: vi.fn() }));

vi.mock("@/services/api", () => ({
  apiService: {
    orders: { finishOrder, openCart },
    payments: { create: paymentsCreate },
    address: { deleteUserAddress, updateUserAddress, createUserAddress: vi.fn() },
  },
  PaymentMethod: {
    CASH: "CASH",
    CREDIT_CARD: "CREDIT_CARD",
    DEBIT_CARD: "DEBIT_CARD",
    PIX: "PIX",
    BANK_TRANSFER: "BANK_TRANSFER",
  },
  PaymentStatus: { PENDING: "PENDING" },
}));

const { useCheckoutProcess } = await import("./use-checkout-process");

/** Corpo com que o finishOrder foi chamado (3º argumento). */
const finishBody = () => finishOrder.mock.calls[0]?.[2];

type Hook = ReturnType<typeof useCheckoutProcess>;

async function submitWith(setup: (h: Hook) => void) {
  const { result } = renderHook(() => useCheckoutProcess());

  // O endereço padrão é auto-selecionado por efeito - esperar evita o
  // caminho de criação de endereço, que não é o que estes testes cobrem.
  await waitFor(() => expect(result.current.selectedAddressId).toBe("addr-1"));

  act(() => setup(result.current));
  await act(async () => {
    await result.current.handleSubmitOrder();
  });

  return result;
}

describe("useCheckoutProcess - corpo do finishOrder", () => {
  beforeEach(() => {
    finishOrder.mockReset();
    finishOrder.mockResolvedValue({ success: true, data: { id: "order-1" } });
    openCart.mockReset();
    paymentsCreate.mockReset();
    paymentsCreate.mockResolvedValue({ success: true, data: {} });
    deleteUserAddress.mockReset();
    updateUserAddress.mockReset();
    updateUserAddress.mockResolvedValue({ success: true, data: {} });
    addressesQuery = ADDRESSES_WITH_DEFAULT;
  });

  it("manda DELIVERY quando o pedido é entrega", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("pix");
    });

    expect(finishOrder).toHaveBeenCalledTimes(1);
    expect(finishBody()).toEqual({ fulfillmentType: "DELIVERY" });
  });

  it("manda PICKUP quando o pedido é retirada", async () => {
    await submitWith((h) => {
      h.setOrderType("pickup");
      h.setPaymentMethod("pix");
    });

    expect(finishBody()).toEqual({ fulfillmentType: "PICKUP" });
  });

  it("manda changeFor com o valor que o cliente entrega, não o troco", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("cash");
      h.setNeedsChange(true);
      h.setChangeAmount("50");
    });

    // Pedido de R$ 35,90 pago com R$ 50 - o backend recebe 50, não 14,10.
    expect(finishBody()).toEqual({
      fulfillmentType: "DELIVERY",
      changeFor: 50,
    });
  });

  it("aceita vírgula como separador decimal", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("cash");
      h.setNeedsChange(true);
      h.setChangeAmount("50,50");
    });

    expect(finishBody()).toEqual({
      fulfillmentType: "DELIVERY",
      changeFor: 50.5,
    });
  });

  it("omite changeFor quando o cliente dispensa o troco", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("cash");
      h.setNeedsChange(false);
    });

    // Omitido, e não enviado como 0 - o backend leria 0 como "paga
    // exatamente o valor", que é outra afirmação.
    expect(finishBody()).toEqual({ fulfillmentType: "DELIVERY" });
    expect(finishBody()).not.toHaveProperty("changeFor");
  });

  it("omite changeFor quando o pagamento não é em dinheiro", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("credit");
      // Resíduo de quem trocou de método depois de digitar: não pode vazar.
      h.setNeedsChange(true);
      h.setChangeAmount("50");
    });

    expect(finishBody()).not.toHaveProperty("changeFor");
  });

  it("omite changeFor quando o valor é menor que o total", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("cash");
      h.setNeedsChange(true);
      h.setChangeAmount("20");
    });

    expect(finishBody()).not.toHaveProperty("changeFor");
  });

  it("aceita o valor exato do total (troco zero)", async () => {
    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("cash");
      h.setNeedsChange(true);
      h.setChangeAmount("35,90");
    });

    expect(finishBody()).toEqual({
      fulfillmentType: "DELIVERY",
      changeFor: 35.9,
    });
  });
});

describe("useCheckoutProcess - isFormValid e o troco", () => {
  it("libera o valor exato do total e barra abaixo dele", async () => {
    const { result } = renderHook(() => useCheckoutProcess());

    act(() => {
      result.current.setPaymentMethod("cash");
      result.current.setNeedsChange(true);
      result.current.setChangeAmount("35,90");
    });
    expect(result.current.isFormValid()).not.toBe(false);

    act(() => result.current.setChangeAmount("20"));
    expect(result.current.isFormValid()).toBe(false);
  });
});

/**
 * O backend monta a entrega a partir do endereço PADRÃO do cliente, e nenhum
 * endereço criado pelo checkout nasce padrão. Sem um padrão, o finalizar
 * falha com "Pedido não encontrado" - mensagem que fala de pedido para um
 * problema de endereço, e que custou uma investigação inteira.
 */
describe("useCheckoutProcess - endereço padrão da entrega", () => {
  beforeEach(() => {
    finishOrder.mockReset();
    finishOrder.mockResolvedValue({ success: true, data: { id: "order-1" } });
    paymentsCreate.mockReset();
    paymentsCreate.mockResolvedValue({ success: true, data: {} });
    updateUserAddress.mockReset();
    updateUserAddress.mockResolvedValue({ success: true, data: {} });
    toastError.mockReset();
    addressesQuery = ADDRESSES_WITH_DEFAULT;
  });

  it("promove o endereço do pedido a padrão quando o cliente não tem nenhum", async () => {
    addressesQuery = ADDRESSES_WITHOUT_DEFAULT;

    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("pix");
    });

    expect(updateUserAddress).toHaveBeenCalledWith("addr-1", {
      isDefault: true,
    });
    expect(finishOrder).toHaveBeenCalledTimes(1);
  });

  it("não toca no padrão de quem já escolheu um no perfil", async () => {
    addressesQuery = ADDRESSES_WITH_DEFAULT;

    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("pix");
    });

    expect(updateUserAddress).not.toHaveBeenCalled();
    expect(finishOrder).toHaveBeenCalledTimes(1);
  });

  it("não promove nada em retirada no local", async () => {
    addressesQuery = ADDRESSES_WITHOUT_DEFAULT;

    await submitWith((h) => {
      h.setOrderType("pickup");
      h.setPaymentMethod("pix");
    });

    // Retirada não gera entrega, então não há endereço a definir.
    expect(updateUserAddress).not.toHaveBeenCalled();
    expect(finishOrder).toHaveBeenCalledTimes(1);
  });

  it("falha com mensagem própria se não conseguir definir o padrão", async () => {
    addressesQuery = ADDRESSES_WITHOUT_DEFAULT;
    updateUserAddress.mockResolvedValue({ success: false, message: "boom" });

    await submitWith((h) => {
      h.setOrderType("delivery");
      h.setPaymentMethod("pix");
    });

    // Sem padrão o finalizar falharia com "Pedido não encontrado", que não
    // explica nada - então nem chega a ser chamado.
    expect(finishOrder).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível definir o endereço de entrega. Tente novamente ou escolha outro endereço.",
    );
  });
});
