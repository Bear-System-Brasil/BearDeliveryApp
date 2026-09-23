import { describe, expect, it } from "vitest";
import {
  formatCep,
  formatCnpj,
  formatCPF,
  formatCurrency,
  formatDate,
  formatPhone,
  formatPhoneDisplay,
  formatPhoneRegex,
  getCustomerDisplayName,
  isValidCep,
  isValidCnpj,
  isValidCpf,
  isValidPhone,
  onlyNumbers,
  toDateInputFormat,
} from "./formatter";

describe("toDateInputFormat", () => {
  it("converte data ISO com timezone para YYYY-MM-DD em UTC", () => {
    expect(toDateInputFormat("2024-03-15T10:00:00Z")).toBe("2024-03-15");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(toDateInputFormat("")).toBe("");
  });

  it("retorna string vazia para data inválida", () => {
    expect(toDateInputFormat("nao-e-uma-data")).toBe("");
  });
});

describe("formatCPF", () => {
  it("remove tudo que não é número", () => {
    expect(formatCPF("123.456.789-00")).toBe("12345678900");
  });
});

describe("formatPhone", () => {
  it("remove formatação e mantém DDD+número", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("11987654321");
  });

  it("remove o prefixo 55 quando o número tem 13 dígitos", () => {
    expect(formatPhone("+55 11 98765-4321")).toBe("11987654321");
  });

  it("não remove o '55' quando ele é parte do DDD/número, não prefixo do país", () => {
    // 11 dígitos (sem prefixo do país) não deve ser cortado mesmo que comece com 55
    expect(formatPhone("55987654321")).toBe("55987654321");
  });
});

describe("formatCnpj", () => {
  it("aplica a máscara 00.000.000/0000-00", () => {
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("trunca entradas maiores que 14 dígitos no tamanho da máscara", () => {
    expect(formatCnpj("123456780001999999")).toBe("12.345.678/0001-99");
  });
});

describe("formatPhoneDisplay", () => {
  it("aplica a máscara (00) 00000-0000", () => {
    expect(formatPhoneDisplay("11987654321")).toBe("(11) 98765-4321");
  });

  it("máscara telefone fixo de 10 dígitos parcialmente (sem o 5º dígito extra)", () => {
    expect(formatPhoneDisplay("1132654321")).toBe("(11) 32654-321");
  });
});

describe("formatCep", () => {
  it("aplica a máscara 00000-000", () => {
    expect(formatCep("01310100")).toBe("01310-100");
  });
});

describe("onlyNumbers", () => {
  it("mantém apenas dígitos", () => {
    expect(onlyNumbers("a1b2c3-d4")).toBe("1234");
  });
});

describe("formatCurrency (re-export)", () => {
  it("formata igual ao format-currency.ts, sem cair em 'R$ NaN'", () => {
    // Intl.NumberFormat('pt-BR') usa NBSP ( ) entre "R$" e o valor.
    expect(formatCurrency(35)).toBe("R$ 35,00");
    // @ts-expect-error - undefined nunca deveria acontecer no tipo, mas é
    // justamente o bug histórico (duas implementações divergiam aqui).
    expect(formatCurrency(undefined)).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("formata no padrão brasileiro por padrão", () => {
    expect(formatDate("2024-03-15")).toBe("15/03/2024");
  });

  it("aceita formato customizado", () => {
    expect(formatDate("2024-03-15", "YYYY-MM-DD")).toBe("2024-03-15");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(formatDate("")).toBe("");
  });
});

describe("isValidCpf / isValidCnpj / isValidPhone / isValidCep", () => {
  it("valida CPF pelo tamanho (11 dígitos)", () => {
    expect(isValidCpf("123.456.789-00")).toBe(true);
    expect(isValidCpf("123.456.789-0")).toBe(false);
  });

  it("valida CNPJ pelo tamanho (14 dígitos)", () => {
    expect(isValidCnpj("12.345.678/0001-99")).toBe(true);
    expect(isValidCnpj("12.345.678/0001-9")).toBe(false);
  });

  it("valida telefone celular pelo tamanho (11 dígitos após limpar)", () => {
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("(11) 8765-4321")).toBe(false);
  });

  it("valida CEP pelo tamanho (8 dígitos)", () => {
    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("01310-10")).toBe(false);
  });
});

describe("formatPhoneRegex", () => {
  it("formata telefone de 11 dígitos com espaço após o nono dígito", () => {
    expect(formatPhoneRegex("11987654321")).toBe("(11) 9 8765-4321");
  });

  it("mantém a string original quando não bate com 11 dígitos", () => {
    expect(formatPhoneRegex("123")).toBe("123");
  });
});

describe("getCustomerDisplayName", () => {
  it("usa o nome do cliente quando presente", () => {
    expect(getCustomerDisplayName({ name: "Maria" })).toBe("Maria");
  });

  it("cai para 'Cliente' quando o nome é vazio, só espaços ou ausente", () => {
    expect(getCustomerDisplayName({ name: "   " })).toBe("Cliente");
    expect(getCustomerDisplayName(null)).toBe("Cliente");
    expect(getCustomerDisplayName(undefined)).toBe("Cliente");
  });

  it("remove espaços nas bordas do nome", () => {
    expect(getCustomerDisplayName({ name: "  João  " })).toBe("João");
  });
});
