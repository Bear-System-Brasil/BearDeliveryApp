"use client";

// TEMPORARIO (LDMF-253): provoca erro de render pra validar no preview que o
// Sentry recebe o erro com stack legivel. Sai antes do PR.
import { useState } from "react";
import { Button } from "@/components/ui/button";

function ComponenteQuebrado(): never {
  throw new Error("Teste LDMF-253: erro de render provocado de proposito");
}

export default function SentryTestePage() {
  const [quebrar, setQuebrar] = useState(false);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Teste do Sentry</h1>
      <p className="text-muted-foreground text-sm">
        O botão quebra esta tela de propósito. O erro deve aparecer no painel
        do Sentry em alguns segundos.
      </p>
      <Button onClick={() => setQuebrar(true)}>Provocar erro</Button>
      {quebrar && <ComponenteQuebrado />}
    </main>
  );
}
