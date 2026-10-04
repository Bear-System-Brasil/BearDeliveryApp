"use client";

import dynamic from "next/dynamic";

import { Coords } from "@/types/restaurant";

export type AddressMapProps = {
  /** Coordenada atual do endereço. `null` = ainda não temos nenhuma. */
  value: Coords | null;

  /**
   * Só dispara por ação do cliente no mapa (toque/clique ou arrasto do pino) -
   * a fonte de maior prioridade.
   */
  onSelect: (coords: Coords) => void;

  mapHeight?: number;

  /**
   * Zoom a aplicar na próxima recentralização. Sem ele, a primeira coordenada
   * aproxima e as seguintes mantêm o zoom do cliente.
   */
  zoom?: number;

  /**
   * Muda a cada novo posicionamento do pino. Recentraliza mesmo quando a
   * coordenada é a mesma de antes (ex.: o cliente arrastou o mapa e escolheu
   * outro bairro sem coordenada, que cai de novo no centro da cidade).
   */
  recenterKey?: number;
};

const boxClass =
  "flex items-center justify-center rounded-lg border border-border bg-muted text-xs font-semibold text-muted-foreground";

// Leaflet depende de `window`: o mapa só é carregado no navegador.
const LeafletAddressMap = dynamic(() => import("./leaflet-address-map"), {
  ssr: false,
  loading: () => <div className={`${boxClass} h-full`}>Carregando mapa...</div>,
});

export function AddressMap({ mapHeight = 400, ...props }: AddressMapProps) {
  return (
    <div style={{ height: `${mapHeight}px` }}>
      <LeafletAddressMap mapHeight={mapHeight} {...props} />
    </div>
  );
}
