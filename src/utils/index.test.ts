import { describe, expect, it } from "vitest";
import { formatNumber, getErrorMessage, slugify, truncateString } from "./index";

describe("formatNumber", () => {
  it("formata milhar com separador brasileiro", () => {
    expect(formatNumber(1234)).toBe("1.234");
  });

  it("formata número pequeno sem separador", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("truncateString", () => {
  it("mantém string intacta quando já é menor que o limite", () => {
    expect(truncateString("abc", 10)).toBe("abc");
  });

  it("trunca e adiciona '...' quando excede o limite", () => {
    expect(truncateString("abcdefghij", 5)).toBe("abcde...");
  });

  it("trata o limite exato sem truncar", () => {
    expect(truncateString("abcde", 5)).toBe("abcde");
  });
});

describe("slugify", () => {
  it("troca espaços por hífen e deixa minúsculo", () => {
    expect(slugify("Pizza Grande")).toBe("pizza-grande");
  });

  it("remove acentos", () => {
    expect(slugify("Feijoada à Paulista")).toBe("feijoada-a-paulista");
  });

  it("remove caracteres especiais", () => {
    expect(slugify("Combo R$ 20,00!")).toBe("combo-r-2000");
  });

  it("colapsa espaços/underscores repetidos em um único hífen", () => {
    expect(slugify("a   b__c")).toBe("a-b-c");
  });

  it("remove hífens nas bordas", () => {
    expect(slugify("  -Pizza-  ")).toBe("pizza");
  });
});

describe("getErrorMessage", () => {
  it("extrai a mensagem de uma instância de Error", () => {
    expect(getErrorMessage(new Error("falhou"), "fallback")).toBe("falhou");
  });

  it("extrai message de um objeto de resposta de API", () => {
    expect(getErrorMessage({ message: "CPF inválido" }, "fallback")).toBe(
      "CPF inválido",
    );
  });

  it("usa a própria string como mensagem", () => {
    expect(getErrorMessage("algo deu errado", "fallback")).toBe("algo deu errado");
  });

  it("usa o fallback para valores sem mensagem reconhecível", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getErrorMessage(42, "fallback")).toBe("fallback");
    expect(getErrorMessage({ code: 500 }, "fallback")).toBe("fallback");
  });

  it("usa o fallback quando message existe mas não é string", () => {
    expect(getErrorMessage({ message: 123 }, "fallback")).toBe("fallback");
  });
});
