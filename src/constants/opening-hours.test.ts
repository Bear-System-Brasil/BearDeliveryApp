import { describe, expect, it } from "vitest";

import { getTodayKey, parseOpeningHours } from "./opening-hours";

describe("parseOpeningHours", () => {
  it("devolve null pra vazio ou formato desconhecido - quem chama usa o padrão", () => {
    expect(parseOpeningHours([])).toBeNull();
    expect(parseOpeningHours(undefined)).toBeNull();
    expect(parseOpeningHours([{ foo: "bar" }])).toBeNull();
  });

  it("lê dias em vários formatos e marca os ausentes como fechado", () => {
    const hours = parseOpeningHours([
      { day: "mon", openTime: "18:00", closeTime: "23:00" },
      { weekday: "Sábado", open: "19:00", close: "01:00", isOpen: true },
      { dayOfWeek: 0, open: "10:00", close: "16:00", isOpen: false },
    ]);

    expect(hours).toHaveLength(7);
    expect(hours?.[0]).toMatchObject({
      day: "mon",
      label: "Segunda",
      isOpen: true,
      openTime: "18:00",
      closeTime: "23:00",
    });
    expect(hours?.[5]).toMatchObject({ day: "sat", isOpen: true, openTime: "19:00" });
    // isOpen falso vindo da API vence os horários
    expect(hours?.[6]).toMatchObject({ day: "sun", isOpen: false });
    // terça não veio: fechado
    expect(hours?.[1]).toMatchObject({ day: "tue", isOpen: false, openTime: "" });
  });
});

describe("getTodayKey", () => {
  it("mapeia getDay() (domingo = 0) pra semana começando na segunda", () => {
    expect(getTodayKey(new Date(2026, 8, 20))).toBe("sun"); // 20/09/2026 é domingo
    expect(getTodayKey(new Date(2026, 8, 21))).toBe("mon");
    expect(getTodayKey(new Date(2026, 8, 26))).toBe("sat");
  });
});
