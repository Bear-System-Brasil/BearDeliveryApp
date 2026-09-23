import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  localStorageAdapter,
  sessionStorageAdapter,
  STORAGE_KEYS,
  storageManager,
  useStorageEvent,
} from "./storage-manager";

describe("localStorageAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("grava objeto serializado em JSON e recupera desserializado", () => {
    localStorageAdapter.setItem("obj", { a: 1, b: "x" });
    expect(localStorageAdapter.getItem<{ a: number; b: string }>("obj")).toEqual({
      a: 1,
      b: "x",
    });
  });

  it("grava string sem aspas extras (não faz JSON.stringify de string)", () => {
    localStorageAdapter.setItem("str", "valor-puro");
    expect(localStorage.getItem("str")).toBe("valor-puro");
    expect(localStorageAdapter.getItem("str")).toBe("valor-puro");
  });

  it("retorna null para chave ausente", () => {
    expect(localStorageAdapter.getItem("ausente")).toBeNull();
  });

  it("se o valor salvo não é JSON válido, devolve a string crua em vez de lançar", () => {
    localStorage.setItem("legado", "nao-e-json-mas-tambem-nao-e-numero");
    expect(localStorageAdapter.getItem("legado")).toBe(
      "nao-e-json-mas-tambem-nao-e-numero",
    );
  });

  it("remove item", () => {
    localStorageAdapter.setItem("a", "1");
    localStorageAdapter.removeItem("a");
    expect(localStorageAdapter.getItem("a")).toBeNull();
  });

  it("clear remove tudo", () => {
    localStorageAdapter.setItem("a", "1");
    localStorageAdapter.setItem("b", "2");
    localStorageAdapter.clear();
    expect(localStorage.length).toBe(0);
  });

  it("migrate move o valor da chave antiga para a nova e remove a antiga", () => {
    localStorageAdapter.setItem("antiga", "valor-legado");
    localStorageAdapter.migrate("antiga", "nova");

    expect(localStorageAdapter.getItem("antiga")).toBeNull();
    expect(localStorageAdapter.getItem("nova")).toBe("valor-legado");
  });

  it("migrate não faz nada quando a chave antiga não existe", () => {
    localStorageAdapter.migrate("nunca-existiu", "nova");
    expect(localStorageAdapter.getItem("nova")).toBeNull();
  });
});

describe("storageManager.local / .session", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("local e session são independentes um do outro", () => {
    storageManager.local.set(STORAGE_KEYS.SEARCH_FILTERS, { q: "pizza" });
    storageManager.session.set(STORAGE_KEYS.SEARCH_FILTERS, { q: "burguer" });

    expect(storageManager.local.get(STORAGE_KEYS.SEARCH_FILTERS)).toEqual({
      q: "pizza",
    });
    expect(storageManager.session.get(STORAGE_KEYS.SEARCH_FILTERS)).toEqual({
      q: "burguer",
    });
  });

  it("remove só afeta a área de storage correta", () => {
    storageManager.local.set(STORAGE_KEYS.SEARCH_FILTERS, "a");
    storageManager.session.set(STORAGE_KEYS.SEARCH_FILTERS, "b");

    storageManager.local.remove(STORAGE_KEYS.SEARCH_FILTERS);

    expect(storageManager.local.get(STORAGE_KEYS.SEARCH_FILTERS)).toBeNull();
    expect(storageManager.session.get(STORAGE_KEYS.SEARCH_FILTERS)).toBe("b");
  });
});

describe("storageManager.utils", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clearAuth remove tanto a chave do Zustand quanto as chaves legadas", () => {
    localStorage.setItem(STORAGE_KEYS.AUTH, "x");
    localStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN, "x");
    localStorage.setItem(STORAGE_KEYS.LEGACY_USER, "x");
    localStorage.setItem(STORAGE_KEYS.LEGACY_USER_TYPE, "x");
    localStorage.setItem(STORAGE_KEYS.LEGACY_USER_CONTEXT, "x");
    localStorage.setItem("outra-chave-nao-relacionada", "mantida");

    storageManager.utils.clearAuth();

    expect(localStorage.getItem(STORAGE_KEYS.AUTH)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LEGACY_USER)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LEGACY_USER_TYPE)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LEGACY_USER_CONTEXT)).toBeNull();
    expect(localStorage.getItem("outra-chave-nao-relacionada")).toBe("mantida");
  });

  it("clearSession limpa inteiramente o sessionStorage", () => {
    sessionStorage.setItem("qualquer", "coisa");
    storageManager.utils.clearSession();
    expect(sessionStorage.length).toBe(0);
  });

  it("getStorageSize soma o tamanho real de chave+valor gravados", () => {
    localStorage.clear();
    localStorage.setItem("k", "vvvv");

    const { used, total } = storageManager.utils.getStorageSize();

    expect(used).toBe("k".length + "vvvv".length);
    expect(total).toBe(5 * 1024 * 1024);
  });

  it("isNearLimit é false com pouco dado armazenado", () => {
    localStorage.clear();
    localStorage.setItem("k", "v");
    expect(storageManager.utils.isNearLimit()).toBe(false);
  });

  it("isNearLimit é true acima de 80% do limite simulado", () => {
    // Limite simulado é 5MB; 4.3M de caracteres passa dos 80%.
    const bigValue = "x".repeat(4_300_000);
    localStorage.setItem("big", bigValue);
    expect(storageManager.utils.isNearLimit()).toBe(true);
  });
});

describe("useStorageEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registra listener de 'storage' e chama o callback com o valor parseado", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.PREFERENCES, callback);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.PREFERENCES,
        newValue: JSON.stringify({ theme: "dark" }),
      }),
    );

    expect(callback).toHaveBeenCalledWith({ theme: "dark" });

    unsubscribe();
  });

  it("ignora eventos de outras chaves", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.PREFERENCES, callback);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "outra-chave",
        newValue: JSON.stringify({ theme: "dark" }),
      }),
    );

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("o unsubscribe de fato remove o listener", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.PREFERENCES, callback);
    unsubscribe();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.PREFERENCES,
        newValue: JSON.stringify({ theme: "dark" }),
      }),
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it("passa o valor bruto quando não é JSON válido", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.PREFERENCES, callback);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.PREFERENCES,
        newValue: "nao-e-json",
      }),
    );

    expect(callback).toHaveBeenCalledWith("nao-e-json");
    unsubscribe();
  });
});

describe("sessionStorageAdapter", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("é uma instância independente que opera sobre sessionStorage", () => {
    sessionStorageAdapter.setItem("chave", "valor");
    expect(sessionStorage.getItem("chave")).toBe("valor");
    expect(localStorage.getItem("chave")).toBeNull();
  });
});
