"use client";

import { useState } from "react";
import { Bell, BellOff, History, LogOut, Package, RefreshCw } from "lucide-react";

import { CancelDialog } from "@/components/delivery-dashboard/cancel-dialog";
import { DeliveryCard } from "@/components/delivery-dashboard/delivery-card";
import {
  HeaderIconButton,
  HeaderIconLink,
  ScreenHeader,
} from "@/components/delivery-dashboard/screen-header";
import ProtectedRoute from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-provider";
import { useDeliveryDriver } from "@/hooks/use-delivery-driver";
import { getNextStatus, pluralizeAvailable } from "@/lib/delivery";
import type { Delivery } from "@/services/api";

export default function DeliveryDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["delivery"]}>
      <DeliveryDashboardContent />
    </ProtectedRoute>
  );
}

function Group({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <span className="text-[12px] font-bold text-muted-foreground">
          {count}
        </span>
      </div>
      {hint && (
        <p className="px-1 text-[12px] font-medium text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center">
      <p className="text-[13px] font-semibold text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function DeliveryDashboardContent() {
  const { logout } = useAuth();
  const {
    isLoading,
    isError,
    refetch,
    myDeliveries,
    recentlyDelivered,
    availableDeliveries,
    soundEnabled,
    toggleSound,
    acceptDelivery,
    acceptingId,
    advanceDelivery,
    advancingId,
    cancelDelivery,
    cancelingId,
    isCanceling,
    counts,
  } = useDeliveryDriver();

  const [cancelTarget, setCancelTarget] = useState<Delivery | null>(null);

  const handleAdvance = (delivery: Delivery) => {
    const next = getNextStatus(delivery);
    if (!next) return;
    advanceDelivery({ id: delivery.id, next });
  };

  const handleConfirmCancel = (reason: string) => {
    if (!cancelTarget || !reason) return;
    cancelDelivery(
      { id: cancelTarget.id, reason },
      { onSuccess: () => setCancelTarget(null) },
    );
  };

  const subtitle =
    counts.mine > 0
      ? `${counts.mine} em andamento · ${pluralizeAvailable(counts.available)}`
      : pluralizeAvailable(counts.available);

  return (
    <div className="min-h-screen bg-muted">
      <ScreenHeader
        title="Minhas entregas"
        subtitle={subtitle}
        actions={
          <>
            <HeaderIconButton label="Atualizar" onClick={() => refetch()}>
              <RefreshCw className="h-5 w-5" />
            </HeaderIconButton>
            <HeaderIconButton
              label={soundEnabled ? "Silenciar alertas" : "Ativar alertas"}
              onClick={toggleSound}
            >
              {soundEnabled ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
            </HeaderIconButton>
            <HeaderIconLink label="Histórico" href="/delivery-dashboard/historico">
              <History className="h-5 w-5" />
            </HeaderIconLink>
            <HeaderIconButton label="Sair" onClick={logout} danger>
              <LogOut className="h-5 w-5" />
            </HeaderIconButton>
          </>
        }
      />

      <main className="mx-auto max-w-md space-y-7 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-48 animate-pulse rounded-2xl bg-card" />
            <div className="h-48 animate-pulse rounded-2xl bg-card" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-[14px] font-bold text-foreground">
              Não foi possível carregar suas entregas
            </p>
            <Button
              type="button"
              onClick={() => refetch()}
              className="mt-4 h-12 rounded-xl bg-orange-500 px-6 text-[15px] font-bold hover:bg-orange-600"
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <Group title="Minhas entregas" count={counts.mine}>
              {myDeliveries.length === 0 ? (
                <EmptyState message="Você não tem nenhuma entrega em andamento." />
              ) : (
                <div className="flex flex-col gap-3">
                  {myDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onAdvance={handleAdvance}
                      onCancel={setCancelTarget}
                      busy={
                        advancingId === delivery.id ||
                        cancelingId === delivery.id
                      }
                    />
                  ))}
                </div>
              )}
            </Group>

            {recentlyDelivered.length > 0 && (
              <Group
                title="Entregues"
                count={counts.recent}
                hint="Fechadas na última hora. As anteriores estão no histórico."
              >
                <div className="flex flex-col gap-2">
                  {recentlyDelivered.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      compact
                    />
                  ))}
                </div>
              </Group>
            )}

            <Group title="Disponíveis" count={counts.available}>
              {availableDeliveries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
                  <Package className="mx-auto h-9 w-9 text-muted-foreground" />
                  <p className="mt-3 text-[14px] font-bold text-foreground">
                    Nenhuma entrega disponível
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                    Assim que surgir uma corrida por perto, avisamos por aqui.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {availableDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onAccept={acceptDelivery}
                      busy={acceptingId === delivery.id}
                    />
                  ))}
                </div>
              )}
            </Group>
          </>
        )}
      </main>

      <CancelDialog
        delivery={cancelTarget}
        isCanceling={isCanceling}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
