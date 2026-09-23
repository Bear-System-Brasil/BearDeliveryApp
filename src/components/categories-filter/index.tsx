"use client";

import { Ref } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryItem = {
  id: string | null;
  name: string;
  icon?: string;
};

type Props = {
  categories: CategoryItem[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  showArrows?: boolean;
  scrollCategories?: (direction: "left" | "right") => void;
  categoriesScrollRef?: Ref<HTMLDivElement>;
  showAllOption?: boolean;
  allLabel?: string;
  title?: string;
  rightContent?: React.ReactNode;
};

export function CategoriesFilter({
  categories,
  selectedValue,
  onSelect,
  showArrows = false,
  scrollCategories,
  categoriesScrollRef,
  showAllOption = false,
  allLabel = "Todos",
  title,
  rightContent,
}: Props) {
  return (
    <section className="px-3 sm:px-4 mb-4 sm:mb-6">
      <div className="max-w-7xl mx-auto">
        {(title || rightContent) && (
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-1.5 sm:mb-2">
            {title && (
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {title}
              </h2>
            )}
            {rightContent}
          </div>
        )}

        <div className="relative">
          {/* Seta esquerda - só aparece a partir de sm */}
          {showArrows && (
            <button
              onClick={() => scrollCategories?.("left")}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card/80 shadow-md border border-border items-center justify-center hover:bg-card transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={categoriesScrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scroll-smooth scrollbar-hide py-1"
          >
            {showAllOption && (
              <button
                onClick={() => onSelect(null)}
                className={cn(
                  "shrink-0 h-8 sm:h-9 px-3 sm:px-4 rounded-full border text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
                  selectedValue === null
                    ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                    : "bg-card text-foreground border-border shadow-sm hover:bg-muted",
                )}
              >
                {allLabel}
              </button>
            )}

            {categories.map((category) => (
              <button
                key={category.id ?? category.name}
                onClick={() => onSelect(category.id)}
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

          {/* Seta direita - só aparece a partir de sm */}
          {showArrows && (
            <button
              onClick={() => scrollCategories?.("right")}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card/80 shadow-md border border-border items-center justify-center hover:bg-card transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
