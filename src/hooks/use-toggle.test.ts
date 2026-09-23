import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToggle } from "./use-toggle";

describe("useToggle", () => {
  it("começa fechado por padrão", () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current.isOpen).toBe(false);
  });

  it("aceita um estado inicial customizado", () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current.isOpen).toBe(true);
  });

  it("toggle alterna entre aberto e fechado", () => {
    const { result } = renderHook(() => useToggle());

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });

  it("open e close forçam o estado, independente do valor atual", () => {
    const { result } = renderHook(() => useToggle());

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("setIsOpen permite definir o estado diretamente", () => {
    const { result } = renderHook(() => useToggle());

    act(() => result.current.setIsOpen(true));
    expect(result.current.isOpen).toBe(true);
  });
});
