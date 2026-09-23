import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn, debounce, formatPrice, formatTime } from "./utils";

describe("cn", () => {
  it("junta classes simples com espaço", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("resolve conflito do tailwind mantendo a classe mais à direita", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("aceita objetos condicionais do clsx", () => {
    expect(cn({ block: true, hidden: false })).toBe("block");
  });
});

describe("formatPrice", () => {
  it("delega para o formatador de moeda em BRL", () => {
    // Intl.NumberFormat('pt-BR') usa NBSP ( ) entre "R$" e o valor.
    expect(formatPrice(35)).toBe("R$ 35,00");
  });

  it("formata zero corretamente", () => {
    expect(formatPrice(0)).toBe("R$ 0,00");
  });
});

describe("formatTime", () => {
  it("mostra só minutos quando é menos de uma hora", () => {
    expect(formatTime(45)).toBe("45 min");
  });

  it("mostra hora cheia sem minutos quando é múltiplo de 60", () => {
    expect(formatTime(120)).toBe("2h");
  });

  it("mostra hora e minuto quando não é múltiplo de 60", () => {
    expect(formatTime(90)).toBe("1h 30min");
  });

  it("trata 0 minuto como 'min', não como hora", () => {
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

  it("só chama a função depois do tempo de espera", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reinicia o timer a cada chamada, executando só a última", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("primeira");
    vi.advanceTimersByTime(100);
    debounced("segunda");
    vi.advanceTimersByTime(100);
    debounced("terceira");

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("terceira");
  });
});
