"use client";

import { useEffect } from "react";

import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import {
  defaultMarkerIcon,
  OSM_ATTRIBUTION,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from "@/lib/leaflet-setup";

type Props = {
  lat: number;
  lng: number;
};

const ZOOM = 18;

/** O `center` do `MapContainer` só vale no mount; aqui segue o entregador. */
function FollowPosition({ lat, lng }: Props) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], ZOOM);
  }, [map, lat, lng]);

  return null;
}

/**
 * Mapa estático do entregador: sem controles e sem interação, como era no
 * Google Maps. A atribuição do OpenStreetMap continua visível (obrigatória).
 */
export default function LeafletDeliveringMap({ lat, lng }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={ZOOM}
      zoomControl={false}
      dragging={false}
      touchZoom={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      style={{ width: "100%", height: "220px" }}
    >
      <TileLayer
        url={OSM_TILE_URL}
        attribution={OSM_ATTRIBUTION}
        maxZoom={OSM_MAX_ZOOM}
      />
      <FollowPosition lat={lat} lng={lng} />
      <Marker position={[lat, lng]} icon={defaultMarkerIcon} interactive={false} />
    </MapContainer>
  );
}
