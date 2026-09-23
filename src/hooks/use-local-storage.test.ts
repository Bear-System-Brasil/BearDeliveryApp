import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "./use-local-storage";

afterEach(() => {
  localStorage.clear();
});

describe("useLocalStorage", () => {
  it("usa o valor inicial quando não há nada salvo", () => {
    const { result } = renderHook(() => useLocalStorage("chave", "padrao"));
    expect(result.current[0]).toBe("padrao");
  });

  it("carrega o valor já salvo no localStorage, ignorando o inicial", () => {
    localStorage.setItem("chave", JSON.stringify("salvo"));
    const { result } = renderHook(() => useLocalStorage("chave", "padrao"));
    expect(result.current[0]).toBe("salvo");
  });

  it("setValue atualiza o estado e persiste no localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("chave", "padrao"));

    act(() => {
      result.current[1]("novo-valor");
    });

    expect(result.current[0]).toBe("novo-valor");
    expect(localStorage.getItem("chave")).toBe(JSON.stringify("novo-valor"));
  });

  it("setValue aceita uma função updater baseada no valor atual", () => {
    const { result } = renderHook(() => useLocalStorage("contador", 1));

    act(() => {
      result.current[1]((atual) => atual + 1);
    });

    expect(result.current[0]).toBe(2);
  });

  it("cai no valor inicial quando o conteúdo salvo não é um JSON válido", () => {
    localStorage.setItem("chave", "{json invalido");
    const { result } = renderHook(() => useLocalStorage("chave", "padrao"));
    expect(result.current[0]).toBe("padrao");
  });
});
