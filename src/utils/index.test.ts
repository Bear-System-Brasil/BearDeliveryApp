import { describe, expect, it } from "vitest";
import { formatNumber, getErrorMessage, slugify, truncateString } from "./index";

describe("formatNumber", () => {
  it("formata milhar no padrão pt-BR", () => {
    expect(formatNumber(1234)).toBe("1.234");
  });

  it("mantém números pequenos sem separador", () => {
    expect(formatNumber(9)).toBe("9");
  });
});

describe("truncateString", () => {
  it("mantém a string intacta quando já é curta o suficiente", () => {
    expect(truncateString("Pizza", 10)).toBe("Pizza");
  });

  it("trunca e adiciona reticências quando excede o tamanho máximo", () => {
    expect(truncateString("Pizza de Calabresa", 5)).toBe("Pizza...");
  });

  it("trata o limite exato sem truncar", () => {
    expect(truncateString("Pizza", 5)).toBe("Pizza");
  });
});

describe("slugify", () => {
  it("troca espaços por hífen e força minúsculas", () => {
    expect(slugify("Pizza Grande")).toBe("pizza-grande");
  });

  it("remove acentos", () => {
    expect(slugify("Refrigerante Guaraná")).toBe("refrigerante-guarana");
  });

  it("remove caracteres especiais", () => {
    expect(slugify("Combo (2 pessoas)!")).toBe("combo-2-pessoas");
  });

  it("remove hífens nas pontas depois da limpeza", () => {
    expect(slugify("  -Pizza-  ")).toBe("pizza");
  });
});

describe("getErrorMessage", () => {
  it("extrai a mensagem de uma instância de Error", () => {
    expect(getErrorMessage(new Error("deu ruim"), "fallback")).toBe("deu ruim");
  });

  it("extrai message de um objeto de resposta de API", () => {
    expect(getErrorMessage({ message: "não autorizado" }, "fallback")).toBe(
      "não autorizado",
    );
  });

  it("usa a própria string quando o erro já é uma string", () => {
    expect(getErrorMessage("algo deu errado", "fallback")).toBe("algo deu errado");
  });

  it("cai no fallback para formatos desconhecidos", () => {
    expect(getErrorMessage({ codigo: 500 }, "fallback")).toBe("fallback");
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
