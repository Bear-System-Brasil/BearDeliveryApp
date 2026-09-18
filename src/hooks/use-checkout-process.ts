import { useSound } from "@/hooks/use-sound";
import {
  apiService,
  PaymentMethod,
  PaymentStatus,
  type Address,
  type CreateOrderRequest,
} from "@/services/api";
import { useAuthStore, useCartStore } from "@/stores";
import { getDeliveryDiscount, getPromoDiscount } from "@/stores/cart-store";
import { getErrorMessage } from "@/utils";
import {
  resolveAddressCoordinates,
  withCoords,
  type CoordinateSource,
  type SourcedCoords,
} from "@/lib/address-coordinates";
import { parseCoords } from "@/lib/geocode";
import { Coords } from "@/types/restaurant";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRestaurant } from "./use-restaurants";
import { useUserAddresses } from "./use-addresses";

/**
 * Latitude/longitude não moram aqui: elas vivem em `addressCoords` junto com
 * a fonte que as produziu, porque quem decide se uma coordenada nova entra é
 * a prioridade da fonte (clique no mapa > geocodificação > CEP), não a ordem
 * em que os campos foram preenchidos.
 */
export interface DeliveryInfo {
  name: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
  reference: string;
  observations: string;
}

/** Campos que, ao mudar, invalidam a coordenada herdada de um endereço salvo. */
const ADDRESS_TEXT_FIELDS = new Set([
  "zipCode",
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
]);

interface CardInfo {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

/** Chave do carrinho no Redis: `cart:<customerId>`. Nao e um id de pedido. */
const CART_KEY_PREFIX = "cart:";

function isPersistedOrderId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith(CART_KEY_PREFIX)
  );
}

/**
 * Descobre o id do pedido gravado no banco depois do finishOrder.
 *
 * O carrinho vive no Redis sob `cart:<customerId>` e o pedido concluido ganha
 * UUID proprio. Pagamento e entrega validam UUID, entao mandar a chave do
 * carrinho faz o backend responder 400/403. Quando a resposta do finishOrder
 * vem com a chave do carrinho, buscamos o pedido recem-gravado na listagem
 * do cliente.
 */
async function resolveFinalOrderId(
  finishedOrder: unknown,
  companyId: string,
): Promise<string | null> {
  const record = (finishedOrder ?? {}) as {
    id?: unknown;
    orderId?: unknown;
    order?: { id?: unknown };
  };
  const fromResponse = [record.id, record.orderId, record.order?.id].find(
    isPersistedOrderId,
  );

  if (fromResponse) return fromResponse;

  const response = await apiService.orders.getCustomerOrders();

  if (!response.success || !Array.isArray(response.data)) return null;

  const [mostRecent] = response.data
    .filter(
      (order) =>
        isPersistedOrderId(order?.id) &&
        order?.status !== "CART" &&
        (!companyId || !order?.companyId || order.companyId === companyId),
    )
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime(),
    );

  return mostRecent?.id ?? null;
}

/**
 * Hook completo para gerenciar todo o processo de checkout
 * Incluindo: endereços, formulário, pagamento e criação de pedido
 */
export const useCheckoutProcess = () => {
  const router = useRouter();
  const { play, unlock } = useSound("customer");
  const { user } = useAuthStore();
  const cartStore = useCartStore();
  const {
    items: cartItems,
    restaurant,
    orderId: cartOrderId,
    appliedPromo,
    getTotal,
    getSubtotal,
    clearCart,
    setOrderId,
  } = cartStore;

  // O cart-store só guarda {id, name} do restaurante (ver cart-store.ts) -
  // a taxa de entrega de verdade vem do mesmo catálogo que a tela /cart usa,
  // senão o checkout sempre cobra frete R$0 mesmo quando o carrinho mostrou
  // um valor de frete real.
  const { data: restaurantDetails } = useRestaurant(restaurant?.id ?? null);

  // Address management
  const { data: userAddresses = [], isLoading: loadingAddresses } =
    useUserAddresses();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [addressMode, setAddressMode] = useState<"select" | "new">("select");
  const [saveAddress, setSaveAddress] = useState(true);

  // Delivery vs pickup
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");

  // Form state
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    name: user?.name || "",
    phone: user?.phone || "",
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
    reference: "",
    observations: "",
  });

  // Coordenada do endereço + de onde ela veio. Começa vazia de propósito:
  // enquanto não houver fonte real (clique no mapa, geocodificação ou CEP), o
  // endereço é salvo sem coordenada em vez de com um palpite errado.
  const [addressCoords, setAddressCoords] = useState<SourcedCoords | null>(
    null,
  );

  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [cardInfo, setCardInfo] = useState<CardInfo>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });
  const [changeAmount, setChangeAmount] = useState(""); // Troco para dinheiro
  const [needsChange, setNeedsChange] = useState(false);
  const [paymentGatewayUrl, setPaymentGatewayUrl] = useState<string | null>(
    null,
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Calculated values - mesma fórmula da tela /cart, pra nunca cobrar um
  // total diferente do que o cliente viu antes de finalizar o pedido.
  const subtotal = getSubtotal();
  const rawDeliveryFee = Number.parseFloat(
    String(restaurantDetails?.deliveryFee ?? "0").replace(",", "."),
  );
  const deliveryFee = Number.isFinite(rawDeliveryFee) ? rawDeliveryFee : 0;
  const deliveryDiscount = getDeliveryDiscount(appliedPromo, deliveryFee);
  const promoDiscount = getPromoDiscount(appliedPromo, subtotal);
  const total = Math.max(
    0,
    getTotal(deliveryFee) - deliveryDiscount - promoDiscount,
  );

  /**
   * Carrega dados de um endereço no formulário
   */
  const loadAddressData = (address: Address) => {
    setDeliveryInfo((prev) => ({
      ...prev,
      zipCode: address.zipCode,
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      complement: address.complement || "",
      reference: address.reference || "",
    }));

    // A coordenada do endereço salvo vale enquanto o cliente não mexer no
    // texto dele - `handleInputChange` descarta quando isso acontece, para o
    // endereço novo não herdar o ponto do antigo.
    const coords = parseCoords(address.latitude, address.longitude);

    setAddressCoords(coords ? { coords, source: "stored" } : null);
  };

  /**
   * Seleciona um endereço salvo
   */
  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = userAddresses.find((a: Address) => a.id === addressId);
    if (address) {
      loadAddressData(address);
    }
  };

  /**
   * Atualiza campo de entrega
   */
  const handleInputChange = (field: string, value: string | number) => {
    setDeliveryInfo((prev) => ({ ...prev, [field]: value }));

    // Endereço diferente, ponto diferente: a coordenada herdada de um endereço
    // salvo não sobrevive à edição do texto, senão o endereço novo seria
    // gravado no lugar do antigo.
    if (ADDRESS_TEXT_FIELDS.has(field)) {
      setAddressCoords((coords) =>
        coords?.source === "stored" ? null : coords,
      );
    }
  };

  /**
   * Registra uma coordenada respeitando a prioridade das fontes
   * (clique no mapa > geocodificação > CEP).
   */
  const applyCoords = (coords: Coords | null, source: CoordinateSource) => {
    setAddressCoords((current) => withCoords(current, coords, source));
  };

  /**
   * Atualiza campo de cartão
   */
  const handleCardInputChange = (field: string, value: string) => {
    setCardInfo((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Coordenada definitiva do endereço digitado. Sem gesto explícito do
   * cliente, geocodifica o que foi digitado - é isso que evita o endereço ir
   * para o banco com a coordenada errada (ou sem nenhuma).
   */
  const resolveDeliveryCoords = async () => {
    const resolved = await resolveAddressCoordinates(
      deliveryInfo,
      addressCoords,
    );

    if (resolved) setAddressCoords(resolved);

    return resolved?.coords ?? null;
  };

  /**
   * Salva novo endereço do usuário
   */
  const saveNewAddress = async (
    coords: Coords | null,
  ): Promise<string | null> => {
    try {
      const addressData = {
        zipCode: deliveryInfo.zipCode,
        state: deliveryInfo.state,
        city: deliveryInfo.city,
        neighborhood: deliveryInfo.neighborhood,
        longitude: coords?.lng,
        latitude: coords?.lat,
        street: deliveryInfo.street,
        number: deliveryInfo.number,
        complement: deliveryInfo.complement || undefined,
        reference: deliveryInfo.reference || undefined,
        isDefault: false,
      };

      const response = await apiService.address.createUserAddress(addressData);

      if (response.success && response.data) {
        const id = response.data.id;
        setSelectedAddressId(id);
        toast.success("Endereço salvo com sucesso!");
        return id;
      }

      return null;
    } catch (error) {
      console.error("Error saving address:", error);
      return null;
    }
  };

  /**
   * Valida os dados de entrega (etapa 1 do checkout)
   * Endereço so e obrigatorio quando o pedido e para entrega
   */
  const isDeliveryValid = () => {
    const contactValid = Boolean(deliveryInfo.name && deliveryInfo.phone);

    if (orderType === "pickup") {
      return contactValid;
    }

    return Boolean(
      contactValid &&
      deliveryInfo.street &&
      deliveryInfo.number &&
      deliveryInfo.neighborhood &&
      deliveryInfo.city &&
      deliveryInfo.state &&
      deliveryInfo.zipCode,
    );
  };

  /**
   * Valida formulário antes de submeter
   */
  const isFormValid = () => {
    const requiredFields = isDeliveryValid();

    // Pagamentos que não precisam de dados adicionais no checkout
    const paymentValid =
      paymentMethod === "cash" ||
      paymentMethod === "pix" ||
      paymentMethod === "credit" ||
      paymentMethod === "debit" ||
      paymentMethod === "bank_transfer" ||
      paymentMethod === "card_machine" ||
      paymentMethod === "pix_on_delivery";

    // Se e cartão online, validar dados do cartão
    const cardValid =
      (paymentMethod !== "credit" && paymentMethod !== "debit") ||
      Boolean(
        cardInfo.number.trim() &&
        cardInfo.expiry.trim() &&
        cardInfo.cvv.trim() &&
        cardInfo.name.trim(),
      );

    // Se é dinheiro e precisa de troco, validar valor
    const changeValid =
      paymentMethod !== "cash" ||
      !needsChange ||
      (changeAmount && parseFloat(changeAmount) > total);

    return requiredFields && paymentValid && cardValid && changeValid;
  };

  /**
   * Fluxo completo de finalização de pedido
   *
   * IMPORTANTE: Itens já foram adicionados ao carrinho Redis via use-cart-actions
   *
   * Etapas:
   * 1. Salva novo endereço (se necessário)
   * 2. Finaliza pedido (converte carrinho Redis → Order PostgreSQL)
   * 3. Cria registro de pagamento (payment) usando orderId do banco
   * 4. Cria registro de entrega (delivery) usando orderId do banco
   * 5. Redireciona para página de acompanhamento
   * 6. Limpa carrinho local (após delay para evitar redirect indesejado)
   */
  const handleSubmitOrder = async () => {
    // Este clique é o único gesto garantido antes de a tela de acompanhamento
    // começar a tocar sozinha, no polling. Destravar o áudio aqui é o que faz
    // "em preparo" e "chegou" saírem depois — sem isso o navegador bloqueia
    // tudo em silêncio, porque quem espera o pedido não toca mais na tela.
    unlock();

    if (cartItems.length === 0) {
      toast.error("Seu carrinho está vazio!");
      router.push("/#lojas");
      return;
    }

    if (!user?.id) {
      toast.error("Você precisa estar logado para finalizar o pedido");
      router.push("/#lojas");
      return;
    }

    if (!restaurant?.id) {
      toast.error(
        "Erro ao identificar o restaurante. Por favor, adicione os itens novamente ao carrinho.",
      );
      clearCart();
      router.push("/#lojas");
      return;
    }

    setIsProcessing(true);

    try {
      // --------------------------------------------------
      // 1️⃣ GARANTIR QUE EXISTE UM ADDRESS (apenas para entrega)
      // --------------------------------------------------

      let deliveryAddressId = selectedAddressId;

      if (orderType === "delivery") {
        // Uma resolução só para os dois caminhos de criação abaixo: o segundo
        // é fallback do primeiro, e geocodificar de novo seria uma ida à rede
        // repetida bem no clique de finalizar o pedido.
        const coords = deliveryAddressId ? null : await resolveDeliveryCoords();

        // For "new" address mode: always create address (delivery needs an addressId)
        if (addressMode === "new" && !deliveryAddressId) {
          deliveryAddressId = await saveNewAddress(coords);
        }

        // Fallback: if we still don't have an address, create one
        if (!deliveryAddressId) {
          const newAddressData = {
            zipCode: deliveryInfo.zipCode,
            street: deliveryInfo.street,
            number: deliveryInfo.number,
            neighborhood: deliveryInfo.neighborhood,
            city: deliveryInfo.city,
            state: deliveryInfo.state,
            latitude: coords?.lat,
            longitude: coords?.lng,
            isDefault: false,
          };

          const addressResponse =
            await apiService.address.createUserAddress(newAddressData);

          if (addressResponse.success && addressResponse.data?.id) {
            deliveryAddressId = addressResponse.data.id;
          } else {
            throw new Error("Erro ao criar endereço de entrega");
          }
        }
      }

      // --------------------------------------------------
      // 2️⃣ GARANTIR CARRINHO
      // --------------------------------------------------

      let currentOrderId = cartOrderId;

      if (!currentOrderId) {
        const orderData: CreateOrderRequest = {
          companyId: restaurant.id,
          discount: deliveryDiscount + promoDiscount,
          totalShipping: deliveryFee,
          totalValue: total,
          status: "CART",
        };

        const orderResponse = await apiService.orders.openCart(
          user.id,
          orderData,
        );

        if (!orderResponse?.data?.id) {
          throw new Error("Erro ao criar pedido");
        }

        currentOrderId = orderResponse.data.id;
        setOrderId(currentOrderId);
      }

      const finishOrderResponse = await apiService.orders.finishOrder(
        user.id,
        currentOrderId,
      );

      if (!finishOrderResponse.success) {
        throw new Error(
          finishOrderResponse.message || "Erro ao finalizar pedido",
        );
      }

      const finalOrderId = await resolveFinalOrderId(
        finishOrderResponse.data,
        restaurant.id,
      );

      // Chegando aqui o pedido ja esta gravado no banco. Sem o UUID não da para
      // registrar pagamento e entrega, mas cancelar o fluxo seria mentira - o
      // pedido existe e precisa aparecer em "Meus pedidos".
      if (!finalOrderId) {
        toast.warning(
          "Pedido registrado, mas não conseguimos identificar o numero dele. Confira em Meus pedidos.",
        );
      }

      // --------------------------------------------------
      // 3️⃣ PAGAMENTO e 4️⃣ DELIVERY (USANDO O MESMO ADDRESS)
      // --------------------------------------------------
      // Nenhum dos dois depende do resultado do outro - rodar em paralelo
      // poupa um round-trip inteiro no passo mais sensível a latência do
      // app (o clique de "finalizar pedido"). Delivery é pulado quando é
      // retirada no local.

      const createPayment = async () => {
        if (!finalOrderId) return;

        try {
          const paymentData = {
            orderId: finalOrderId,
            // customerId: user.id,
            paymentMethod:
              paymentMethod === "credit"
                ? PaymentMethod.CREDIT_CARD
                : paymentMethod === "debit"
                  ? PaymentMethod.DEBIT_CARD
                  : paymentMethod === "card_machine"
                    ? PaymentMethod.DEBIT_CARD
                    : paymentMethod === "pix"
                      ? PaymentMethod.PIX
                      : paymentMethod === "pix_on_delivery"
                        ? PaymentMethod.PIX
                        : paymentMethod === "cash"
                          ? PaymentMethod.CASH
                          : PaymentMethod.BANK_TRANSFER,
            amount: total,
            // status: PaymentStatus.PENDING,
          };

          const paymentResponse = await apiService.payments.create(paymentData);

          // `apiRequest` não lança exceção em 4xx - sem checar `success` a falha
          // de pagamento passava batida e o cliente via "pedido realizado".
          if (!paymentResponse.success) {
            toast.error(
              paymentResponse.message ||
              "Pedido criado, mas falhou ao registrar o pagamento.",
            );
          }

          if (paymentResponse.data?.gatewayUrl) {
            setPaymentGatewayUrl(paymentResponse.data.gatewayUrl);
          }
        } catch (error) {
          console.error("Erro no pagamento:", error);
          toast.error("Pedido criado, mas falhou ao registrar o pagamento.");
        }
      };

      const createDelivery = async () => {
        if (!finalOrderId || orderType !== "delivery" || !deliveryAddressId) {
          return;
        }

        try {
          const deliveryData = {
            orderId: finalOrderId,
            deliveryAddressId: deliveryAddressId,
            observations: deliveryInfo.observations || undefined,
            estimatedTime: "30-40 min",
          };

          const deliveryResponse =
            await apiService.deliveries.create(deliveryData);

          // O pedido ja existe em "Meus pedidos" mesmo sem entrega registrada,
          // mas sem ela não ha rastreio - a falha precisa aparecer.
          if (!deliveryResponse.success) {
            toast.error(
              deliveryResponse.message ||
              "Pedido criado, mas falhou ao registrar a entrega.",
            );
          }
        } catch (error) {
          console.error("Erro no delivery:", error);
          toast.error("Pedido criado, mas falhou ao registrar a entrega.");
        }
      };

      await Promise.all([createPayment(), createDelivery()]);

      // O endereço precisa existir pra delivery referenciar deliveryAddressId
      // - não dá pra pular a criação. Mas se o cliente desmarcou "Salvar este
      // endereço para pedidos futuros", ele não pode sobrar em "meus
      // endereços" depois - descarta (soft delete) o que acabou de ser criado
      // só pra esse pedido.
      if (!saveAddress && addressMode === "new" && deliveryAddressId) {
        try {
          await apiService.address.deleteUserAddress(deliveryAddressId);
        } catch (error) {
          console.error("Erro ao descartar endereço temporário:", error);
        }
      }

      // O motivo da marca por inteiro, terminando aberto: pico de alívio do
      // cliente e o momento mais raro e mais carregado da jornada dele.
      play("order-confirmed");
      toast.success("Pedido realizado com sucesso!");

      setIsNavigating(true);
      router.push("/orders");

      setTimeout(() => {
        clearCart();
        setIsNavigating(false);
      }, 1500);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Erro ao processar pedido. Tente novamente."),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-select o endereço padrão quando os endereços carregam - antes
  // pegava sempre userAddresses[0], ignorando qual o cliente marcou como
  // padrão no perfil (isDefault), então o checkout pré-selecionava um
  // endereço "aleatório" (ordem do backend) em vez do que o cliente escolheu.
  useEffect(() => {
    if (
      addressMode === "select" &&
      userAddresses.length > 0 &&
      !selectedAddressId
    ) {
      const defaultAddress =
        userAddresses.find((a: Address) => a.isDefault) || userAddresses[0];
      setSelectedAddressId(defaultAddress.id);
      loadAddressData(defaultAddress);
    }

    if (userAddresses.length === 0 && !loadingAddresses) {
      setAddressMode("new");
    }
  }, [userAddresses, loadingAddresses, selectedAddressId, addressMode]);

  // Update user info when available
  useEffect(() => {
    if (user) {
      setDeliveryInfo((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  return {
    // Address management
    userAddresses,
    selectedAddressId,
    addressMode,
    saveAddress,
    loadingAddresses,
    setAddressMode,
    setSaveAddress,
    handleAddressSelect,
    loadAddressData,
    setSelectedAddressId,

    // Delivery vs pickup
    orderType,
    setOrderType,
    isDeliveryValid,

    // Form state
    deliveryInfo,
    addressCoords,
    applyCoords,
    paymentMethod,
    cardInfo,
    changeAmount,
    needsChange,
    paymentGatewayUrl,
    handleInputChange,
    handleCardInputChange,
    setPaymentMethod,
    setChangeAmount,
    setNeedsChange,

    // Calculated values
    subtotal,
    deliveryFee,
    discount: deliveryDiscount + promoDiscount,
    total,
    cartItems,
    restaurant,

    // Actions
    handleSubmitOrder,
    isFormValid,
    isProcessing,
    isNavigating,
  };
};
