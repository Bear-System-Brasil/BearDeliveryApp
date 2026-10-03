"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeText, parseCoords } from "@/lib/geocode";
import { nominatim } from "@/lib/nominatim";
import {
  findNeighborhood,
  getNeighborhoods,
  type CityNeighborhoods,
} from "@/services/neighborhoods";
import { Coords } from "@/types/restaurant";

/**
 * Espera depois da última tecla em rua/número antes de buscar: uma busca por
 * endereço preenchido, nunca uma por letra.
 */
export const ADDRESS_SEARCH_DELAY_MS = 800;

/** Zoom do mapa conforme a origem do pino. */
export const STREET_ZOOM = 17;
export const NEIGHBORHOOD_ZOOM = 15;
export const CITY_ZOOM = 13;

export type PinSource = "neighborhood" | "geocode";

export type AddressPinFields = {
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
};

type Options = {
  fields: AddressPinFields;
  /** Chamado quando o preenchimento define uma nova posição para o pino. */
  onPin: (coords: Coords, source: PinSource, zoom: number) => void;
};

function addressKey({ street, number, city, state }: AddressPinFields) {
  const parts = [street, number, city, state].map((part) => normalizeText(part));
  return parts.every(Boolean) ? parts.join("|") : "";
}

/**
 * Pino que acompanha o preenchimento do endereço (LDMF-261):
 *
 * 1. Bairro da lista escolhido → centro do bairro; sem coordenada do bairro,
 *    centro da cidade pelo Nominatim.
 * 2. Rua e número preenchidos → uma busca no Nominatim; só move o pino se o
 *    ponto cair dentro da cidade. Sem resultado, o pino fica onde estava.
 *
 * Vale sempre a última ação do cliente. Nada aqui roda na hora de salvar.
 */
export function useAddressPin({ fields, onPin }: Options) {
  const [neighborhoodList, setNeighborhoodList] =
    useState<CityNeighborhoods | null>(null);
  const [isLocatingNeighborhood, setIsLocatingNeighborhood] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  // A última busca de rua e número não achou nada dentro da cidade.
  const [addressNotFound, setAddressNotFound] = useState(false);

  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  // Valores que já estão representados no pino (endereço aberto para edição
  // ou última busca feita). Só mudança em relação a eles dispara algo.
  const baseline = useRef({ neighborhood: "", address: "" });

  const state = fields.state?.trim() ?? "";
  const city = fields.city?.trim() ?? "";
  const neighborhood = fields.neighborhood ?? "";
  const street = fields.street ?? "";
  const number = fields.number ?? "";
  const currentAddressKey = addressKey({ street, number, city, state });

  useEffect(() => {
    let active = true;

    getNeighborhoods(state, city).then((list) => {
      if (active) setNeighborhoodList(list);
    });

    return () => {
      active = false;
    };
  }, [state, city]);

  useEffect(() => {
    if (!neighborhoodList) return;

    const key = normalizeText(neighborhood);
    if (!key || key === baseline.current.neighborhood) return;

    // Nome oficial ou alternativo. Trocar um pelo outro (ex.: "Jardim
    // Primavera" → "Pantanal") é o mesmo bairro e não mexe no pino.
    const item = findNeighborhood(neighborhoodList, key);
    const previous = findNeighborhood(neighborhoodList, baseline.current.neighborhood);
    baseline.current.neighborhood = key;
    if (!item || item === previous) return;

    const neighborhoodCenter = parseCoords(item.lat, item.lng);
    if (neighborhoodCenter) {
      onPinRef.current(neighborhoodCenter, "neighborhood", NEIGHBORHOOD_ZOOM);
      return;
    }

    let active = true;
    setIsLocatingNeighborhood(true);

    nominatim
      .searchCity({ city: neighborhoodList.city, state: neighborhoodList.state })
      .then((cityCenter) => {
        if (active && cityCenter) {
          onPinRef.current(cityCenter, "neighborhood", CITY_ZOOM);
        }
      })
      .finally(() => {
        if (active) setIsLocatingNeighborhood(false);
      });

    return () => {
      active = false;
      setIsLocatingNeighborhood(false);
    };
  }, [neighborhood, neighborhoodList]);

  useEffect(() => {
    if (!currentAddressKey) {
      setAddressNotFound(false);
      return;
    }
    if (currentAddressKey === baseline.current.address) return;

    let active = true;

    const timer = setTimeout(async () => {
      baseline.current.address = currentAddressKey;
      setAddressNotFound(false);
      setIsSearchingAddress(true);

      const coords = await nominatim.searchAddress({ street, number, city, state });
      if (!active) return;

      setIsSearchingAddress(false);
      // Não achou ou caiu fora da cidade: o pino fica onde estava e o
      // cliente é avisado para arrastar.
      if (coords) onPinRef.current(coords, "geocode", STREET_ZOOM);
      else setAddressNotFound(true);
    }, ADDRESS_SEARCH_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
      setIsSearchingAddress(false);
    };
  }, [currentAddressKey, street, number, city, state]);

  /**
   * Marca os valores atuais como já representados no pino: ao abrir um
   * endereço salvo para edição (o pino já está na coordenada dele) ou ao
   * limpar o formulário.
   */
  const resetBaseline = useCallback((values: AddressPinFields = {}) => {
    baseline.current = {
      neighborhood: normalizeText(values.neighborhood),
      address: addressKey(values),
    };
    setAddressNotFound(false);
  }, []);

  /** O cliente posicionou o pino à mão: o aviso de não encontrado sai. */
  const clearNotice = useCallback(() => setAddressNotFound(false), []);

  return {
    /** Lista oficial de bairros da cidade, ou `null` sem lista. */
    neighborhoodList,
    isLocatingNeighborhood,
    isSearchingAddress,
    addressNotFound,
    resetBaseline,
    clearNotice,
  };
}
