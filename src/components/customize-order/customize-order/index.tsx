import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllCategories,
  useCartActions,
  usePublicProductAddOns,
  usePublicProductVariations,
  useRestaurant,
} from "@/hooks";
import { useAuth } from "@/contexts/auth-provider";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils";
import { Minus, Plus, X } from "lucide-react";
import type { Category, Product } from "@/services/api";
import type { ProductCategory } from "@/types/restaurant";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SelectOptions } from "../select-options";

type Props = {
  productData: Product;
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
};

export type ExtraOption = {
  id: string;
  label: string;
  price: number;
};

export type ExtraGroup = {
  id: "variation" | "addon";
  title: string;
  multiple: boolean;
  required?: boolean;
  options: ExtraOption[];
};

type CustomOrderType = {
  specialInstructions: string;
};

const initialCustomOrder = (): CustomOrderType => ({
  specialInstructions: "",
});

/**
 * Teto por complemento, aplicado a cada um de forma independente: dá pra
 * levar 4 de cada tipo, e não há limite de quantos tipos o cliente escolhe.
 */
const ADD_ON_MAX_QUANTITY = 4;

export function CustomizeOrder({
  productData,
  isModalOpen,
  setIsModalOpen,
}: Props) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  // Tamanho é escolha única (ids); complemento agora carrega quantidade,
  // então mora em `addOnQuantities` (id -> quantidade, 0 = fora do pedido).
  const [selections, setSelections] = useState<Record<string, string[]>>({
    variation: [],
    addon: [],
  });
  const [addOnQuantities, setAddOnQuantities] = useState<
    Record<string, number>
  >({});
  // Marca que o clique em "Adicionar" veio de visitante e ficou pendente
  // de login - o efeito lá embaixo refaz o clique quando a sessão chega.
  const [addAfterLogin, setAddAfterLogin] = useState(false);

  const { isAuthenticated, showAuthModal } = useAuth();

  // O back já suporta várias fotos por prato (productData.imageURL é um
  // array) - antes só a primeira era exibida. Sem foto nenhuma, cai no
  // placeholder.
  const images = productData.imageURL?.length
    ? productData.imageURL
    : [{ url: "/placeholder.svg" }];

  const [imageApi, setImageApi] = useState<CarouselApi>();
  const [currentImage, setCurrentImage] = useState(0);

  const updateCurrentImage = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCurrentImage(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!imageApi) return;

    setCurrentImage(0);
    updateCurrentImage(imageApi);
    imageApi.on("select", updateCurrentImage);
    imageApi.on("reInit", updateCurrentImage);

    return () => {
      imageApi.off("select", updateCurrentImage);
      imageApi.off("reInit", updateCurrentImage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageApi, productData.id]);

  const [customOrder, setCustomOrder] = useState<CustomOrderType>(
    initialCustomOrder(),
  );

  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(
    productData.companyId,
  );

  const { handleAddToCart: addToCart } = useCartActions();

  const { data: categories } = useAllCategories();

  const { data: variations = [], isLoading: variationsLoading } =
    usePublicProductVariations(productData.id, productData.companyId);
  const { data: addOns = [], isLoading: addOnsLoading } =
    usePublicProductAddOns(productData.id, productData.companyId);

  // Enquanto isso ainda tá carregando, `extraGroups` fica vazio e nada
  // aparece pra clicar - mas se o clique em "Adicionar" cair bem nessa
  // janela (antes de tamanhos/complementos chegarem), o pedido sai sem eles
  // ou a função aborta em silêncio (restaurant ainda undefined). Trava o
  // botão até tudo estar pronto, em vez de deixar o usuário adicionar algo
  // incompleto que o backend depois rejeita (some do carrinho).
  const isCustomizationLoading =
    variationsLoading || addOnsLoading || restaurantLoading;

  const extraGroups: ExtraGroup[] = useMemo(() => {
    const groups: ExtraGroup[] = [];

    const availableVariations = variations.filter((v) => v.isAvailable);
    if (availableVariations.length > 0) {
      groups.push({
        id: "variation",
        title: "Tamanho",
        multiple: false,
        // O card do cardápio anuncia "a partir de" com o menor
        // priceModifier - se o tamanho fosse opcional, dava pra pular a
        // escolha e pagar só o salePrice, que é sempre menor que esse
        // "a partir de" (priceModifier nunca é negativo). Obrigatório
        // garante que o preço anunciado seja o que o cliente paga de fato.
        required: true,
        options: availableVariations.map((v) => ({
          id: v.id,
          label: v.name,
          price: v.priceModifier,
        })),
      });
    }

    const availableAddOns = addOns.filter((a) => a.isAvailable);
    if (availableAddOns.length > 0) {
      groups.push({
        id: "addon",
        title: "Complementos",
        multiple: true,
        options: availableAddOns.map((a) => ({
          id: a.id,
          label: a.name,
          price: a.priceModifier,
        })),
      });
    }

    return groups;
  }, [variations, addOns]);

  const handleSelectionChange = (groupId: string, selectedIds: string[]) => {
    setSelections((prev) => ({ ...prev, [groupId]: selectedIds }));
  };

  // Trava o intervalo aqui também, e não só no `disabled` dos botões, pra
  // que o teto valha mesmo se a chamada vier de outro caminho.
  const handleAddOnQuantityChange = (
    optionId: string,
    nextQuantity: number,
  ) => {
    const clamped = Math.min(Math.max(nextQuantity, 0), ADD_ON_MAX_QUANTITY);
    setAddOnQuantities((prev) => ({ ...prev, [optionId]: clamped }));
  };

  // Valor dos extras POR UNIDADE do produto: o complemento entra
  // multiplicado pela quantidade escolhida dele, e o resultado ainda é
  // multiplicado pela quantidade do item lá embaixo (totalPrice).
  const extrasTotal = useMemo(() => {
    return extraGroups.reduce((total, group) => {
      if (group.id === "addon") {
        return (
          total +
          group.options.reduce(
            (sum, option) =>
              sum + option.price * (addOnQuantities[option.id] ?? 0),
            0,
          )
        );
      }

      const selectedIds = selections[group.id] || [];
      const groupTotal = group.options
        .filter((option) => selectedIds.includes(option.id))
        .reduce((sum, option) => sum + option.price, 0);
      return total + groupTotal;
    }, 0);
  }, [extraGroups, selections, addOnQuantities]);

  const categoryMap = useMemo(() => {
    if (!categories) return {};

    return Object.fromEntries(categories.map((c: Category) => [c.id, c.name]));
  }, [categories]);

  const getProductCategoryNames = (
    productCategories: ProductCategory[] | undefined,
    categoryMap: Record<string, string>,
  ) => {
    if (!productCategories) return [];

    return productCategories
      .map((pc) => categoryMap[pc.categoryId])
      .filter(Boolean);
  };

  const resetState = () => {
    setCustomOrder(initialCustomOrder());
    setQuantity(1);
    setNotesOpen(false);
    setSelections({ variation: [], addon: [] });
    setAddOnQuantities({});
    setAddAfterLogin(false);
  };

  const handleConfirmAddToCart = async () => {
    if (!productData || !restaurant || isCustomizationLoading) return;
    if (pendingRequiredGroup) return;

    // Visitante: pede o login aqui, sem fechar o modal nem descartar o que
    // ele montou. Checar antes de `addToCart` evita o toast de "precisa
    // estar logado" (use-cart-actions) competir com o AuthModal - o pedido
    // de login aparece uma vez só, no lugar certo. Vem depois do
    // `pendingRequiredGroup` de propósito: não faz sentido mandar alguém
    // logar pra só então avisar que falta escolher o tamanho.
    if (!isAuthenticated) {
      setAddAfterLogin(true);
      showAuthModal("login");
      return;
    }

    setIsAddingToCart(true);

    try {
      const selectedVariationId = selections.variation?.[0];

      const variationGroup = extraGroups.find((g) => g.id === "variation");
      const addOnGroup = extraGroups.find((g) => g.id === "addon");
      const variationLabel = variationGroup?.options.find(
        (o) => o.id === selectedVariationId,
      )?.label;

      // Só entra no pedido o complemento com quantidade > 0.
      const selectedAddOns = (addOnGroup?.options ?? [])
        .map((option) => ({
          option,
          addOnQuantity: addOnQuantities[option.id] ?? 0,
        }))
        .filter((entry) => entry.addOnQuantity > 0);

      const addOnLabels = selectedAddOns.map(({ option }) => option.label);

      const success = await addToCart({
        id: productData.id.toString(),
        name: productData.name,
        price: unitPrice,
        image: productData.imageURL?.[0]?.url || "/placeholder.svg",
        restaurantId: restaurant.id,
        restaurantName: restaurant.tradeName,
        specialInstructions: customOrder.specialInstructions,
        quantity,
        variations: selectedVariationId
          ? [{ productVariationId: selectedVariationId }]
          : undefined,
        addOns: selectedAddOns.length
          ? selectedAddOns.map(({ option, addOnQuantity }) => ({
              productAddOnsId: option.id,
              quantity: addOnQuantity,
            }))
          : undefined,
        variationLabel,
        addOnLabels: addOnLabels.length ? addOnLabels : undefined,
      });

      if (success) {
        setIsModalOpen(false);
        resetState();
      }
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // O AuthModal abre por cima do modal do prato, que nunca desmonta - então
  // tamanho, complementos, quantidade e observação seguem na tela enquanto o
  // visitante loga. Assim que a sessão existe, o "Adicionar" que ficou
  // pendente é refeito sozinho e o item entra no carrinho.
  useEffect(() => {
    if (!addAfterLogin || !isAuthenticated) return;

    setAddAfterLogin(false);
    void handleConfirmAddToCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addAfterLogin, isAuthenticated]);

  const productTags = getProductCategoryNames(
    productData.productCategories,
    categoryMap,
  );

  const handleModalClose = (val: boolean) => {
    resetState();
    setIsModalOpen(val);
  };

  const unitPrice = productData.salePrice + extrasTotal;

  const totalPrice = unitPrice * quantity;

  const pendingRequiredGroup = extraGroups.find(
    (group) => group.required && (selections[group.id]?.length ?? 0) === 0,
  );

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        handleModalClose(open);
      }}
    >
      <DialogContent
        hideClose
        className="flex w-[calc(100%-2rem)] max-h-[86dvh] max-w-[440px] flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:w-full sm:rounded-2xl"
      >
        {/* Header image */}
        <div className="relative h-[118px] shrink-0 bg-muted">
          {images.length > 1 ? (
            <Carousel setApi={setImageApi} className="h-full" opts={{ loop: true }}>
              <CarouselContent className="ml-0 h-[118px]">
                {images.map((image, index) => (
                  <CarouselItem key={index} className="h-full pl-0">
                    <Image
                      width={440}
                      height={118}
                      src={image.url || "/placeholder.svg"}
                      alt={`${productData.name} - foto ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <Image
              width={440}
              height={118}
              src={images[0].url || "/placeholder.svg"}
              alt={productData.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

          {images.length > 1 && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
              {images.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full bg-card transition-all",
                    currentImage === index ? "w-4 opacity-100" : "w-1.5 opacity-60",
                  )}
                />
              ))}
            </div>
          )}

          {productTags.length > 0 && (
            <span className="absolute left-3 top-3 z-20 rounded-md bg-card/95 px-2.5 py-[3px] text-[10.5px] font-extrabold text-foreground">
              {productTags[0]}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleModalClose(false)}
            className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-card/95 text-foreground transition hover:bg-card"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Radix requires a title/description for a11y; the product name is shown visually below */}
        <DialogTitle className="sr-only">{productData.name}</DialogTitle>
        <DialogDescription className="sr-only">
          {productData.description || productData.name}
        </DialogDescription>

        {/* Scrollable middle section - keeps header and footer always visible */}
        <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-3 pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-extrabold tracking-[-0.02em] text-foreground">
                {productData.name}
              </h2>
              {productData.description && (
                <p className="mt-[3px] text-[12.5px] font-medium text-muted-foreground">
                  {productData.description}
                </p>
              )}
            </div>
            <span className="shrink-0 text-[16px] font-extrabold text-foreground">
              {formatCurrency(productData.salePrice || 0)}
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-3.5">
            {isCustomizationLoading ? (
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="h-[50px] animate-pulse rounded-[10px] bg-muted" />
                  <div className="h-[50px] animate-pulse rounded-[10px] bg-muted" />
                  <div className="h-[50px] animate-pulse rounded-[10px] bg-muted" />
                </div>
              </div>
            ) : (
              extraGroups.map((group) => (
                <SelectOptions
                  key={group.id}
                  group={group}
                  selectedIds={selections[group.id] || []}
                  onChange={handleSelectionChange}
                  quantities={addOnQuantities}
                  onQuantityChange={handleAddOnQuantityChange}
                  maxQuantity={ADD_ON_MAX_QUANTITY}
                />
              ))
            )}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setNotesOpen((prev) => !prev)}
              className="text-[11.5px] font-bold text-brand-500"
            >
              + Observações
            </button>

            {notesOpen && (
              <Textarea
                placeholder="Ex: sem cebola, bem passado…"
                value={customOrder.specialInstructions}
                onChange={(e) =>
                  setCustomOrder((prev) => ({
                    ...prev,
                    specialInstructions: e.target.value,
                  }))
                }
                rows={2}
                className="mt-2 resize-none rounded-[9px] border border-border bg-muted text-[12.5px] shadow-none focus-visible:ring-brand-400"
              />
            )}
          </div>
        </div>

        {/* Quantity and Add button */}
        <div className="flex shrink-0 items-center gap-3 border-t border-border bg-card px-[18px] py-3">
          <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-[10px] bg-muted px-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-[30px] items-center justify-center rounded-lg text-foreground disabled:opacity-40"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[22px] text-center text-sm font-extrabold text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-8 w-[30px] items-center justify-center rounded-lg text-foreground"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            onClick={handleConfirmAddToCart}
            disabled={
              isAddingToCart || isCustomizationLoading || !!pendingRequiredGroup
            }
            className="h-10 flex-1 rounded-[10px] bg-brand-500 text-[13.5px] font-extrabold text-white shadow-[0_4px_12px_var(--tw-shadow-color)] shadow-brand-500/30 hover:bg-brand-600 disabled:opacity-60"
          >
            {isCustomizationLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                Carregando...
              </span>
            ) : isAddingToCart ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                Adicionando...
              </span>
            ) : pendingRequiredGroup ? (
              <span>Selecione {pendingRequiredGroup.title.toLowerCase()}</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Adicionar</span>
                <span className="opacity-60">•</span>
                <span>{formatCurrency(totalPrice)}</span>
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
