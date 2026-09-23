"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { RESTAURANT_CATEGORIES } from "@/constants";
import { RestaurantGridSkeleton } from "@/components/restaurant-card-skeleton";
import { Restaurant } from "@/components/ui/restaurant";
import { Restaurant as RestaurantType } from "@/types/restaurant";
import { NoRestaurantNear } from "@/components/ui/no-restaurant-near";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  loading: boolean;
  restaurants: RestaurantType[];
  visibleCount: number;
  trendingRestaurants: RestaurantType[];
  hasUserLocation?: boolean;
};

type RestaurantListBlockProps = {
  emptyContent?: ReactNode;
  emptyMessage: string;
  emptyTitle: string;
  filterContent?: ReactNode;
  id?: string;
  loading: boolean;
  restaurants: RestaurantType[];
  skeletonCount: number;
  subtitle: string;
  title: string;
};

type StoreCategory = {
  id: string;
  icon?: string;
  name: string;
};

const HOME_CATEGORY_IDS = [
  "pizza",
  "lanches",
  "italiana",
  "japonesa",
  "saudavel",
  "doces",
  "bebidas",
  "cafe",
  "caldos",
  "arabe",
];

const HOME_CATEGORY_LABELS: Record<string, string> = {
  italiana: "Massas",
  saudavel: "Saudavel",
  cafe: "Cafe",
  arabe: "Arabe",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  italiana: ["massas", "macarrao", "italiana"],
  lanches: ["lanche", "lanches", "hamburguer", "hamburger", "burger"],
  saudavel: ["saudavel", "fitness"],
};

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function CompactEmptyState({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-5 text-center shadow-sm">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{message}</p>
    </div>
  );
}

function RestaurantListBlock({
  emptyContent,
  emptyMessage,
  emptyTitle,
  filterContent,
  id,
  loading,
  restaurants,
  skeletonCount,
  subtitle,
  title,
}: RestaurantListBlockProps) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] sm:text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
      {filterContent}
      {loading ? (
        <RestaurantGridSkeleton count={skeletonCount} />
      ) : restaurants.length ? (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {restaurants.map((restaurant, index) => (
            <Restaurant
              key={restaurant.id}
              restaurant={restaurant}
              index={index}
            />
          ))}
        </div>
      ) : emptyContent ? (
        emptyContent
      ) : (
        <CompactEmptyState title={emptyTitle} message={emptyMessage} />
      )}
    </section>
  );
}

function StoreCategoriesFilter({
  categories,
  selectedValue,
  onSelect,
}: {
  categories: StoreCategory[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="mb-3 sm:mb-4">
      <div className="mb-1.5 sm:mb-2 flex items-center justify-between gap-3 sm:gap-4">
        <h3 className="text-sm sm:text-base font-bold text-foreground">
          Categorias
        </h3>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Rolar categorias para a esquerda"
          onClick={() => scrollCategories("left")}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card/80 shadow-md border border-border items-center justify-center hover:bg-card transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto scroll-smooth scrollbar-hide py-1"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                onSelect(selectedValue === category.id ? null : category.id)
              }
              className={cn(
                "shrink-0 flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap shadow-sm transition-all",
                selectedValue === category.id
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-card border-border text-foreground hover:border-brand-200 dark:hover:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/40",
              )}
            >
              {category.icon && (
                <span className="text-xs sm:text-sm leading-none">
                  {category.icon}
                </span>
              )}
              {category.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollCategories("right")}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card/80 shadow-md border border-border items-center justify-center hover:bg-card transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TrendingRestaurantsSection({
  trendingRestaurants,
  visibleCount,
  restaurants,
  loading,
  hasUserLocation = false,
}: Props) {
  const [selectedStoreCategory, setSelectedStoreCategory] = useState<
    string | null
  >(null);

  const storeCategories = useMemo<StoreCategory[]>(
    () =>
      HOME_CATEGORY_IDS.map((categoryId) => {
        const category = RESTAURANT_CATEGORIES.find(
          (item) => item.id === categoryId,
        );
        return {
          id: categoryId,
          icon: category?.icon,
          name:
            HOME_CATEGORY_LABELS[categoryId] ?? category?.name ?? categoryId,
        };
      }),
    [],
  );

  // A API já filtra por raio quando recebe lat/lng.
  // Aqui só descartamos o que vier marcado explicitamente como fora do raio.
  const restaurantsNearUser = useMemo(
    () =>
      restaurants.filter((restaurant) => restaurant.isWithinRadius !== false),
    [restaurants],
  );

  const newsRestaurants = useMemo(
    () =>
      trendingRestaurants.filter(
        (restaurant) => restaurant.isWithinRadius !== false,
      ),
    [trendingRestaurants],
  );

  const selectedCategory = storeCategories.find(
    (category) => category.id === selectedStoreCategory,
  );

  const filteredStores = useMemo(() => {
    if (!selectedStoreCategory) return restaurantsNearUser;

    const selectedTerms = [
      selectedStoreCategory,
      selectedCategory?.name,
      ...(CATEGORY_ALIASES[selectedStoreCategory] ?? []),
    ]
      .map(normalizeText)
      .filter(Boolean);

    return restaurantsNearUser.filter((restaurant) => {
      const restaurantTerms = [
        restaurant.description,
        ...(restaurant.specialty ?? []).flatMap((specialty) => [
          specialty.id,
          specialty.name,
        ]),
        ...(restaurant.categories ?? []).flatMap((category) => [
          category.id,
          category.name,
          category.description,
        ]),
      ]
        .map(normalizeText)
        .filter(Boolean);

      return restaurantTerms.some((term) =>
        selectedTerms.some(
          (selectedTerm) =>
            term === selectedTerm ||
            term.includes(selectedTerm) ||
            selectedTerm.includes(term),
        ),
      );
    });
  }, [restaurantsNearUser, selectedCategory?.name, selectedStoreCategory]);

  const visibleStores = filteredStores.slice(0, visibleCount);
  const isInitialLoading = loading && !restaurants.length;
  const shouldAskForLocation = !hasUserLocation && !restaurants.length;

  return (
    <div className="px-3 sm:px-4 mb-6 sm:mb-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* 1. Novidades */}
        <RestaurantListBlock
          title="Novidades"
          subtitle="Destaques recentes perto de você"
          restaurants={newsRestaurants}
          loading={isInitialLoading}
          skeletonCount={4}
          emptyTitle="Nenhuma novidade encontrada"
          emptyMessage={
            shouldAskForLocation
              ? "Escolha um endereço para ver as novidades perto de você."
              : "Ainda não ha novidades perto de você."
          }
        />

        {/* 2. Categorias */}
        <StoreCategoriesFilter
          categories={storeCategories}
          selectedValue={selectedStoreCategory}
          onSelect={setSelectedStoreCategory}
        />

        {/* 3. Título Lojas (agora no lugar certo, acima da lista) */}
        <div id="lojas" className="scroll-mt-28">
          <div className="mb-2 sm:mb-3">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Lojas
            </h2>
            <p className="mt-0.5 text-[11px] sm:text-sm text-muted-foreground">
              Tudo perto de você
            </p>
          </div>

          {isInitialLoading ? (
            <RestaurantGridSkeleton count={8} />
          ) : visibleStores.length ? (
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {visibleStores.map((restaurant, index) => (
                <Restaurant
                  key={restaurant.id}
                  restaurant={restaurant}
                  index={index}
                />
              ))}
            </div>
          ) : shouldAskForLocation ? (
            <NoRestaurantNear />
          ) : (
            <CompactEmptyState
              title="Nenhuma loja encontrada"
              message={
                selectedStoreCategory
                  ? "Nenhuma loja encontrada nessa categoria."
                  : "Ainda não ha lojas perto de você."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
