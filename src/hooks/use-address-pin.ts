"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeText, parseCoords } from "@/lib/geocode";
import { nominatim } from "@/lib/nominatim";
import {
  getNeighborhoods,
  type CityNeighborhoods,
} from "@/services/neighborhoods";
import { Coords } from "@/types/restaurant";

/**
 * Espera depois da última tecla em rua/número antes de buscar: uma busca por
 * endereço preenchido, nunca uma por letra.
 */
export const ADDRESS_SEARCH_DELAY_MS = 800;

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
  onPin: (coords: Coords, source: PinSource) => void;
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
    baseline.current.neighborhood = key;

    const item = neighborhoodList.neighborhoods.find(
      (option) => normalizeText(option.name) === key,
    );
    if (!item) return;

    const neighborhoodCenter = parseCoords(item.lat, item.lng);
    if (neighborhoodCenter) {
      onPinRef.current(neighborhoodCenter, "neighborhood");
      return;
    }

    let active = true;
    setIsLocatingNeighborhood(true);

    nominatim
      .searchCity({ city: neighborhoodList.city, state: neighborhoodList.state })
      .then((cityCenter) => {
        if (active && cityCenter) onPinRef.current(cityCenter, "neighborhood");
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
    if (!currentAddressKey || currentAddressKey === baseline.current.address) {
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      baseline.current.address = currentAddressKey;
      setIsSearchingAddress(true);

      const coords = await nominatim.searchAddress({ street, number, city, state });
      if (!active) return;

      setIsSearchingAddress(false);
      if (coords) onPinRef.current(coords, "geocode");
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
  }, []);

  return {
    /** Lista oficial de bairros da cidade, ou `null` sem lista. */
    neighborhoodList,
    isLocating: isLocatingNeighborhood || isSearchingAddress,
    resetBaseline,
  };
}
