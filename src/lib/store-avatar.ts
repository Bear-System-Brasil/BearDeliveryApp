/**
 * Avatar de loja sem logo (ou com logo quebrado): iniciais sobre uma cor
 * fixa por nome, pra mesma loja ficar sempre igual entre seções.
 */

// Paleta dos mocks "Lojas Compacto" / "Novidades Carrossel".
const STORE_COLORS = [
  "#8E1B14",
  "#4A1D6E",
  "#211E1B",
  "#0E5F58",
  "#A83208",
  "#C2185B",
];

const INITIALS_STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "na",
  "no",
]);

export function getStoreInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word && !INITIALS_STOPWORDS.has(word.toLowerCase()));

  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function getStoreColor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return STORE_COLORS[Math.abs(hash) % STORE_COLORS.length];
}
