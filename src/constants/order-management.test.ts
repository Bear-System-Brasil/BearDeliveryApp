import { describe, expect, it } from "vitest";
import {
  getAddOnLabel,
  getOrderItemDisplayName,
  getOrderItemTotal,
  getVariationLabel,
} from "./order-management";

describe("getOrderItemTotal", () => {
  it("soma o produto sozinho quando não há adicionais nem variações", () => {
    expect(getOrderItemTotal({ quantity: 2, unitPrice: 35 })).toBe(70);
  });

  it("cobra o adicional por unidade do produto (order-item.md)", () => {
    // 2x Feijoada (R$35) + 2x Torresmo extra (R$5, por unidade do produto)
    // produto: 2 × 35 = 70 · complemento: 2 × 2 × 5 = 20 · total: 90
    const total = getOrderItemTotal({
      quantity: 2,
      unitPrice: 35,
      addOns: [{ priceSnapshot: 5, quantity: 2 }],
    });
    expect(total).toBe(90);
  });

  it("soma variação e adicional juntos, cada um escalando com a quantidade do item", () => {
    const total = getOrderItemTotal({
      quantity: 2,
      unitPrice: 35,
      addOns: [{ priceSnapshot: 5, quantity: 2 }],
      variations: [{ priceSnapshot: 5 }],
    });
    expect(total).toBe(100);
  });

  it("trata unitPrice/priceSnapshot ausentes como zero, sem quebrar", () => {
    expect(getOrderItemTotal({ quantity: 3 })).toBe(0);
  });
});

describe("getOrderItemDisplayName", () => {
  it("usa o nome do produto quando presente", () => {
    expect(
      getOrderItemDisplayName({ productId: "abc123", product: { name: "Pizza" } }),
    ).toBe("Pizza");
  });

  it("cai para um rótulo com o id truncado quando não há produto", () => {
    expect(getOrderItemDisplayName({ productId: "abcdef123456" })).toBe(
      "Produto #abcdef",
    );
  });
});

describe("getAddOnLabel / getVariationLabel", () => {
  it("segue a cadeia de fallback até achar um nome utilizável", () => {
    expect(getAddOnLabel({ productAddOns: { description: "Bacon extra" } })).toBe(
      "Bacon extra",
    );
    expect(getAddOnLabel({})).toBe("Adicional");
  });

  it("mesma cadeia de fallback para variação", () => {
    expect(
      getVariationLabel({ productVariation: { name: "Tamanho grande" } }),
    ).toBe("Tamanho grande");
    expect(getVariationLabel({})).toBe("Variação");
  });
});
