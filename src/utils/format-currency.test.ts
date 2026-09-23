import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  parseCurrency,
} from "./format-currency";

// Intl.NumberFormat('pt-BR') sempre usa NBSP ( ), não espaço comum,
// entre "R$" e o valor.
const NBSP = " ";

describe("formatCurrency", () => {
  it("formata número no padrão brasileiro com símbolo", () => {
    expect(formatCurrency(1234.56)).toBe(`R$${NBSP}1.234,56`);
  });

  it("formata string numérica", () => {
    expect(formatCurrency("35.5")).toBe(`R$${NBSP}35,50`);
  });

  it("omite o símbolo quando showSymbol é false", () => {
    expect(formatCurrency(35, { showSymbol: false })).toBe("35,00");
  });

  it("cai para 'R$ 0,00' quando o valor não é numérico", () => {
    expect(formatCurrency("abacate")).toBe("R$ 0,00");
    expect(formatCurrency(NaN)).toBe("R$ 0,00");
  });

  it("cai para '0,00' sem símbolo quando o valor não é numérico e showSymbol é false", () => {
    expect(formatCurrency("abacate", { showSymbol: false })).toBe("0,00");
  });

  it("respeita minimumFractionDigits/maximumFractionDigits customizados", () => {
    expect(
      formatCurrency(35, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    ).toBe(`R$${NBSP}35`);
  });

  it("formata valor negativo mantendo o sinal", () => {
    expect(formatCurrency(-10)).toBe(`-R$${NBSP}10,00`);
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe(`R$${NBSP}0,00`);
  });
});

describe("formatCurrencyCompact", () => {
  it("abrevia valores grandes com sufixo", () => {
    expect(formatCurrencyCompact(1200)).toBe(`R$${NBSP}1,2${NBSP}mil`);
  });

  it("mantém valores pequenos sem abreviação", () => {
    expect(formatCurrencyCompact(50)).toBe(`R$${NBSP}50`);
  });
});

describe("parseCurrency", () => {
  it("converte string formatada em BRL para número", () => {
    expect(parseCurrency("R$ 1.234,56")).toBe(1234.56);
  });

  it("funciona sem o símbolo R$", () => {
    expect(parseCurrency("1.234,56")).toBe(1234.56);
  });

  it("funciona com valores sem separador de milhar", () => {
    expect(parseCurrency("R$ 35,00")).toBe(35);
  });

  it("retorna 0 para string vazia ou não numérica", () => {
    expect(parseCurrency("")).toBe(0);
    expect(parseCurrency("R$ abc")).toBe(0);
  });

  it("é o inverso de formatCurrency para valores redondos", () => {
    const value = 987.65;
    expect(parseCurrency(formatCurrency(value))).toBe(value);
  });
});
