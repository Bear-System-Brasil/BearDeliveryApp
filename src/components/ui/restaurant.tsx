"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bike, Heart, Star, Zap } from "lucide-react";

import { getCategoryStyle } from "@/constants";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores";
import { Restaurant as RestaurantType } from "@/types/restaurant";
import { formatDeliveryFee } from "@/utils/format-delivery-fee";

type Props = {
  index: number;
  restaurant: RestaurantType;
};

export function Restaurant({ restaurant, index }: Props) {
  const router = useRouter();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const [imageLoaded, setImageLoaded] = useState(false);

  const specialties = restaurant.specialty ?? [];
  const categoryLabel =
    specialties[0]?.name ||
    restaurant.categories?.[0]?.name ||
    restaurant.description ||
    "Restaurante";
  const categoryIcon = getCategoryStyle(categoryLabel).icon;
  const description = specialties.length
    ? specialties.map((specialty) => specialty.name).join(" · ")
    : restaurant.description;
  const discountNumber = Number(restaurant.discount);
  const hasDiscount = Number.isFinite(discountNumber) && discountNumber > 0;
  const promoBadge = hasDiscount
    ? `${discountNumber}% OFF`
    : restaurant.trending
      ? "NOVO"
      : null;
  const rating = Number(restaurant.rating || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const distance =
    typeof restaurant.distanceKm === "number" && restaurant.distanceKm > 0
      ? `${restaurant.distanceKm.toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })} km`
      : null;
  const imageSrc =
    restaurant.cover_url || restaurant.logo_url || "/placeholder.svg";
  const deliveryFeeLabel = formatDeliveryFee(restaurant.deliveryFee);
  const handleOpenMenu = () => {
    router.push(`/restaurant/${restaurant.id}`);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Abrir cardapio de ${restaurant.tradeName}`}
      onClick={handleOpenMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenMenu();
        }
      }}
      className={cn(
        "flex cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 sm:block",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative h-[106px] w-[112px] shrink-0 overflow-hidden bg-muted sm:h-[104px] sm:w-full">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
        )}
        <Image
          fill
          src={imageSrc}
          alt={restaurant.tradeName}
          className={cn(
            "object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          priority={index < 4}
          loading={index < 4 ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 112px"
          onLoad={() => setImageLoaded(true)}
        />

        {promoBadge && (
          <span className="absolute left-2 top-2 rounded-md bg-gray-950 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold leading-none text-white">
            {promoBadge}
          </span>
        )}

        <button
          aria-label="Favoritar restaurante"
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(restaurant.id);
          }}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent sm:right-3 sm:top-3 sm:h-7 sm:w-7"
        >
          <Heart
            className={cn(
              "h-3 w-3 sm:h-3.5 sm:w-3.5",
              favorites.includes(restaurant.id)
                ? "fill-red-500 text-red-500 dark:text-red-400"
                : "text-muted-foreground",
            )}
          />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-2.5 sm:block sm:p-3">
        <div className="mb-1 flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-950/40 text-xs">
              {categoryIcon}
            </span>
            <h3 className="truncate text-sm font-bold text-foreground">
              {restaurant.tradeName}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-bold text-foreground">
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-brand-400 text-brand-400" />
            <span>{rating}</span>
          </div>
        </div>

        <p className="mb-2 sm:mb-3 truncate text-[11px] sm:text-xs text-muted-foreground">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {restaurant.time && (
            <span className="rounded-md bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-foreground">
              {restaurant.time}
            </span>
          )}
          {deliveryFeeLabel && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 sm:px-2 sm:py-1 sm:text-xs"
              aria-label={`Frete ${deliveryFeeLabel}`}
              title={`Frete ${deliveryFeeLabel}`}
            >
              <span className="relative inline-flex h-3.5 w-4 shrink-0 items-center text-emerald-600 dark:text-emerald-400 sm:h-4 sm:w-4">
                <Bike className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <Zap className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 fill-current text-brand-500" />
              </span>
              <span>Frete {deliveryFeeLabel}</span>
            </span>
          )}
          {distance && (
            <span className="rounded-md bg-brand-50 dark:bg-brand-950/40 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-brand-600 dark:text-brand-400">
              {distance}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
