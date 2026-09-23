"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ColumnId,
  type CompanyOrder,
  COLUMN_ACTIONS,
  COLUMNS,
  formatCurrency,
  getAddOnLabel,
  getColumnForOrder,
  getOrderItemDisplayName,
  getVariationLabel,
} from "@/constants/order-management";
import { useOrderManagement } from "@/hooks";
import { useAuthStore } from "@/stores";
import {
  Bell,
  BellOff,
  CheckCircle,
  ChefHat,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { OrderDetailSheet } from "@/components/order-detail-sheet";
import { AcceptOrderDialog } from "./accept-order-dialog";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { OrderCard } from "./order-card";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes internos
// ─────────────────────────────────────────────────────────────────────────────

function StatusCard({
  title,
  count,
  icon: Icon,
  color,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex-1">
      <div
        className={`flex flex-col items-center gap-1 rounded-lg border p-2 md:p-3 ${color}`}
      >
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
        <span className="text-xs font-medium text-center md:text-sm">
          {title}
        </span>
        <span className="text-xl font-bold md:text-2xl">{count}</span>
      </div>
    </div>
  );
}

function EmptyColumn({ columnId }: { columnId: ColumnId }) {
  const emptyContent: Record<
    ColumnId,
    { icon: React.ElementType; message: string }
  > = {
    new: { icon: Package, message: "Nenhum pedido novo no momento" },
    preparing: { icon: ChefHat, message: "Nenhum pedido em preparo" },
    ready: { icon: Truck, message: "Nenhum pedido pronto" },
    completed: { icon: CheckCircle, message: "Nenhum pedido concluído hoje" },
  };

  const content = emptyContent[columnId];
  const Icon = content.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm">{content.message}</p>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-3 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

const COMPLETED_PAGE_SIZE = 10;

function CompletedPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages} ({total} pedido{total !== 1 ? "s" : ""})
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-xl"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-xl"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Área de impressão (oculta — visível apenas em @media print)
// ─────────────────────────────────────────────────────────────────────────────

function PrintArea({ order }: { order: CompanyOrder | null }) {
  if (!order) return null;

  const items = order.orderedItems || [];
  const orderNumber = order.orderNumber || order.id.slice(0, 6);
  const customerName = order.customer?.name || "Cliente";
  const observations = order.observations?.trim();
  const deliveryObservations = order.delivery?.observations?.trim();

  return (
    <div className="print-area hidden print:block print:w-[80mm] print:mx-auto print:text-xs print:font-mono print:bg-card print:text-black">
      <div className="text-center mb-2">
        <h2 className="text-base font-bold">BEARDELIVERY</h2>
        <p>───────────────────────</p>
      </div>

      <div className="mb-2">
        <p className="font-bold text-sm">PEDIDO #{orderNumber}</p>
        <p>Cliente: {customerName}</p>
        <p>Data: {new Date(order.created_at).toLocaleString("pt-BR")}</p>
      </div>

      <p>───────────────────────</p>

      <div className="mb-2">
        {items.map((item) => (
          <div key={item.id} className="mb-1">
            <p className="font-bold">
              {item.quantity}x {getOrderItemDisplayName(item)}
            </p>
            {item.observations && <p className="pl-2">Obs: {item.observations}</p>}
            {item.addOns?.map((addon, i) => (
              <p key={i} className="pl-2">
                + {getAddOnLabel(addon)}
                {addon.observations ? ` (${addon.observations})` : ""}
              </p>
            ))}
            {item.variations?.map((v, i) => (
              <p key={i} className="pl-2">
                {getVariationLabel(v)}
                {v.observations ? ` (${v.observations})` : ""}
              </p>
            ))}
          </div>
        ))}
      </div>

      <p>───────────────────────</p>

      <div className="mb-2">
        <div className="flex justify-between">
          <span>TOTAL:</span>
          <span className="font-bold">
            {formatCurrency(order.totalValue || 0)}
          </span>
        </div>
      </div>

      {(observations || deliveryObservations) && (
        <>
          <p>───────────────────────</p>
          {observations && <p className="font-bold">OBS: {observations}</p>}
          {deliveryObservations && (
            <p className="font-bold">ENTREGA: {deliveryObservations}</p>
          )}
        </>
      )}

      <p className="text-center mt-2">───────────────────────</p>
      <p className="text-center text-[10px]">
        Impresso em {new Date().toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderManagement() {
  const {
    columns,
    statusCounts,
    isLoading,
    isError,
    activeTab,
    setActiveTab,
    selectedOrder,
    setSelectedOrder,
    cancelTarget,
    setCancelTarget,
    actionTarget,
    setActionTarget,
    soundEnabled,
    showCompleted,
    setShowCompleted,
    advanceOrder,
    cancelOrder,
    toggleSound,
    stopAlert,
    refetch,
    isUpdating,
    isCanceling,
  } = useOrderManagement();

  // `owner` não tem permissão pra cancelar pedido (order.md) - o backend
  // rejeita com 403. Sem esconder o botão, a pessoa só descobre isso depois
  // de tentar e ver o erro.
  const userRole = useAuthStore((state) => state.user?.role);
  const canCancelOrder = userRole !== "owner";

  const [printOrder, setPrintOrder] = useState<CompanyOrder | null>(null);
  const printRef = useRef(false);

  // Concluídos/Cancelados só cresce (nunca esvazia como as outras colunas),
  // então é o único que precisa de paginação pra não virar uma lista infinita.
  const [completedPage, setCompletedPage] = useState(1);
  const completedTotal = columns.completed.length;
  const completedTotalPages = Math.max(
    1,
    Math.ceil(completedTotal / COMPLETED_PAGE_SIZE),
  );

  useEffect(() => {
    setCompletedPage((current) => Math.min(current, completedTotalPages));
  }, [completedTotalPages]);

  const paginatedCompleted = useMemo(
    () =>
      columns.completed.slice(
        (completedPage - 1) * COMPLETED_PAGE_SIZE,
        completedPage * COMPLETED_PAGE_SIZE,
      ),
    [columns.completed, completedPage],
  );

  useEffect(() => {
    if (printOrder && !printRef.current) {
      printRef.current = true;
      setTimeout(() => {
        window.print();
        // limpa depois da impressão
        setTimeout(() => {
          setPrintOrder(null);
          printRef.current = false;
        }, 500);
      }, 100);
    }
  }, [printOrder]);

  const handlePrint = (order: CompanyOrder) => {
    setPrintOrder(order);
  };

  const handleViewDetails = (order: CompanyOrder) => {
    stopAlert();
    setSelectedOrder(order);
  };

  const getColumnIdForOrder = (order: CompanyOrder): ColumnId => {
    const col = getColumnForOrder(order);
    return col === "canceled" ? "completed" : col;
  };

  const renderCards = (columnId: ColumnId) => {
    const items = columnId === "completed" ? paginatedCompleted : columns[columnId];

    if (isLoading) return <ColumnSkeleton />;
    if (items.length === 0) return <EmptyColumn columnId={columnId} />;

    return (
      <div className="space-y-3">
        {items.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            columnId={columnId}
            onAction={setActionTarget}
            onCancel={canCancelOrder ? setCancelTarget : undefined}
            onViewDetails={handleViewDetails}
            onPrint={handlePrint}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    );
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ClipboardList className="h-16 w-16 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Erro ao carregar pedidos</p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="cursor-pointer"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* ─── Header: Status Cards ─────────────────────────────────── */}
      <div className="flex overflow-x-auto p-2 gap-2 bg-card print:hidden">
        <StatusCard
          title="Novos"
          count={statusCounts.new}
          icon={Package}
          color="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
        />
        <StatusCard
          title="Em Preparo"
          count={statusCounts.preparing}
          icon={ChefHat}
          color="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
        />
        <StatusCard
          title="Prontos"
          count={statusCounts.ready}
          icon={Truck}
          color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
        />
        <StatusCard
          title="Concluídos"
          count={statusCounts.completed}
          icon={CheckCircle}
          color="bg-muted text-foreground border-border"
        />
      </div>

      {/* ─── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card print:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1.5"
          onClick={toggleSound}
        >
          {soundEnabled ? (
            <>
              <Bell className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Som ativo</span>
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs hidden sm:inline text-muted-foreground">
                Som desativado
              </span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1.5"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span className="text-xs hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* ─── Mobile: Tabs ─────────────────────────────────────────── */}
      <div className="md:hidden p-2 print:hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ColumnId)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-3">
            <TabsTrigger value="new" className="relative text-xs">
              Novos
              {statusCounts.new > 0 && (
                <Badge className="absolute -top-2 -right-1 h-4 min-w-4 px-1 text-[10px] bg-amber-500">
                  {statusCounts.new}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preparing" className="relative text-xs">
              Preparo
              {statusCounts.preparing > 0 && (
                <Badge className="absolute -top-2 -right-1 h-4 min-w-4 px-1 text-[10px] bg-blue-500">
                  {statusCounts.preparing}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready" className="relative text-xs">
              Prontos
              {statusCounts.ready > 0 && (
                <Badge className="absolute -top-2 -right-1 h-4 min-w-4 px-1 text-[10px] bg-emerald-500">
                  {statusCounts.ready}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="relative text-xs">
              Feitos
              {statusCounts.completed > 0 && (
                <Badge className="absolute -top-2 -right-1 h-4 min-w-4 px-1 text-[10px] bg-muted-foreground">
                  {statusCounts.completed}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">{renderCards("new")}</TabsContent>
          <TabsContent value="preparing">
            {renderCards("preparing")}
          </TabsContent>
          <TabsContent value="ready">{renderCards("ready")}</TabsContent>
          <TabsContent value="completed" className="space-y-3">
            {renderCards("completed")}
            <CompletedPagination
              page={completedPage}
              totalPages={completedTotalPages}
              total={completedTotal}
              onPageChange={setCompletedPage}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Desktop: Kanban ──────────────────────────────────────── */}
      <div className="hidden md:block p-4 print:hidden">
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col">
              <div
                className={`${col.headerBg} p-3 rounded-t-lg font-medium ${col.color} flex items-center justify-between`}
              >
                <span>{col.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {columns[col.id].length}
                </Badge>
              </div>
              <div
                className={`flex-1 min-h-[200px] border border-t-0 rounded-b-lg p-3 ${col.bgColor} bg-opacity-30`}
              >
                {renderCards(col.id)}
              </div>
            </div>
          ))}
        </div>

        {/* Seção de Concluídos (colapsável) */}
        <div className="mt-4">
          <Button
            variant="ghost"
            className="w-full justify-between cursor-pointer"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluídos / Cancelados ({statusCounts.completed})
            </span>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showCompleted && (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {completedTotal === 0 ? (
                  <div className="col-span-full">
                    <EmptyColumn columnId="completed" />
                  </div>
                ) : (
                  paginatedCompleted.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      columnId="completed"
                      onViewDetails={handleViewDetails}
                      onPrint={handlePrint}
                      isUpdating={isUpdating}
                    />
                  ))
                )}
              </div>
              <CompletedPagination
                page={completedPage}
                totalPages={completedTotalPages}
                total={completedTotal}
                onPageChange={setCompletedPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── Modais ───────────────────────────────────────────────── */}
      <AcceptOrderDialog
        order={actionTarget}
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={advanceOrder}
        isLoading={isUpdating}
      />

      <CancelOrderDialog
        order={cancelTarget}
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancelOrder}
        isLoading={isCanceling}
      />

      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        actionLabel={
          selectedOrder ? (COLUMN_ACTIONS[getColumnIdForOrder(selectedOrder)]?.label ?? null) : null
        }
        onAction={setActionTarget}
        onCancel={canCancelOrder ? setCancelTarget : undefined}
        onPrint={handlePrint}
        isUpdating={isUpdating}
      />

      {/* ─── Área de Impressão (oculta) ───────────────────────────── */}
      <PrintArea order={printOrder} />
    </>
  );
}
