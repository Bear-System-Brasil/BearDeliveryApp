/**
 * O painel de endereço vive no `MainHeader`. Outras telas pedem pra abri-lo
 * por evento em vez de subir esse estado até a página - a home e o header
 * não têm um pai comum além do layout.
 */
export const OPEN_LOCATION_SHEET_EVENT = "likedelivery:open-location-sheet";

export type OpenLocationSheetMode = "card" | "form";

export function openLocationSheet(mode: OpenLocationSheetMode = "form") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ mode: OpenLocationSheetMode }>(
      OPEN_LOCATION_SHEET_EVENT,
      { detail: { mode } },
    ),
  );
}
