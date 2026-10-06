import type { ProductVariation } from "@/services/api";
import { describe, expect, it } from "vitest";

import { isBaseSizeVariation, isSellableVariation } from "./product-variation";

const variation = (
  overrides: Partial<ProductVariation> = {},
): ProductVariation => ({
  id: "var-1",
  name: "Grande",
  priceModifier: 10,
  isAvailable: true,
  stockQuantity: 5,
  productId: "prod-1",
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("isSellableVariation", () => {
  it("aceita tamanho disponível e com estoque", () => {
    expect(isSellableVariation(variation())).toBe(true);
  });

  it("recusa tamanho indisponível", () => {
    expect(isSellableVariation(variation({ isAvailable: false }))).toBe(false);
  });

  it("recusa estoque zero ou ausente", () => {
    expect(isSellableVariation(variation({ stockQuantity: 0 }))).toBe(false);
    expect(isSellableVariation(variation({ stockQuantity: undefined }))).toBe(
      false,
    );
  });
});

describe("isBaseSizeVariation", () => {
  it("é base só com priceModifier 0", () => {
    expect(isBaseSizeVariation(variation({ priceModifier: 0 }))).toBe(true);
    expect(isBaseSizeVariation(variation({ priceModifier: 5 }))).toBe(false);
  });
});
