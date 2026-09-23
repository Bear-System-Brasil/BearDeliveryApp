import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToggle } from "./use-toggle";

describe("useToggle", () => {
  it("começa fechado por padrão", () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current.isOpen).toBe(false);
  });

  it("aceita estado inicial customizado", () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current.isOpen).toBe(true);
  });

  it("toggle inverte o estado a cada chamada", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });

  it("open sempre deixa true, mesmo chamado repetidamente", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => result.current.open());
    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
  });

  it("close sempre deixa false", () => {
    const { result } = renderHook(() => useToggle(true));

    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
  });

  it("setIsOpen permite definir o valor diretamente", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => result.current.setIsOpen(true));

    expect(result.current.isOpen).toBe(true);
  });
});
