import type { ProductVariation } from "@/services/api";

/**
 * Tamanho que o cliente consegue pedir de fato: disponível e com estoque.
 * Mesmo critério do "A partir de" do cardápio - `stockQuantity` ausente
 * conta como zero.
 */
export const isSellableVariation = (variation: ProductVariation) =>
  variation.isAvailable && (variation.stockQuantity ?? 0) > 0;

/**
 * Tamanho base: variação com priceModifier 0, ou seja, o próprio preço
 * base do prato como opção de tamanho. Sem ele o cliente não consegue
 * pedir o prato pelo preço base quando existem tamanhos (LDMF-271).
 */
export const isBaseSizeVariation = (variation: ProductVariation) =>
  variation.priceModifier === 0;
