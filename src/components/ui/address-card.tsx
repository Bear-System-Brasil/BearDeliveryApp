import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { MapPin, Star, Trash2 } from "lucide-react";
import * as React from "react";

export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  isDefault?: boolean;
}

export interface AddressCardProps {
  /**
   * Address data to display
   */
  address: Address;

  /**
   * Whether this address is selected (for selectable mode)
   */
  isSelected?: boolean;

  /**
   * Selection mode enables radio button and click to select
   */
  selectable?: boolean;

  /**
   * Show delete button
   */
  deletable?: boolean;

  /**
   * Callback when address is selected
   */
  onSelect?: (addressId: string) => void;

  /**
   * Callback when delete is clicked
   */
  onDelete?: (addressId: string) => void;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Compact mode (smaller padding and text)
   */
  compact?: boolean;
}

/**
 * AddressCard - A reusable card component for displaying address information
 *
 * This component provides a consistent way to display addresses across the application,
 * with support for selection, deletion, and different display modes.
 *
 * @example
 * ```tsx
 * // Display-only mode
 * <AddressCard address={address} />
 *
 * // Selectable mode with radio button
 * <AddressCard
 *   address={address}
 *   selectable
 *   isSelected={selectedId === address.id}
 *   onSelect={handleSelect}
 * />
 *
 * // With delete button
 * <AddressCard
 *   address={address}
 *   deletable
 *   onDelete={handleDelete}
 * />
 *
 * // Compact mode
 * <AddressCard address={address} compact />
 * ```
 */
export const AddressCard = React.memo<AddressCardProps>(
  ({
    address,
    isSelected = false,
    selectable = false,
    deletable = false,
    onSelect,
    onDelete,
    className,
    compact = false,
  }) => {
    const handleClick = React.useCallback(() => {
      if (selectable && onSelect) {
        onSelect(address.id);
      }
    }, [selectable, onSelect, address.id]);

    const handleDelete = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
          onDelete(address.id);
        }
      },
      [onDelete, address.id],
    );

    return (
      <GlassCard
        className={cn(
          "transition-all",
          selectable && "cursor-pointer",
          selectable && isSelected
            ? "border-2 border-brand-500 bg-linear-to-br from-brand-50 to-brand-50 dark:from-brand-950 dark:to-brand-950"
            : selectable && "border-2 border-border hover:border-brand-300",
          className,
        )}
        onClick={handleClick}
      >
        <GlassCardContent className={compact ? "p-3" : "p-4"}>
          <div className="flex items-start gap-3">
            {/* Radio button for selectable mode */}
            {selectable && (
              <RadioGroupItem
                value={address.id}
                checked={isSelected}
                className="mt-1"
              />
            )}

            {/* Map icon */}
            <div className="shrink-0 mt-0.5">
              <MapPin
                className={cn(
                  "text-brand-500",
                  compact ? "h-4 w-4" : "h-5 w-5",
                )}
              />
            </div>

            {/* Address content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p
                  className={cn(
                    "font-semibold text-foreground truncate",
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  {address.street}, {address.number}
                </p>
                {address.isDefault && (
                  <Badge className="bg-linear-to-r from-brand-500 to-brand-500 text-white border-0 text-xs flex items-center gap-1 px-2 py-0.5 shrink-0">
                    <Star className="h-3 w-3 fill-current" />
                    Padrão
                  </Badge>
                )}
              </div>

              <p
                className={cn(
                  "text-muted-foreground mt-1",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {address.neighborhood} - {address.city}/{address.state}
              </p>

              <p
                className={cn(
                  "text-muted-foreground mt-0.5",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                CEP: {address.zipCode}
              </p>

              {address.complement && (
                <p
                  className={cn(
                    "text-muted-foreground mt-0.5",
                    compact ? "text-xs" : "text-sm",
                  )}
                >
                  {address.complement}
                </p>
              )}

              {address.reference && (
                <p
                  className={cn(
                    "text-muted-foreground italic mt-1",
                    compact ? "text-xs" : "text-sm",
                  )}
                >
                  Ref: {address.reference}
                </p>
              )}
            </div>

            {/* Delete button */}
            {deletable && (
              <Button
                type="button"
                variant="ghost"
                size={compact ? "sm" : "icon"}
                className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleDelete}
                aria-label="Delete address"
              >
                <Trash2 className={compact ? "h-4 w-4" : "h-5 w-5"} />
              </Button>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  },
);

AddressCard.displayName = "AddressCard";

/**
 * AddressList - A list of address cards with consistent spacing
 */
export interface AddressListProps {
  addresses: Address[];
  selectedId?: string;
  selectable?: boolean;
  deletable?: boolean;
  onSelect?: (addressId: string) => void;
  onDelete?: (addressId: string) => void;
  compact?: boolean;
  className?: string;
  emptyMessage?: string;
}

export const AddressList = React.memo<AddressListProps>(
  ({
    addresses,
    selectedId,
    selectable,
    deletable,
    onSelect,
    onDelete,
    compact,
    className,
    emptyMessage = "Nenhum endereço cadastrado",
  }) => {
    if (addresses.length === 0) {
      return (
        <div className={cn("text-center py-8 text-muted-foreground", className)}>
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className={cn("space-y-3", className)}>
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            isSelected={selectedId === address.id}
            selectable={selectable}
            deletable={deletable}
            onSelect={onSelect}
            onDelete={onDelete}
            compact={compact}
          />
        ))}
      </div>
    );
  },
);

AddressList.displayName = "AddressList";
