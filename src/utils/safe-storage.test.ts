import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeStorage } from "./safe-storage";

describe("safeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("grava e lê valores reais do localStorage do jsdom", () => {
    expect(safeStorage.setItem("chave", "valor")).toBe(true);
    expect(safeStorage.getItem("chave")).toBe("valor");
    expect(localStorage.getItem("chave")).toBe("valor");
  });

  it("retorna null ao ler chave inexistente", () => {
    expect(safeStorage.getItem("nao-existe")).toBeNull();
  });

  it("remove item de fato do storage", () => {
    localStorage.setItem("chave", "valor");
    safeStorage.removeItem("chave");
    expect(localStorage.getItem("chave")).toBeNull();
  });

  it("limpa todo o storage", () => {
    localStorage.setItem("a", "1");
    localStorage.setItem("b", "2");
    safeStorage.clear();
    expect(localStorage.length).toBe(0);
  });

  it("não lança quando localStorage.getItem lança erro; devolve null", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(safeStorage.getItem("chave")).toBeNull();
  });

  it("ao exceder a quota, libera productImages/productCategories e tenta salvar de novo", () => {
    localStorage.setItem("productImages", "dados-grandes");
    localStorage.setItem("productCategories", "outros-dados");

    const realSetItem = Storage.prototype.setItem.bind(localStorage);
    let calls = 0;
    // Falha só na 1ª chamada (quota cheia); o retry, após limpar os dados
    // temporários, cai na implementação real do jsdom.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      calls++;
      if (calls === 1) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return realSetItem(key, value);
    });

    const result = safeStorage.setItem("novaChave", "novoValor");

    expect(result).toBe(true);
    expect(localStorage.getItem("productImages")).toBeNull();
    expect(localStorage.getItem("productCategories")).toBeNull();
    expect(localStorage.getItem("novaChave")).toBe("novoValor");
  });

  it("retorna false quando falha mesmo depois de tentar liberar espaço", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(safeStorage.setItem("chave", "valor")).toBe(false);
  });

  it("retorna false para erro que não é QuotaExceededError, sem tentar liberar espaço", () => {
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("erro genérico");
    });

    expect(safeStorage.setItem("chave", "valor")).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it("getUsageInfo soma o tamanho de chave+valor de todo o storage", () => {
    localStorage.clear();
    localStorage.setItem("ab", "1234");

    const info = safeStorage.getUsageInfo();

    expect(info).not.toBeNull();
    expect(info!.used).toBe("ab".length + "1234".length);
    expect(info!.total).toBe(5 * 1024 * 1024);
    expect(info!.percentage).toBeCloseTo((info!.used / info!.total) * 100);
  });
});
