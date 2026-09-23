import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  type ColumnId,
  type CompanyOrder,
  COLUMN_ACTIONS,
  formatCurrency,
  getAddOnLabel,
  getElapsedTime,
  getOrderItemDisplayName,
  getPaymentMethodLabel,
  getVariationLabel,
} from "@/constants/order-management";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Printer,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

interface OrderCardProps {
  order: CompanyOrder;
  columnId: ColumnId;
  onAction?: (order: CompanyOrder) => void;
  onCancel?: (order: CompanyOrder) => void;
  onViewDetails?: (order: CompanyOrder) => void;
  onPrint?: (order: CompanyOrder) => void;
  isUpdating?: boolean;
}

export function OrderCard({
  order,
  columnId,
  onAction,
  onCancel,
  onViewDetails,
  onPrint,
  isUpdating,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);

  const items = order.orderedItems || [];
  const action = COLUMN_ACTIONS[columnId];
  const elapsed = getElapsedTime(order.created_at);
  const isCanceled = order.status === "CANCELED";
  const isCompleted = order.status === "COMPLETED";
  const isDone = isCanceled || isCompleted;

  const orderNumber = order.orderNumber || order.id.slice(0, 6);
  const customerName = order.customer?.name || "Cliente";
  const totalValue = order.totalValue || 0;
  const payment = order.payments?.[0];

  return (
    <Card
      className={`
      overflow-hidden
      rounded-2xl
      border-border
      shadow-sm
      transition-all
      duration-300
      hover:-translate-y-0.5
      hover:shadow-xl
      ${isDone ? "opacity-70" : ""}
    `}
    >
      <CardHeader className="border-b bg-muted/40 px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">#{orderNumber}</span>

            {isCanceled && (
              <Badge className="rounded-full border border-red-200 bg-red-100 text-red-700">
                Cancelado
              </Badge>
            )}

            {isCompleted && (
              <Badge className="rounded-full border border-green-200 bg-green-100 text-green-700">
                Concluído
              </Badge>
            )}
          </div>

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {elapsed}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Cliente */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-600">
            {customerName.charAt(0)}
          </div>

          <div>
            <p className="font-semibold">{customerName}</p>
            <p className="text-xs text-muted-foreground">
              Pedido #{orderNumber}
            </p>
          </div>
        </div>

        {/* Itens */}
        <div
          className={`space-y-3 ${
            !expanded && items.length > 2 ? "max-h-24 overflow-hidden" : ""
          }`}
        >
          {items.map((item) => (
            <div key={item.id} className="rounded-lg">
              <p className="font-medium text-foreground">
                <span className="font-bold">{item.quantity}x</span>{" "}
                {getOrderItemDisplayName(item)}
              </p>
              {item.observations && (
                <p className="pl-5 text-xs italic text-muted-foreground/80">
                  {`"${item.observations}"`}
                </p>
              )}

              {item.addOns?.map((addon, i) => (
                <div key={i} className="pl-5">
                  <p className="text-xs text-muted-foreground">
                    + {getAddOnLabel(addon)}
                  </p>
                  {addon.observations && (
                    <p className="pl-2 text-xs italic text-muted-foreground/80">
                      {`"${addon.observations}"`}
                    </p>
                  )}
                </div>
              ))}

              {item.variations?.map((variation, i) => (
                <div key={i} className="pl-5">
                  <p className="text-xs text-muted-foreground">
                    {getVariationLabel(variation)}
                  </p>
                  {variation.observations && (
                    <p className="pl-2 text-xs italic text-muted-foreground/80">
                      {`"${variation.observations}"`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {items.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                Ver menos
                <ChevronUp className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Ver todos ({items.length})
                <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        )}

        {/* Cancelamento */}
        {isCanceled && order.cancelReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-700">
              Motivo do cancelamento
            </p>

            <p className="mt-1 text-xs text-red-600">{order.cancelReason}</p>
          </div>
        )}

        {/* Pagamento */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {payment
                ? getPaymentMethodLabel(payment.paymentMethod)
                : "Pagamento não informado"}
            </p>
          </div>

          <span className="text-lg font-bold">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </CardContent>

      {!isDone && (
        <CardFooter className="border-t bg-muted/40 p-4">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => onViewDetails?.(order)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => onPrint?.(order)}
            >
              <Printer className="h-4 w-4" />
            </Button>

            {onCancel && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onCancel(order)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {action && (
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700"
                onClick={() => onAction?.(order)}
                disabled={isUpdating}
              >
                {isUpdating ? "Atualizando..." : action.label}
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
