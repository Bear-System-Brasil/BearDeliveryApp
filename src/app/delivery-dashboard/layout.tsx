import type { ReactNode } from "react";

import { DeliveryTabBar } from "@/components/delivery-dashboard/delivery-tab-bar";
import ProtectedRoute from "@/components/protected-route";

/**
 * Casca da área de entregas: proteção de role, espaço reservado pra barra
 * própria e a barra.
 *
 * O `ProtectedRoute` vive aqui e não em cada página - além de tirar a
 * repetição, evita a barra de entregas piscar pra quem não tem a role
 * enquanto a checagem roda.
 *
 * O padding é daqui, não do `AppFrame`: a BottomBar do cliente se esconde
 * nestas rotas, então o layout raiz não reserva nada e quem reserva a altura
 * da própria barra é esta camada.
 */

// Fora do componente porque `ProtectedRoute` tem `allowedRoles` no array de
// dependências de um efeito - um literal novo a cada render o re-dispara.
const DELIVERY_ROLES = ["delivery"];

export default function DeliveryAreaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={DELIVERY_ROLES}>
      <div className="min-h-screen bg-muted pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <DeliveryTabBar />
    </ProtectedRoute>
  );
}
