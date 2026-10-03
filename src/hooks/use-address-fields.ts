"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { BRAZIL_STATES } from "@/constants/brazil-states";
import { getCities, getStates, type IbgeState } from "@/services/ibge";

import type { AddressFormData } from "./use-form-validation";

const FALLBACK_STATES: IbgeState[] = Object.entries(BRAZIL_STATES)
  .map(([uf, name]) => ({ uf, name }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

/** Campos que vêm depois de cada um na ordem do formulário (LDMF-260). */
const FOLLOWING: Record<"state" | "city" | "neighborhood", (keyof AddressFormData)[]> = {
  state: ["city", "neighborhood", "street", "number", "complement"],
  city: ["neighborhood", "street", "number", "complement"],
  neighborhood: ["street", "number", "complement"],
};

export type AddressFieldLocks = {
  city: boolean;
  neighborhood: boolean;
  street: boolean;
  number: boolean;
  rest: boolean;
};

type Options = {
  form: UseFormReturn<AddressFormData>;
  /** Só consulta o IBGE com o formulário aberto. */
  enabled: boolean;
  /** Um campo anterior mudou: o pino e o que ele representava deixam de valer. */
  onPreviousFieldChange: () => void;
  /** O cliente escolheu "Outro" na lista de bairros. */
  onOtherNeighborhood?: () => void;
};

/**
 * Ordem e trava dos campos do endereço: CEP e Estado liberados, depois
 * Cidade → Bairro → Rua → Número → demais campos. Estado e Cidade vêm da API
 * de localidades do IBGE. Trocar estado, cidade ou bairro limpa os campos
 * seguintes e o pino.
 */
export function useAddressFields({
  form,
  enabled,
  onPreviousFieldChange,
  onOtherNeighborhood,
}: Options) {
  // "Outro" na lista de bairros (decisão na LDMF-260): bairro fora da lista
  // não trava o cadastro; o cliente digita o nome.
  const [otherNeighborhood, setOtherNeighborhood] = useState(false);

  const [state, city, neighborhood, street, number] = form.watch([
    "state",
    "city",
    "neighborhood",
    "street",
    "number",
  ]);
  const uf = (state ?? "").trim().toUpperCase();

  const statesQuery = useQuery({
    queryKey: ["ibge", "states"],
    queryFn: getStates,
    enabled,
    staleTime: Infinity,
    retry: 1,
  });

  const citiesQuery = useQuery({
    queryKey: ["ibge", "cities", uf],
    queryFn: () => getCities(uf),
    enabled: enabled && uf.length === 2,
    staleTime: Infinity,
    retry: 1,
  });

  // Sem resposta do IBGE, os estados vêm da lista fixa (é a mesma lista).
  const stateOptions =
    statesQuery.data && statesQuery.data.length > 0
      ? statesQuery.data
      : statesQuery.isError
        ? FALLBACK_STATES
        : [];

  function change(
    field: "state" | "city" | "neighborhood",
    value: string,
  ) {
    if ((form.getValues(field) ?? "") === value) return;

    // Estado ou cidade novos: o "Outro" escolhido era da cidade anterior.
    if (field !== "neighborhood") setOtherNeighborhood(false);

    form.setValue(field, value, { shouldValidate: true, shouldDirty: true });
    for (const next of FOLLOWING[field]) {
      form.setValue(next, "", { shouldDirty: true });
    }
    onPreviousFieldChange();
  }

  const locks: AddressFieldLocks = {
    city: !uf,
    neighborhood: !(city ?? "").trim(),
    street: !(neighborhood ?? "").trim(),
    number: !(street ?? "").trim(),
    rest: !(number ?? "").trim(),
  };

  return {
    stateOptions,
    isLoadingStates: statesQuery.isLoading,
    /** Municípios do estado; `null` enquanto carrega ou se o IBGE falhar. */
    cityOptions: citiesQuery.data?.map((item) => item.name) ?? null,
    isLoadingCities: citiesQuery.isFetching,
    citiesError: citiesQuery.isError,
    locks,
    changeState: (value: string) => change("state", value.trim().toUpperCase()),
    changeCity: (value: string) => change("city", value.trim()),
    /** Bairro da lista (ou campo livre, em cidade sem lista). */
    changeNeighborhood: (value: string) => {
      // Sair do "Outro" para um bairro da lista descarta o nome digitado.
      setOtherNeighborhood(false);
      change("neighborhood", value);
    },
    otherNeighborhood,
    /** "Outro": limpa o bairro (e os campos seguintes) e pede o nome. */
    selectOtherNeighborhood: () => {
      setOtherNeighborhood(true);
      change("neighborhood", "");
      onOtherNeighborhood?.();
    },
    /** Nome digitado em "Qual é o seu bairro?", salvo como foi escrito. */
    changeOtherNeighborhood: (value: string) => {
      setOtherNeighborhood(true);
      form.setValue("neighborhood", value, { shouldValidate: true, shouldDirty: true });
    },
    resetOtherNeighborhood: () => setOtherNeighborhood(false),
  };
}
