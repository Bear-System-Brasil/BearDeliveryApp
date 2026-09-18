import { afterEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS, storageManager, useStorageEvent } from "./storage-manager";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("storageManager.local", () => {
  it("guarda e recupera um objeto, com round-trip via JSON", () => {
    storageManager.local.set(STORAGE_KEYS.FAVORITES, { favorites: ["rest-1"] });
    expect(storageManager.local.get(STORAGE_KEYS.FAVORITES)).toEqual({
      favorites: ["rest-1"],
    });
  });

  it("guarda uma string sem envolver em aspas de JSON", () => {
    storageManager.local.set(STORAGE_KEYS.LEGACY_TOKEN, "abc123");
    expect(localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN)).toBe("abc123");
    expect(storageManager.local.get(STORAGE_KEYS.LEGACY_TOKEN)).toBe("abc123");
  });

  it("retorna null quando a chave não existe", () => {
    expect(storageManager.local.get(STORAGE_KEYS.LEGACY_TOKEN)).toBeNull();
  });

  it("remove uma chave específica", () => {
    storageManager.local.set(STORAGE_KEYS.LEGACY_TOKEN, "abc123");
    storageManager.local.remove(STORAGE_KEYS.LEGACY_TOKEN);
    expect(storageManager.local.get(STORAGE_KEYS.LEGACY_TOKEN)).toBeNull();
  });

  it("clear apaga tudo do localStorage", () => {
    storageManager.local.set(STORAGE_KEYS.LEGACY_TOKEN, "abc123");
    storageManager.local.clear();
    expect(localStorage.length).toBe(0);
  });
});

describe("storageManager.session", () => {
  it("guarda e recupera dados isolados do localStorage", () => {
    storageManager.session.set(STORAGE_KEYS.SEARCH_FILTERS, { category: "pizza" });

    expect(storageManager.session.get(STORAGE_KEYS.SEARCH_FILTERS)).toEqual({
      category: "pizza",
    });
    expect(storageManager.local.get(STORAGE_KEYS.SEARCH_FILTERS)).toBeNull();
  });
});

describe("storageManager.utils.clearAuth", () => {
  it("remove todas as chaves de autenticação, novas e legadas", () => {
    storageManager.local.set(STORAGE_KEYS.AUTH, { state: { token: "t" } });
    storageManager.local.set(STORAGE_KEYS.LEGACY_TOKEN, "legacy-token");
    storageManager.local.set(STORAGE_KEYS.LEGACY_USER, { id: "u1" });

    storageManager.utils.clearAuth();

    expect(storageManager.local.get(STORAGE_KEYS.AUTH)).toBeNull();
    expect(storageManager.local.get(STORAGE_KEYS.LEGACY_TOKEN)).toBeNull();
    expect(storageManager.local.get(STORAGE_KEYS.LEGACY_USER)).toBeNull();
  });
});

describe("storageManager.utils.getStorageSize / isNearLimit", () => {
  it("cresce conforme mais dados são gravados", () => {
    const before = storageManager.utils.getStorageSize().used;
    storageManager.local.set(STORAGE_KEYS.LEGACY_TOKEN, "x".repeat(1000));
    const after = storageManager.utils.getStorageSize().used;

    expect(after).toBeGreaterThan(before);
  });

  it("isNearLimit é falso para um uso pequeno de storage", () => {
    expect(storageManager.utils.isNearLimit()).toBe(false);
  });
});

describe("useStorageEvent", () => {
  it("chama o callback com o valor parseado quando o evento bate com a chave", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.FAVORITES, callback);

    const event = new StorageEvent("storage", {
      key: STORAGE_KEYS.FAVORITES,
      newValue: JSON.stringify({ favorites: ["rest-1"] }),
    });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledWith({ favorites: ["rest-1"] });
    unsubscribe();
  });

  it("ignora eventos de outras chaves", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.FAVORITES, callback);

    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEYS.CART_ORDER_ID, newValue: "1" }),
    );

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("o unsubscribe remove o listener", () => {
    const callback = vi.fn();
    const unsubscribe = useStorageEvent(STORAGE_KEYS.FAVORITES, callback);
    unsubscribe();

    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEYS.FAVORITES, newValue: "\"x\"" }),
    );

    expect(callback).not.toHaveBeenCalled();
  });
});
