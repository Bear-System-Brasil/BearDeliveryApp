"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Erro no proprio layout raiz - o ErrorBoundary do layout nao alcanca este
 * caso. Substitui o layout inteiro, por isso traz <html> e <body> e usa
 * estilo inline (os providers de tema e o CSS global podem nao ter subido).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Algo deu errado</h1>
        <p style={{ margin: 0, color: "#666" }}>
          Já fomos avisados. Tente de novo em instantes.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "10px 20px",
            border: 0,
            borderRadius: 8,
            background: "#FF7A00",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
