import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "./use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devolve o valor inicial imediatamente, antes de qualquer delay", () => {
    const { result } = renderHook(() => useDebounce("inicial", 300));
    expect(result.current).toBe("inicial");
  });

  it("só atualiza depois do delay quando o valor muda", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 300 },
    });

    rerender({ value: "b", delay: 300 });
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
  });

  it("reinicia o timer a cada mudança, aplicando só o último valor", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(150));
    rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(150));

    // ainda não passou 300ms desde o último rerender ("c")
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe("c");
  });

  it("funciona com valores não-string (números, objetos)", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: { count: 1 } },
    });

    rerender({ value: { count: 2 } });
    act(() => vi.advanceTimersByTime(100));

    expect(result.current).toEqual({ count: 2 });
  });
});
