/**
 * CATEGORIAS DE RESTAURANTE
 *
 * Lista completa de tipos de restaurante usados em toda a aplicação.
 * Cada categoria inclui:
 * - id: identificador único (slug)
 * - name: nome de exibição
 * - icon: emoji representativo
 * - color: classe Tailwind para gradiente
 *
 * IMPORTANTE: Esta é uma solução temporária frontend.
 * Quando o backend implementar a tabela RestaurantTypes,
 * estas categorias devem ser migradas para o banco de dados.
 */

export interface RestaurantCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/**
 * Lista das 34 categorias de restaurante em ordem alfabética
 */
export const RESTAURANT_CATEGORIES: RestaurantCategory[] = [
  {
    id: "acai",
    name: "Açaí",
    icon: "🍨",
    color: "from-purple-500 to-brand-500",
  },
  {
    id: "americana",
    name: "Americana",
    icon: "🍔",
    color: "from-red-500 to-yellow-500",
  },
  {
    id: "arabe",
    name: "Árabe",
    icon: "🥙",
    color: "from-amber-500 to-brand-500",
  },
  {
    id: "bebidas",
    name: "Bebidas",
    icon: "🥤",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "bolos",
    name: "Bolos",
    icon: "🎂",
    color: "from-brand-400 to-rose-500",
  },
  {
    id: "brasileira",
    name: "Brasileira",
    icon: "🍛",
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "cafe",
    name: "Café",
    icon: "☕",
    color: "from-amber-700 to-yellow-600",
  },
  {
    id: "caldos",
    name: "Caldos",
    icon: "🍲",
    color: "from-brand-400 to-red-500",
  },
  {
    id: "chinesa",
    name: "Chinesa",
    icon: "🥡",
    color: "from-red-600 to-yellow-500",
  },
  {
    id: "conveniencia",
    name: "Conveniência",
    icon: "🏪",
    color: "from-blue-400 to-indigo-500",
  },
  {
    id: "crepes",
    name: "Crepes",
    icon: "🥞",
    color: "from-yellow-400 to-brand-400",
  },
  {
    id: "doces",
    name: "Doces",
    icon: "🧁",
    color: "from-brand-500 to-purple-500",
  },
  {
    id: "fitness",
    name: "Fitness",
    icon: "🥗",
    color: "from-green-400 to-lime-500",
  },
  {
    id: "francesa",
    name: "Francesa",
    icon: "🥐",
    color: "from-blue-500 to-purple-500",
  },
  {
    id: "hamburguer",
    name: "Hambúrguer",
    icon: "🍔",
    color: "from-yellow-500 to-brand-500",
  },
  {
    id: "hot-dog",
    name: "Hot Dog",
    icon: "🌭",
    color: "from-red-500 to-brand-600",
  },
  {
    id: "italiana",
    name: "Italiana",
    icon: "🍝",
    color: "from-red-400 to-green-500",
  },
  {
    id: "japonesa",
    name: "Japonesa",
    icon: "🍣",
    color: "from-green-500 to-teal-500",
  },
  {
    id: "lanches",
    name: "Lanches",
    icon: "🥪",
    color: "from-brand-400 to-red-400",
  },
  {
    id: "marmita",
    name: "Marmita",
    icon: "🍱",
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "mexicana",
    name: "Mexicana",
    icon: "🌮",
    color: "from-yellow-600 to-red-600",
  },
  {
    id: "padaria",
    name: "Padaria",
    icon: "🥖",
    color: "from-amber-600 to-brand-500",
  },
  {
    id: "pastel",
    name: "Pastel",
    icon: "🥟",
    color: "from-yellow-500 to-brand-600",
  },
  {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    color: "from-brand-500 to-red-500",
  },
  { id: "poke", name: "Poke", icon: "🥙", color: "from-cyan-500 to-blue-500" },
  {
    id: "portuguesa",
    name: "Portuguesa",
    icon: "🍳",
    color: "from-green-600 to-red-600",
  },
  {
    id: "salgados",
    name: "Salgados",
    icon: "🥐",
    color: "from-yellow-600 to-brand-500",
  },
  {
    id: "saudavel",
    name: "Saudável",
    icon: "🥗",
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "sopas",
    name: "Sopas",
    icon: "🍜",
    color: "from-brand-500 to-red-500",
  },
  {
    id: "sorvetes",
    name: "Sorvetes",
    icon: "🍦",
    color: "from-cyan-400 to-blue-400",
  },
  {
    id: "tailandesa",
    name: "Tailandesa",
    icon: "🍛",
    color: "from-brand-600 to-red-600",
  },
  {
    id: "tapiocas",
    name: "Tapiocas",
    icon: "🫓",
    color: "from-yellow-500 to-amber-500",
  },
  {
    id: "vegana",
    name: "Vegana",
    icon: "🌱",
    color: "from-green-600 to-emerald-700",
  },
  {
    id: "vegetariana",
    name: "Vegetariana",
    icon: "🥬",
    color: "from-green-500 to-lime-600",
  },
];

/**
 * Mapa de categorias por ID para busca rápida
 */
export const RESTAURANT_CATEGORIES_MAP = RESTAURANT_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category;
    return acc;
  },
  {} as Record<string, RestaurantCategory>,
);

/**
 * Obtém o nome de uma categoria pelo ID
 * @param categoryId - ID da categoria
 * @returns Nome da categoria ou o próprio ID se não encontrado
 */
export const getCategoryName = (categoryId: string): string => {
  return RESTAURANT_CATEGORIES_MAP[categoryId]?.name || categoryId;
};

/**
 * Obtém uma categoria completa pelo ID
 * @param categoryId - ID da categoria
 * @returns Categoria completa ou undefined se não encontrado
 */
export const getCategoryById = (
  categoryId: string,
): RestaurantCategory | undefined => {
  return RESTAURANT_CATEGORIES_MAP[categoryId];
};

/**
 * Obtém o estilo (ícone e cor) de uma categoria pelo nome
 * Suporta busca case-insensitive e variações comuns
 * @param categoryName - Nome da categoria
 * @returns Objeto com icon e color
 */
export const getCategoryStyle = (
  categoryName: string,
): { icon: string; color: string } => {
  const name = categoryName.toLowerCase().trim();

  // Mapeamento direto por nome
  const category = RESTAURANT_CATEGORIES.find(
    (cat) => cat.name.toLowerCase() === name || cat.id === name,
  );

  if (category) {
    return { icon: category.icon, color: category.color };
  }

  // Mapeamentos de variações comuns
  const variations: Record<string, string> = {
    burger: "hamburguer",
    burgers: "hamburguer",
    hamburguers: "hamburguer",
    sushi: "japonesa",
    japonês: "japonesa",
    açai: "acai",
    árabe: "arabe",
    café: "cafe",
    conveniência: "conveniencia",
    hambúrguer: "hamburguer",
    saudável: "saudavel",
  };

  const mappedId = variations[name];
  if (mappedId) {
    const categoryVariation = RESTAURANT_CATEGORIES_MAP[mappedId];
    if (categoryVariation) {
      return { icon: categoryVariation.icon, color: categoryVariation.color };
    }
  }

  // Retorna estilo padrão se não encontrado
  return { icon: "🍽️", color: "from-brand-500 to-red-500" };
};
