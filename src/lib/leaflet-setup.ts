import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { StaticImageData } from "next/image";

/**
 * Configuração comum dos mapas Leaflet.
 *
 * O Leaflet acessa `window` assim que é importado, então este módulo só pode
 * ser importado por componentes carregados com `next/dynamic` e `ssr: false`.
 */

// No Next, o import de imagem devolve `{ src }`; no Vitest, a URL direto.
function assetUrl(image: StaticImageData | string) {
  return typeof image === "string" ? image : image.src;
}

/**
 * Ícone padrão do marcador. O Leaflet descobre o caminho das imagens pelo CSS
 * em tempo de execução, e isso quebra com o bundler do Next: o marcador some.
 * Por isso as URLs vêm do import e o ícone é passado explicitamente.
 */
export const defaultMarkerIcon = L.icon({
  iconUrl: assetUrl(markerIcon),
  iconRetinaUrl: assetUrl(markerIcon2x),
  shadowUrl: assetUrl(markerShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

/**
 * Servidor público de tiles do OpenStreetMap. Uso justo: atribuição visível,
 * Referer enviado (o `next.config` já define `strict-origin-when-cross-origin`)
 * e nada de download em massa.
 */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_MAX_ZOOM = 19;

/** Atribuição obrigatória do OpenStreetMap. */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
