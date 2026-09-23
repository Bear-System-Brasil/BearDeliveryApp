/**
 * Ícones 3D das categorias (PNG com fundo recortado, em
 * `public/categories/<id>.png`).
 *
 * Só as categorias listadas aqui usam imagem; as demais seguem com o emoji
 * de `RESTAURANT_CATEGORIES`. Para adicionar uma nova, basta salvar o PNG
 * com o nome do id da categoria e incluir a linha correspondente.
 */
export const CATEGORY_ICON_IMAGES: Record<string, string> = {
  pizza: "/categories/pizza.png",
};

export function getCategoryIconImage(categoryId: string) {
  return CATEGORY_ICON_IMAGES[categoryId] ?? null;
}
