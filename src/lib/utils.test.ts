import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn, debounce, formatPrice, formatTime } from "./utils";

describe("cn", () => {
  it("junta classes simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolve conflitos do tailwind mantendo a última classe", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatPrice", () => {
  it("formata usando o padrão de moeda brasileira", () => {
    expect(formatPrice(10).replace(/ /g, " ")).toBe("R$ 10,00");
  });
});

describe("formatTime", () => {
  it("mostra apenas minutos quando menor que uma hora", () => {
    expect(formatTime(45)).toBe("45 min");
  });

  it("mostra apenas horas quando é hora cheia", () => {
    expect(formatTime(120)).toBe("2h");
  });

  it("mostra horas e minutos quando não é hora cheia", () => {
    expect(formatTime(90)).toBe("1h 30min");
  });

  it("trata zero minutos", () => {
    expect(formatTime(0)).toBe("0 min");
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("só chama a função depois do delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancela a chamada pendente quando invocado de novo antes do delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("a");
    vi.advanceTimersByTime(100);
    debounced("b");
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
  });
});
