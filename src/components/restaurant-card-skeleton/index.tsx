import { Card } from "@/components/ui/card";
import { RestaurantListCard } from "@/components/ui/restaurant-row";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton para cards de restaurante
 * Usado durante carregamento inicial para melhor UX
 */
export function RestaurantCardSkeleton() {
  return (
    <Card className="flex overflow-hidden rounded-lg border border-border shadow-sm sm:block">
      <div className="relative h-[106px] w-[112px] shrink-0 sm:h-auto sm:w-full">
        {/* Image skeleton */}
        <Skeleton className="h-full w-full rounded-none sm:h-[104px]" />

        {/* Badge skeleton */}
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
          <Skeleton className="h-4 w-12 rounded-md bg-black/20 sm:h-5 sm:w-16" />
        </div>

        {/* Heart button skeleton */}
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <Skeleton className="h-6 w-6 rounded-full sm:h-7 sm:w-7" />
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2 p-2.5 sm:space-y-3 sm:p-3">
        {/* Title */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-3/5 sm:h-5" />
          <Skeleton className="h-3.5 w-9 sm:h-4 sm:w-10" />
        </div>

        {/* Description */}
        <Skeleton className="h-3 w-2/3 sm:h-3.5" />

        {/* Tags */}
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md sm:h-6 sm:w-16" />
          <Skeleton className="h-5 w-12 rounded-md sm:h-6 sm:w-14" />
          <Skeleton className="h-5 w-16 rounded-md sm:h-6 sm:w-[72px]" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Grid de skeletons para múltiplos cards
 */
export function RestaurantGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid w-full grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Skeleton da linha compacta de loja (mesmas medidas do `RestaurantRow`)
 */
export function RestaurantRowSkeleton() {
  return (
    <div className="flex items-center gap-[11px] px-3 py-[9px]">
      <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-[13px]" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-16" />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-[5px]">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-[34px] w-[34px] rounded-full" />
      </div>
    </div>
  );
}

/**
 * Lista de skeletons no card compacto de lojas
 */
export function RestaurantListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <RestaurantListCard>
      {Array.from({ length: count }).map((_, index) => (
        <RestaurantRowSkeleton key={index} />
      ))}
    </RestaurantListCard>
  );
}
