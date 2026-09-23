import { describe, expect, it } from "vitest";
import {
  formatCep,
  formatCnpj,
  formatCPF,
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

describe("formatCPF", () => {
  it("remove tudo que não é dígito", () => {
    expect(formatCPF("123.456.789-00")).toBe("12345678900");
  });
});

describe("formatPhone", () => {
  it("remove caracteres não numéricos", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("11987654321");
  });

  it("remove o prefixo +55 quando o número tem DDI", () => {
    expect(formatPhone("+55 11 98765-4321")).toBe("11987654321");
  });

  it("não mexe em número sem DDI, mesmo começando com 55 (DDD)", () => {
    expect(formatPhone("55987654321")).toBe("55987654321");
  });
});

describe("formatCnpj", () => {
  it("aplica a máscara 00.000.000/0000-00", () => {
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("trunca entrada maior que 14 dígitos", () => {
    expect(formatCnpj("123456780001999999")).toBe("12.345.678/0001-99");
  });
});

describe("formatPhoneDisplay", () => {
  it("aplica a máscara (00) 00000-0000", () => {
    expect(formatPhoneDisplay("11987654321")).toBe("(11) 98765-4321");
  });
});

describe("formatCep", () => {
  it("aplica a máscara 00000-000", () => {
    expect(formatCep("01310100")).toBe("01310-100");
  });
});

describe("onlyNumbers", () => {
  it("mantém somente dígitos", () => {
    expect(onlyNumbers("R$ 1.234,56")).toBe("123456");
  });
});

describe("isValidCpf / isValidCnpj / isValidPhone / isValidCep", () => {
  it("valida pelo total de dígitos esperado", () => {
    expect(isValidCpf("123.456.789-00")).toBe(true);
    expect(isValidCpf("123")).toBe(false);

    expect(isValidCnpj("12.345.678/0001-99")).toBe(true);
    expect(isValidCnpj("123")).toBe(false);

    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("123")).toBe(false);

    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("123")).toBe(false);
  });
});

describe("formatPhoneRegex", () => {
  it("formata um celular de 11 dígitos como (00) 0 0000-0000", () => {
    expect(formatPhoneRegex("11987654321")).toBe("(11) 9 8765-4321");
  });

  it("mantém a string original quando não bate com 11 dígitos", () => {
    expect(formatPhoneRegex("1198765432")).toBe("1198765432");
  });
});

describe("getCustomerDisplayName", () => {
  it("usa o nome do cliente quando presente", () => {
    expect(getCustomerDisplayName({ name: "Maria" })).toBe("Maria");
  });

  it("cai para 'Cliente' quando não há relação ou nome vazio", () => {
    expect(getCustomerDisplayName(null)).toBe("Cliente");
    expect(getCustomerDisplayName(undefined)).toBe("Cliente");
    expect(getCustomerDisplayName({ name: "   " })).toBe("Cliente");
  });
});

describe("toDateInputFormat", () => {
  it("converte uma data ISO para YYYY-MM-DD em UTC", () => {
    expect(toDateInputFormat("2024-03-15T10:00:00.000Z")).toBe("2024-03-15");
  });

  it("retorna string vazia para entrada vazia ou inválida", () => {
    expect(toDateInputFormat("")).toBe("");
    expect(toDateInputFormat("não-é-uma-data")).toBe("");
  });
});
