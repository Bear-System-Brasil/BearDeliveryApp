import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import * as React from "react";

export interface PageSectionProps {
  /**
   * Section title
   */
  title?: string;

  /**
   * Section subtitle/description
   */
  description?: string;

  /**
   * Icon to show next to title
   */
  icon?: LucideIcon;

  /**
   * Action button/component to show in header
   */
  action?: React.ReactNode;

  /**
   * Whether the section is loading
   */
  loading?: boolean;

  /**
   * Number of skeleton items to show when loading
   */
  skeletonCount?: number;

  /**
   * Custom skeleton component
   */
  skeletonComponent?: React.ReactNode;

  /**
   * Children content
   */
  children: React.ReactNode;

  /**
   * Custom className for the section container
   */
  className?: string;

  /**
   * Custom className for the header
   */
  headerClassName?: string;

  /**
   * Custom className for the content
   */
  contentClassName?: string;

  /**
   * Padding size
   */
  padding?: "none" | "sm" | "md" | "lg";

  /**
   * Show divider after header
   */
  divider?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/**
 * PageSection - A reusable section component for organizing page content
 *
 * This component provides a consistent way to structure page sections with
 * titles, descriptions, actions, and loading states.
 *
 * @example
 * ```tsx
 * // Basic section
 * <PageSection title="My Section" description="Section description">
 *   <p>Section content</p>
 * </PageSection>
 *
 * // With icon and action
 * <PageSection
 *   title="Products"
 *   icon={Package}
 *   action={<Button>Add Product</Button>}
 * >
 *   <ProductList />
 * </PageSection>
 *
 * // With loading state
 * <PageSection title="Loading" loading skeletonCount={3}>
 *   <ProductList />
 * </PageSection>
 * ```
 */
export const PageSection = React.memo<PageSectionProps>(
  ({
    title,
    description,
    icon: Icon,
    action,
    loading = false,
    skeletonCount = 3,
    skeletonComponent,
    children,
    className,
    headerClassName,
    contentClassName,
    padding = "none",
    divider = false,
  }) => {
    return (
      <section className={cn("space-y-4", paddingClasses[padding], className)}>
        {/* Header */}
        {(title || description || action) && (
          <div className={cn("space-y-2", headerClassName)}>
            <div className="flex items-start justify-between gap-4">
              {/* Title and description */}
              <div className="flex-1 space-y-1">
                {title && (
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {title}
                    </h2>
                  </div>
                )}
                {description && (
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>

              {/* Action */}
              {action && <div className="shrink-0">{action}</div>}
            </div>

            {/* Divider */}
            {divider && (
              <div className="h-px bg-linear-to-r from-brand-200 via-brand-200 to-transparent dark:from-brand-800 dark:via-brand-800" />
            )}
          </div>
        )}

        {/* Content */}
        <div className={contentClassName}>
          {loading
            ? skeletonComponent || (
                <div className="space-y-3">
                  {Array.from({ length: skeletonCount }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              )
            : children}
        </div>
      </section>
    );
  },
);

PageSection.displayName = "PageSection";

/**
 * PageHeader - A header component for pages
 */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const PageHeader = React.memo<PageHeaderProps>(
  ({
    title,
    subtitle,
    icon: Icon,
    action,
    breadcrumbs,
    className,
    gradient = false,
  }) => {
    return (
      <header className={cn("space-y-3 sm:space-y-4 mb-6 sm:mb-8", className)}>
        {/* Breadcrumbs */}
        {breadcrumbs && <div className="text-sm">{breadcrumbs}</div>}

        {/* Title and action */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {Icon && (
                <div className="shrink-0">
                  <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-brand-500" />
                </div>
              )}
              <h1
                className={cn(
                  "text-2xl sm:text-3xl md:text-4xl font-bold",
                  gradient
                    ? "bg-linear-to-r from-brand-500 to-brand-500 bg-clip-text text-transparent"
                    : "text-foreground",
                )}
              >
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {/* Action */}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </header>
    );
  },
);

PageHeader.displayName = "PageHeader";

/**
 * SectionCard - A card wrapper for sections
 */
export interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const cardPaddingClasses = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const SectionCard = React.memo<SectionCardProps>(
  ({ children, className, padding = "md" }) => {
    return (
      <div
        className={cn(
          "bg-card rounded-2xl shadow-sm border border-border",
          cardPaddingClasses[padding],
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

SectionCard.displayName = "SectionCard";
