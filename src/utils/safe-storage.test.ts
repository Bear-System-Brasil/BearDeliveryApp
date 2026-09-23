import { afterEach, describe, expect, it, vi } from "vitest";
import { safeStorage } from "./safe-storage";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("safeStorage - operações básicas", () => {
  it("seta e lê um valor", () => {
    expect(safeStorage.setItem("chave", "valor")).toBe(true);
    expect(safeStorage.getItem("chave")).toBe("valor");
  });

  it("getItem retorna null quando a chave não existe", () => {
    expect(safeStorage.getItem("inexistente")).toBeNull();
  });

  it("removeItem apaga a chave", () => {
    safeStorage.setItem("chave", "valor");
    safeStorage.removeItem("chave");
    expect(safeStorage.getItem("chave")).toBeNull();
  });

  it("clear apaga tudo do localStorage", () => {
    safeStorage.setItem("a", "1");
    safeStorage.setItem("b", "2");
    safeStorage.clear();
    expect(localStorage.length).toBe(0);
  });
});

describe("safeStorage.getItem - erro de leitura", () => {
  it("retorna null e não lança quando localStorage.getItem falha", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("boom");
    });

    expect(safeStorage.getItem("chave")).toBeNull();
  });
});

describe("safeStorage.setItem - quota excedida", () => {
  it("libera productImages/productCategories e tenta salvar de novo", () => {
    localStorage.setItem("productImages", "muito grande");
    localStorage.setItem("productCategories", "muito grande");

    const original = Storage.prototype.setItem.bind(localStorage);
    let callCount = 0;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => {
      callCount += 1;
      if (callCount === 1) {
        throw new DOMException("quota excedida", "QuotaExceededError");
      }
      original(key, value);
    });

    const result = safeStorage.setItem("nova-chave", "valor");

    expect(result).toBe(true);
    expect(callCount).toBe(2);
    expect(localStorage.getItem("nova-chave")).toBe("valor");
    expect(localStorage.getItem("productImages")).toBeNull();
    expect(localStorage.getItem("productCategories")).toBeNull();
  });

  it("retorna false quando falha mesmo depois de liberar espaço", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota excedida", "QuotaExceededError");
    });

    expect(safeStorage.setItem("chave", "valor")).toBe(false);
  });

  it("retorna false sem tentar de novo para erros que não são de quota", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("erro genérico");
      });

    expect(safeStorage.setItem("chave", "valor")).toBe(false);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });
});
