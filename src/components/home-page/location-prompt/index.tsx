"use client";

import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GeolocationButton } from "@/components/user-location/geolocation-button";
import { openLocationSheet } from "@/lib/location-sheet";

/**
 * Tela de entrada de quem ainda não escolheu endereço. Sem ele a home não
 * tem como saber quem entrega no local do cliente - listar o catálogo
 * inteiro só mostrava lojas de outras cidades.
 */
export function LocationPrompt() {
  return (
    <section
      aria-labelledby="location-prompt-title"
      className="rounded-2xl border border-border bg-card px-5 py-8 text-center shadow-sm sm:px-8 sm:py-12"
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-950/40">
          <MapPin className="h-8 w-8" />
        </span>

        <h2
          id="location-prompt-title"
          className="mt-5 text-lg font-extrabold tracking-tight text-foreground sm:text-xl"
        >
          Onde você quer receber seu pedido?
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Informe seu endereço para ver as lojas que entregam perto de você,
          com o frete e o tempo de entrega certos.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2.5 sm:max-w-xs">
          <Button
            type="button"
            onClick={() => openLocationSheet("form")}
            className="h-12 w-full rounded-xl bg-orange-500 text-[15px] font-bold text-white hover:bg-orange-600"
          >
            Informar endereço
          </Button>

          <GeolocationButton
            autoRequest={false}
            variant="outline"
            className="h-12 w-full rounded-xl text-[15px] font-bold"
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Usamos o endereço apenas para mostrar quem entrega até você.
        </p>
      </div>
    </section>
  );
}
