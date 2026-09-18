import { useSound } from "@/hooks/use-sound";
import {
  isActiveForDriver,
  isAvailable,
  isCanceled,
  isFinished,
  isRecentlyFinished,
  sortActive,
  sortNewestFinishedFirst,
  sortOldestFirst,
  type DeliveryStatus,
} from "@/lib/delivery";
import { socketAuthProvider } from "@/lib/socket-auth";
import { apiService } from "@/services/api";
import { useAuthStore } from "@/stores";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import { toast } from "sonner";

const POLL_INTERVAL = 15_000; // mesmo ritmo do painel da cozinha (use-order-management)

const DELIVERY_TRACKING_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/delivery-tracking`
  : "";

/**
 * A query em si. Compartilhada entre o painel e o histórico: mesma chave =
 * mesmo cache, então navegar entre as duas telas não custa request.
 *
 * `GET /delivery/delivery-person/me` devolve tanto as entregas PENDING
 * (disponíveis pra aceitar) quanto as já atribuídas a este entregador, em
 * qualquer status.
 */
function useMyDeliveriesQuery() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ["my-deliveries"],
    queryFn: async () => {
      const response = await apiService.deliveries.getMyDeliveries();
      if (!response.success) {
        throw new Error(response.message || "Erro ao carregar entregas");
      }
      return response.data ?? [];
    },
    refetchInterval: POLL_INTERVAL,
    enabled: !!isAuthenticated,
    staleTime: 10_000,
  });
}

/**
 * Painel do entregador: agrupa a resposta em "minhas", "entregues na última
 * hora" e "disponíveis", e expõe as ações de cada card.
 *
 * O entregador sai com vários pedidos por vez, então `myDeliveries` é uma
 * lista, não uma corrida só, e as disponíveis continuam visíveis mesmo com
 * corrida em andamento.
 */
export const useDeliveryDriver = () => {
  const queryClient = useQueryClient();
  const { play, muted, toggleMuted } = useSound("courier");
  const soundEnabled = !muted;

  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);

  const { data, isLoading, isError, refetch } = useMyDeliveriesQuery();

  const deliveries = useMemo(() => data ?? [], [data]);

  // A janela de "última hora" precisa correr mesmo quando nada muda no
  // servidor: o react-query devolve a mesma referência quando a resposta é
  // idêntica, então sem este tique a entrega fechada ficaria no grupo muito
  // além da hora numa parada longa.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const groups = useMemo(() => {
    return {
      /** Aceitas e ainda não fechadas - PICKED_UP antes de ACCEPTED. */
      myDeliveries: sortActive(deliveries.filter(isActiveForDriver)),
      /** Fechadas na última hora. Mais antigas só no histórico. */
      recentlyDelivered: sortNewestFinishedFirst(
        deliveries.filter((delivery) => isRecentlyFinished(delivery, now)),
      ),
      /** Sempre visíveis, mesmo com corrida em andamento. */
      availableDeliveries: sortOldestFirst(deliveries.filter(isAvailable)),
    };
  }, [deliveries, now]);

  const { myDeliveries, recentlyDelivered, availableDeliveries } = groups;

  // ─── Alerta sonoro pra entrega nova disponível ────────────────────────────
  // Toque único, sempre que aparece uma PENDING nova - inclusive com corrida
  // em andamento, já que o entregador leva vários pedidos na mesma saída.
  const availableIdsKey = availableDeliveries.map((d) => d.id).join(",");
  const hasLoadedOnce = data !== undefined;

  useEffect(() => {
    // Enquanto nenhuma resposta chegou, não há baseline pra comparar - sair
    // aqui evita gastar o flag de primeira carga na render vazia e tocar o
    // alerta pra entregas que já estavam na fila quando a tela abriu.
    if (!hasLoadedOnce) return;

    const currentIds = new Set(
      availableIdsKey ? availableIdsKey.split(",") : [],
    );

    // A primeira carga não é "entrega nova": é a tela abrindo.
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevPendingIdsRef.current = currentIds;
      return;
    }

    const hasNew = [...currentIds].some(
      (id) => !prevPendingIdsRef.current.has(id),
    );

    if (hasNew && soundEnabled) {
      play("new-job");
    }

    prevPendingIdsRef.current = currentIds;
  }, [hasLoadedOnce, availableIdsKey, soundEnabled, play]);

  // ─── Rastreamento ao vivo enquanto PICKED_UP ──────────────────────────────
  // O backend só considera o tracking "ativo" nesse status (ver
  // tracking-gateway.md) - fora dele nem vale abrir o socket. Com várias
  // corridas ao mesmo tempo, transmite a primeira da fila (a que está na rua
  // há mais tempo); o gateway hoje é por entrega, um socket de cada vez.
  const trackedDelivery =
    myDeliveries.find((delivery) => delivery.status === "PICKED_UP") ?? null;

  useEffect(() => {
    const deliveryId = trackedDelivery?.id;
    if (!deliveryId || !DELIVERY_TRACKING_URL) return;

    // `auth` como função busca token fresco a cada (re)conexão - ver
    // socket-auth.ts. Sem isso, o rastreamento ao vivo parava de atualizar
    // pra sempre depois de uma reconexão com token expirado, sem nenhum
    // aviso.
    const socket = io(DELIVERY_TRACKING_URL, { auth: socketAuthProvider });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinDelivery", { deliveryId });
    });

    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          socketRef.current?.emit("updateLocation", {
            deliveryId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Sem permissão de localização - não quebra o resto do fluxo,
          // o cliente só fica sem ver a posição ao vivo.
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [trackedDelivery?.id]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });

  const acceptMutation = useMutation({
    mutationFn: (id: string) =>
      apiService.deliveries.updateStatus(id, "ACCEPTED"),
    onSuccess: (response) => {
      invalidate();
      if (response.success) {
        play("success");
        toast.success("Entrega aceita!");
      } else {
        toast.error(
          response.message ||
            "Não foi possível aceitar - talvez outro entregador já tenha pegado essa.",
        );
      }
    },
    onError: () => toast.error("Erro de conexão ao aceitar entrega"),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: DeliveryStatus }) =>
      apiService.deliveries.updateStatus(id, next),
    onSuccess: (response, { next }) => {
      invalidate();
      if (response.success) {
        play("success");
        if (next === "DELIVERED") toast.success("Entrega concluída!");
      } else {
        toast.error(
          response.message ||
            (next === "DELIVERED"
              ? "Erro ao marcar como entregue"
              : "Erro ao marcar como coletado"),
        );
      }
    },
    onError: () => toast.error("Erro de conexão"),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiService.deliveries.cancel(id, reason),
    onSuccess: (response) => {
      invalidate();
      if (response.success) {
        toast.success("Entrega cancelada");
      } else {
        toast.error(response.message || "Erro ao cancelar entrega");
      }
    },
    onError: () => toast.error("Erro de conexão"),
  });

  // Com vários cards na tela, travar todos os botões enquanto um request roda
  // esconderia qual entrega está sendo mexida - o estado é por entrega.
  const acceptingId = acceptMutation.isPending
    ? (acceptMutation.variables ?? null)
    : null;
  const advancingId = advanceMutation.isPending
    ? (advanceMutation.variables?.id ?? null)
    : null;
  const cancelingId = cancelMutation.isPending
    ? (cancelMutation.variables?.id ?? null)
    : null;

  return {
    isLoading,
    isError,
    refetch,
    ...groups,
    soundEnabled,
    toggleSound: toggleMuted,
    acceptDelivery: acceptMutation.mutate,
    acceptingId,
    advanceDelivery: advanceMutation.mutate,
    advancingId,
    cancelDelivery: cancelMutation.mutate,
    cancelingId,
    isCanceling: cancelMutation.isPending,
    counts: {
      mine: myDeliveries.length,
      recent: recentlyDelivered.length,
      available: availableDeliveries.length,
    },
  };
};

/**
 * Histórico do entregador: concluídas e canceladas, da mais recente pra mais
 * antiga.
 *
 * Lê a mesma query do painel, mas de propósito NÃO monta o socket de
 * rastreamento nem o alerta sonoro - o histórico é tela de leitura, e abrir
 * de novo o socket a cada navegação mexeria num rastreio que já funciona.
 */
export const useDeliveryHistory = () => {
  const { data, isLoading, isError, refetch } = useMyDeliveriesQuery();

  const historyDeliveries = useMemo(
    () =>
      sortNewestFinishedFirst(
        (data ?? []).filter(
          (delivery) => isFinished(delivery) || isCanceled(delivery),
        ),
      ),
    [data],
  );

  return { isLoading, isError, refetch, historyDeliveries };
};
