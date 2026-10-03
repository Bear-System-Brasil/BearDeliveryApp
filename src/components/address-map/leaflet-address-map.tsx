"use client";

import { useEffect, useRef } from "react";

import type { LeafletEventHandlerFnMap, Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import {
  defaultMarkerIcon,
  OSM_ATTRIBUTION,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from "@/lib/leaflet-setup";
import { Coords } from "@/types/restaurant";

import type { AddressMapProps } from "./index";

/**
 * Centro usado só para exibição enquanto não há coordenada nenhuma (meio do
 * país, bem afastado). Ele nunca vai para o formulário: o mapa antigo
 * empurrava esse valor no mount, e quem negasse a geolocalização tinha o
 * endereço salvo em Brasília sem perceber.
 */
const FALLBACK_CENTER: Coords = { lat: -15.7942, lng: -47.8822 };
const FALLBACK_ZOOM = 4;
const PINNED_ZOOM = 16;

/**
 * O `center` do `MapContainer` só vale no mount. Aqui o mapa acompanha a
 * coordenada quando ela muda de fato (CEP novo, geocodificação, toque,
 * arrasto). Entre uma mudança e outra o mapa é do cliente: zoom e arrasto
 * dele não são desfeitos.
 */
function SyncView({ value }: { value: Coords | null }) {
  const map = useMap();
  const hadValue = useRef(value !== null);

  const lat = value?.lat;
  const lng = value?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      if (hadValue.current) map.setZoom(FALLBACK_ZOOM);
      hadValue.current = false;
      return;
    }

    // Primeira coordenada aproxima; as seguintes mantêm o zoom do cliente.
    map.setView([lat, lng], hadValue.current ? map.getZoom() : PINNED_ZOOM);
    hadValue.current = true;
  }, [map, lat, lng]);

  return null;
}

/** Toque/clique no mapa move o pino para o ponto tocado. */
function ClickToSelect({ onSelect }: { onSelect: (coords: Coords) => void }) {
  useMapEvents({
    click: (e) => onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });

  return null;
}

function DraggablePin({
  value,
  onSelect,
}: {
  value: Coords;
  onSelect: (coords: Coords) => void;
}) {
  const markerRef = useRef<LeafletMarker>(null);

  // `onSelect` costuma ser uma arrow nova a cada render do formulário. O ref
  // evita recriar os handlers do marcador por causa disso.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const eventHandlers = useRef<LeafletEventHandlerFnMap>({
    dragend: () => {
      const position = markerRef.current?.getLatLng();

      if (!position) return;

      onSelectRef.current({ lat: position.lat, lng: position.lng });
    },
  }).current;

  return (
    <Marker
      ref={markerRef}
      position={[value.lat, value.lng]}
      icon={defaultMarkerIcon}
      draggable
      autoPan
      eventHandlers={eventHandlers}
    />
  );
}

export default function LeafletAddressMap({
  value,
  onSelect,
  mapHeight = 400,
}: AddressMapProps) {
  const initial = value ?? FALLBACK_CENTER;

  return (
    // `isolate` segura os z-index internos do Leaflet (até 1000) dentro do
    // mapa, para ele não passar por cima de header, modal e sheet.
    <div
      className="isolate overflow-hidden rounded-lg"
      style={{ height: `${mapHeight}px` }}
    >
      <MapContainer
        center={[initial.lat, initial.lng]}
        zoom={value ? PINNED_ZOOM : FALLBACK_ZOOM}
        // Rolagem da página não deve virar zoom no mapa (o formulário rola).
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={OSM_TILE_URL}
          attribution={OSM_ATTRIBUTION}
          maxZoom={OSM_MAX_ZOOM}
        />
        <SyncView value={value} />
        <ClickToSelect onSelect={onSelect} />
        {value && <DraggablePin value={value} onSelect={onSelect} />}
      </MapContainer>
    </div>
  );
}
