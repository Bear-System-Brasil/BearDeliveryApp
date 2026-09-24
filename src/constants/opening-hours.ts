export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  day: DayKey;
  label: string;
  isOpen: boolean;
  /** "HH:mm" */
  openTime: string;
  closeTime: string;
}

/** Ordem da semana como aparece na tela (segunda a domingo). */
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

/**
 * Horário de vitrine enquanto a API não manda `openingHours` preenchido
 * (TODO(backend): o campo já existe em GET /company/:id, mas vem vazio e o
 * contrato de escrita não foi confirmado). É o mesmo mock que a tela de
 * perfil da loja usa pra editar.
 */
export const DEFAULT_OPENING_HOURS: DayHours[] = [
  { day: "mon", label: "Segunda", isOpen: true, openTime: "18:00", closeTime: "23:00" },
  { day: "tue", label: "Terça", isOpen: true, openTime: "18:00", closeTime: "23:00" },
  { day: "wed", label: "Quarta", isOpen: true, openTime: "18:00", closeTime: "23:00" },
  { day: "thu", label: "Quinta", isOpen: true, openTime: "18:00", closeTime: "23:00" },
  { day: "fri", label: "Sexta", isOpen: true, openTime: "18:00", closeTime: "23:30" },
  { day: "sat", label: "Sábado", isOpen: true, openTime: "18:00", closeTime: "23:30" },
  { day: "sun", label: "Domingo", isOpen: false, openTime: "18:00", closeTime: "22:00" },
];

/** `Date.getDay()` começa no domingo (0). */
export function getTodayKey(date = new Date()): DayKey {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

const TIME_PATTERN = /^\d{1,2}:\d{2}$/;

const DAY_ALIASES: Record<string, DayKey> = {
  mon: "mon", monday: "mon", seg: "mon", segunda: "mon", "1": "mon",
  tue: "tue", tuesday: "tue", ter: "tue", terca: "tue", terça: "tue", "2": "tue",
  wed: "wed", wednesday: "wed", qua: "wed", quarta: "wed", "3": "wed",
  thu: "thu", thursday: "thu", qui: "thu", quinta: "thu", "4": "thu",
  fri: "fri", friday: "fri", sex: "fri", sexta: "fri", "5": "fri",
  sat: "sat", saturday: "sat", sab: "sat", sabado: "sat", sábado: "sat", "6": "sat",
  sun: "sun", sunday: "sun", dom: "sun", domingo: "sun", "0": "sun", "7": "sun",
};

function pick(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/**
 * Lê o `openingHours` da API quando vier num formato reconhecível
 * (`{ day|weekday, openTime|open, closeTime|close, isOpen? }` por dia).
 * Dias ausentes viram "Fechado". Devolve `null` quando não dá pra ler, e
 * quem chama cai no horário padrão.
 */
export function parseOpeningHours(raw: unknown): DayHours[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const byDay = new Map<DayKey, DayHours>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;

    const dayRaw = pick(item, ["day", "weekday", "dayOfWeek", "weekDay"]);
    const day = DAY_ALIASES[String(dayRaw ?? "").trim().toLowerCase()];
    if (!day) continue;

    const openTime = String(pick(item, ["openTime", "open", "opensAt", "start"]) ?? "");
    const closeTime = String(pick(item, ["closeTime", "close", "closesAt", "end"]) ?? "");
    const hasTimes = TIME_PATTERN.test(openTime) && TIME_PATTERN.test(closeTime);
    const isOpenRaw = pick(item, ["isOpen", "open_day", "enabled"]);
    const isOpen = typeof isOpenRaw === "boolean" ? isOpenRaw && hasTimes : hasTimes;

    byDay.set(day, {
      day,
      label: DAY_LABELS[day],
      isOpen,
      openTime: hasTimes ? openTime : "",
      closeTime: hasTimes ? closeTime : "",
    });
  }

  if (byDay.size === 0) return null;

  return DAY_KEYS.map(
    (day) =>
      byDay.get(day) ?? {
        day,
        label: DAY_LABELS[day],
        isOpen: false,
        openTime: "",
        closeTime: "",
      },
  );
}
