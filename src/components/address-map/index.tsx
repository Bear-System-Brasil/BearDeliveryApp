"use client";

import { useEffect, useState } from "react";

import { GoogleMap, OverlayView, useLoadScript } from "@react-google-maps/api";

import { Coords } from "@/types/restaurant";

type Props = {
  /** Coordenada atual do endereço. `null` = ainda não temos nenhuma. */
  value: Coords | null;

  /** Só dispara em clique no mapa - a fonte de maior prioridade. */
  onSelect: (coords: Coords) => void;

  mapHeight?: number;
};

/**
 * Centro usado só para exibição enquanto não há coordenada nenhuma (meio do
 * país, bem afastado). Ele nunca vai para o formulário: o mapa antigo
 * empurrava esse valor no mount, e quem negasse a geolocalização tinha o
 * endereço salvo em Brasília sem perceber.
 */
const FALLBACK_CENTER: Coords = { lat: -15.7942, lng: -47.8822 };
const FALLBACK_ZOOM = 4;
const PINNED_ZOOM = 16;

const boxClass =
  "flex items-center justify-center rounded-lg border border-border bg-muted text-xs font-semibold text-muted-foreground";

export function AddressMap({ value, onSelect, mapHeight = 400 }: Props) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey ?? "",
  });

  const lat = value?.lat;
  const lng = value?.lng;

  // `center` controlado desfaz o arrasto do cliente a cada render, então o
  // centro só muda quando a coordenada muda de fato (CEP novo,
  // geocodificação, clique). Entre uma mudança e outra o mapa é dele.
  const [center, setCenter] = useState<Coords>(value ?? FALLBACK_CENTER);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    setCenter({ lat, lng });
  }, [lat, lng]);

  const style = { height: `${mapHeight}px` };

  if (!googleMapsApiKey) {
    return (
      <div className={boxClass} style={style}>
        Mapa indisponível. Configuração do Google Maps ausente.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={boxClass} style={style}>
        Erro ao carregar o mapa.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={boxClass} style={style}>
        Carregando mapa...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{
        width: "100%",
        height: `${mapHeight}px`,
        borderRadius: "8px",
      }}
      center={center}
      zoom={value ? PINNED_ZOOM : FALLBACK_ZOOM}
      onClick={(e) => {
        const clickedLat = e.latLng?.lat();
        const clickedLng = e.latLng?.lng();

        // Sem latLng não dá para saber onde foi o clique. O mapa antigo caía
        // em `?? 0` aqui e gravava o endereço no meio do Atlântico.
        if (clickedLat === undefined || clickedLng === undefined) return;

        onSelect({ lat: clickedLat, lng: clickedLng });
      }}
    >
      {value && (
        <OverlayView
          position={value}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute rounded-full h-3 w-3 bg-emerald-700" />
            <span className="absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </div>
        </OverlayView>
      )}
    </GoogleMap>
  );
}
