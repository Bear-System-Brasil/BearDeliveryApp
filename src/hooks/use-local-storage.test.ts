import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("usa o valor inicial quando não há nada salvo", () => {
    const { result } = renderHook(() => useLocalStorage("chave", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("lê o valor já salvo no localStorage em vez do valor inicial", () => {
    localStorage.setItem("chave", JSON.stringify("valor-salvo"));

    const { result } = renderHook(() => useLocalStorage("chave", "default"));

    expect(result.current[0]).toBe("valor-salvo");
  });

  it("setValue atualiza o estado E grava no localStorage como JSON", () => {
    const { result } = renderHook(() => useLocalStorage("chave", "default"));

    act(() => {
      const [, setValue] = result.current;
      setValue("novo-valor");
    });

    expect(result.current[0]).toBe("novo-valor");
    expect(localStorage.getItem("chave")).toBe(JSON.stringify("novo-valor"));
  });

  it("setValue aceita uma função updater, como o setState do React", () => {
    const { result } = renderHook(() => useLocalStorage("contador", 0));

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
    });
    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem("contador")).toBe("2");
  });

  it("persiste objetos complexos via JSON", () => {
    const { result } = renderHook(() =>
      useLocalStorage("obj", { a: 1, list: [1, 2, 3] }),
    );

    act(() => {
      const [, setValue] = result.current;
      setValue({ a: 2, list: [4, 5] });
    });

    expect(result.current[0]).toEqual({ a: 2, list: [4, 5] });
    expect(JSON.parse(localStorage.getItem("obj")!)).toEqual({ a: 2, list: [4, 5] });
  });

  it("se o JSON salvo estiver corrompido, cai para o valor inicial sem lançar", () => {
    localStorage.setItem("corrompido", "{isso nao e json valido");

    const { result } = renderHook(() => useLocalStorage("corrompido", "fallback"));

    expect(result.current[0]).toBe("fallback");
  });

  it("não lança quando localStorage.setItem falha (ex.: quota excedida)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    const { result } = renderHook(() => useLocalStorage("chave", "default"));

    expect(() => {
      act(() => {
        const [, setValue] = result.current;
        setValue("novo");
      });
    }).not.toThrow();

    // o estado em memória é atualizado mesmo que a escrita falhe
    expect(result.current[0]).toBe("novo");

    vi.restoreAllMocks();
  });

  it("duas instâncias do hook com a mesma chave não compartilham estado automaticamente", () => {
    const { result: a } = renderHook(() => useLocalStorage("chave-independente", "x"));
    const { result: b } = renderHook(() => useLocalStorage("chave-independente", "x"));

    act(() => {
      const [, setValue] = a.current;
      setValue("mudou-só-em-a");
    });

    expect(a.current[0]).toBe("mudou-só-em-a");
    expect(b.current[0]).toBe("x");
  });
});
