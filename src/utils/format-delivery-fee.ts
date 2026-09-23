import { formatCurrency } from "@/utils/format-currency";

/**
 * Normaliza a taxa de entrega que a API manda como string livre ("R$ 6,90",
 * "6.9", "gratis") ou número para o rótulo exibido nos cards. `null` quando
 * a loja não informou taxa - o card então não mostra a linha de frete.
 */
export function formatDeliveryFee(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const normalizedValue = value.trim();
    const lowerValue = normalizedValue.toLowerCase();

    if (lowerValue.includes("grátis") || lowerValue.includes("gratis")) {
      return "Grátis";
    }

    const numericValue = Number(
      normalizedValue
        .replace(/R\$\s?/g, "")
        .replace(/\./g, "")
        .replace(",", "."),
    );

    if (!Number.isFinite(numericValue)) {
      return normalizedValue;
    }

    return numericValue > 0 ? formatCurrency(numericValue) : "Grátis";
  }

  return value > 0 ? formatCurrency(value) : "Grátis";
}

/**
 * Maior número de minutos de um tempo de entrega em texto ("35-45 min",
 * "até 30 min", "40min"). Serve pra filtrar "Até 30 min" sem depender do
 * formato exato que cada loja cadastrou. `null` quando não há número.
 */
export function parseDeliveryMaxMinutes(value?: string | null) {
  if (!value) return null;
  const numbers = value.match(/\d+/g);
  if (!numbers) return null;
  return Math.max(...numbers.map(Number));
}
