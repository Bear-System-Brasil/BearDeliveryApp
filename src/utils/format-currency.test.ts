import { describe, expect, it } from "vitest";
import { formatCurrency, formatCurrencyCompact, parseCurrency } from "./format-currency";

const norm = (value: string) => value.replace(/ /g, " ");

describe("formatCurrency", () => {
  it("formata um número no padrão R$ 1.234,56", () => {
    expect(norm(formatCurrency(1234.5))).toBe("R$ 1.234,50");
  });

  it("aceita valor em string", () => {
    expect(norm(formatCurrency("99.9"))).toBe("R$ 99,90");
  });

  it("cai para R$ 0,00 quando o valor não é um número válido", () => {
    expect(formatCurrency("abc")).toBe("R$ 0,00");
    expect(formatCurrency(NaN)).toBe("R$ 0,00");
  });

  it("omite o símbolo quando showSymbol é false", () => {
    expect(norm(formatCurrency(10, { showSymbol: false }))).toBe("10,00");
    expect(formatCurrency("abc", { showSymbol: false })).toBe("0,00");
  });

  it("respeita minimumFractionDigits/maximumFractionDigits customizados", () => {
    expect(
      norm(formatCurrency(10, { minimumFractionDigits: 0, maximumFractionDigits: 0 })),
    ).toBe("R$ 10");
  });
});

describe("formatCurrencyCompact", () => {
  it("formata valores grandes de forma compacta", () => {
    expect(norm(formatCurrencyCompact(1500))).toBe("R$ 1,5 mil");
  });
});

describe("parseCurrency", () => {
  it("converte string formatada de volta para número", () => {
    expect(parseCurrency("R$ 1.234,56")).toBe(1234.56);
  });

  it("funciona sem o símbolo de moeda", () => {
    expect(parseCurrency("99,90")).toBe(99.9);
  });

  it("retorna 0 para entrada inválida", () => {
    expect(parseCurrency("abc")).toBe(0);
  });
});
