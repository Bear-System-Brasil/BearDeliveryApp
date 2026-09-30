"use client";

import { MainHeader } from "@/components/main-header";
import { useAuthStore } from "@/stores";

/**
 * Cabecalho do app na area de entregas, para quem nao e entregador.
 *
 * A area de entregas e standalone: barra propria no rodape (Entregas,
 * Historico, Ajustes) e nenhum menu do app. A unica saida esta em Ajustes e
 * leva pra tela inicial do cliente, nao pra area do restaurante - entao quem
 * administra o restaurante entrava aqui e ficava isolado. Com o menu do app
 * no topo, ele alcanca as outras areas de trabalho de onde esta.
 *
 * Para o entregador de verdade nao renderiza nada: a tela dele continua
 * exatamente como era.
 *
 * `position="static"` e proposital. As telas daqui tem cabecalho proprio
 * `sticky top-0` com as acoes da tela (notificacoes, atualizar, localizacao);
 * um cabecalho de app flutuante ou sticky pararia em cima dele no scroll e
 * essas acoes sumiriam.
 *
 * Busca, localizacao e notificacoes ficam de fora: sao do app do cliente, e
 * a tela de entregas ja tem as suas no proprio cabecalho.
 */
export function DeliveryAppHeader() {
  const user = useAuthStore((s) => s.user);
  // O Zustand persist hidrata de forma assincrona - sem esperar, o cabecalho
  // piscava na tela do entregador a cada F5, antes da role chegar.
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  if (!hasHydrated || !user || user.role === "delivery") return null;

  return (
    <MainHeader
      position="static"
      showSearch={false}
      showLocation={false}
      showNotifications={false}
      showStoreCta={false}
    />
  );
}
