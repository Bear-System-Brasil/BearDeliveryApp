"use client";

import { RefreshCw } from "lucide-react";

import { DeliveryCard } from "@/components/delivery-dashboard/delivery-card";
import {
  HeaderIconButton,
  ScreenHeader,
} from "@/components/delivery-dashboard/screen-header";
import { Button } from "@/components/ui/button";
import { useDeliveryHistory } from "@/hooks/use-delivery-driver";

/**
 * Histórico do entregador: concluídas e canceladas.
 *
 * `useDeliveryHistory` lê a mesma query `["my-deliveries"]` do painel - já
 * está em cache e `GET /delivery/delivery-person/me` devolve as próprias
 * entregas em qualquer status, então navegar pra cá não custa request. E, por
 * ser tela de leitura, não monta o socket de rastreamento nem o alerta.
 */
export default function DeliveryHistoryPage() {
  const { isLoading, isError, refetch, historyDeliveries, hasMorePages } =
    useDeliveryHistory();

  const subtitle = isLoading
    ? "Carregando..."
    : `${historyDeliveries.length} ${
        historyDeliveries.length === 1 ? "entrega" : "entregas"
      }`;

  return (
    <>
      <ScreenHeader
        title="Histórico"
        subtitle={subtitle}
        actions={
          <HeaderIconButton label="Atualizar" onClick={() => refetch()}>
            <RefreshCw className="h-5 w-5" />
          </HeaderIconButton>
        }
      />

      <main className="mx-auto max-w-md px-4 pt-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-2xl bg-card" />
            <div className="h-16 animate-pulse rounded-2xl bg-card" />
            <div className="h-16 animate-pulse rounded-2xl bg-card" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-[14px] font-bold text-foreground">
              Não foi possível carregar o histórico
            </p>
            <Button
              type="button"
              onClick={() => refetch()}
              className="mt-4 h-12 rounded-xl bg-brand-500 px-6 text-[15px] font-bold hover:bg-brand-600"
            >
              Tentar novamente
            </Button>
          </div>
        ) : historyDeliveries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <p className="text-[14px] font-bold text-foreground">
              Nada por aqui ainda
            </p>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">
              Suas entregas concluídas e canceladas aparecem nesta tela.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {historyDeliveries.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} compact />
            ))}
            {hasMorePages && (
              <p className="px-1 pt-2 text-center text-[12px] font-semibold text-muted-foreground">
                Mostrando as mais recentes. Entregas antigas não aparecem aqui.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
