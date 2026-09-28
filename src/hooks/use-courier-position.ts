"use client";

import { useCallback, useState } from "react";

import { geocodeAddress } from "@/lib/geocode";
import {
  isPositionFresh,
  useCourierPositionStore,
  type CourierPosition,
} from "@/stores/courier-position-store";
import type { Coords } from "@/types/restaurant";

/**
 * Teto de espera pelo GPS.
 *
 * O `watchPosition` do rastreamento usa 15s, que é razoável pra um sinal que
 * fica atualizando sozinho em segundo plano. Aqui o entregador está parado
 * olhando pro botão que acabou de tocar: passando disso, é melhor abrir o
 * campo de digitar do que deixá-lo esperando sem saber por quê.
 */
const GPS_TIMEOUT_MS = 8_000;

/** Por que o GPS não respondeu - decide a mensagem, não o caminho. */
export type PositionFailure =
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export type PositionOutcome =
  | { ok: true; position: CourierPosition }
  | { ok: false; reason: PositionFailure };

type GpsReading =
  | { ok: true; coords: Coords }
  | { ok: false; reason: PositionFailure };

function readGps(): Promise<GpsReading> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }),
      (error) => {
        // Os três motivos levam ao mesmo lugar (pedir por texto), mas a
        // mensagem muda: negar permissão é decisão do entregador, os outros
        // dois são acidente.
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ ok: false, reason: "denied" });
        } else if (error.code === error.TIMEOUT) {
          resolve({ ok: false, reason: "timeout" });
        } else {
          resolve({ ok: false, reason: "unavailable" });
        }
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

/**
 * Posição do entregador para o aceite: cache do rastreamento primeiro, GPS
 * depois, texto geocodificado como último recurso.
 */
export function useCourierPosition() {
  const position = useCourierPositionStore((state) => state.position);
  const setStorePosition = useCourierPositionStore(
    (state) => state.setPosition,
  );

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  /**
   * Posição utilizável, sem incomodar o entregador se der pra evitar.
   *
   * 1. A do rastreamento/GPS que já está no store, se ainda estiver fresca -
   *    com uma entrega PICKED_UP em curso isso quase sempre acerta, porque o
   *    `watchPosition` do socket alimenta o store de graça.
   * 2. Uma leitura nova do GPS.
   * 3. Falhou: devolve o motivo, e quem chamou decide abrir o campo de texto.
   */
  const resolvePosition = useCallback(async (): Promise<PositionOutcome> => {
    const cached = useCourierPositionStore.getState().position;
    if (isPositionFresh(cached)) return { ok: true, position: cached };

    setIsLocating(true);
    try {
      const reading = await readGps();

      if (!reading.ok) return { ok: false, reason: reading.reason };

      setStorePosition(reading.coords, "gps");
      const stored = useCourierPositionStore.getState().position;

      // `stored` acabou de ser escrito acima; o non-null é só pro TypeScript.
      return { ok: true, position: stored! };
    } finally {
      setIsLocating(false);
    }
  }, [setStorePosition]);

  /** Leitura nova de GPS pedida explicitamente (botão "tentar GPS"). */
  const refreshFromGps = useCallback(async (): Promise<PositionOutcome> => {
    setIsLocating(true);
    try {
      const reading = await readGps();
      if (!reading.ok) return { ok: false, reason: reading.reason };

      setStorePosition(reading.coords, "gps");
      return { ok: true, position: useCourierPositionStore.getState().position! };
    } finally {
      setIsLocating(false);
    }
  }, [setStorePosition]);

  /**
   * Converte o texto digitado em coordenada pelo Nominatim - o mesmo
   * `geocodeAddress` que o cadastro de loja e o de endereço usam.
   */
  const setFromText = useCallback(
    async (text: string): Promise<boolean> => {
      const query = text.trim();
      if (!query) return false;

      setIsGeocoding(true);
      try {
        // `geocodeAddress` monta a busca a partir dos campos do endereço;
        // aqui só há uma linha livre, então ela entra como `street` e o
        // helper completa com ", Brasil".
        const coords = await geocodeAddress({ street: query });
        if (!coords) return false;

        setStorePosition(coords, "manual", query);
        return true;
      } finally {
        setIsGeocoding(false);
      }
    },
    [setStorePosition],
  );

  return {
    position,
    isFresh: isPositionFresh(position),
    isLocating,
    isGeocoding,
    resolvePosition,
    refreshFromGps,
    setFromText,
  };
}
