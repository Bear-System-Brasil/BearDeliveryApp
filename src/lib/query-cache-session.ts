import type { QueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";

/**
 * Amarra o cache do TanStack Query à conta logada (LDMF-244).
 *
 * As chaves dos dados da empresa (kitchen-orders, company-orders,
 * financial...) não levam usuário nem empresa, e com staleTime de 5 min e
 * refetchOnMount: false a conta seguinte recebia o cache da anterior sem
 * nem bater no backend.
 *
 * Na saída da conta, cada query volta ao estado inicial com `query.reset()`:
 * - não usa `clear()`: ele tira a query do cache, mas quem está montado
 *   segue preso à query antiga - mostra o dado da conta anterior e deixa
 *   de receber invalidação do socket (tela congelada). No 401 a tela fica
 *   montada atrás do modal de login, então esse caso é real.
 * - não usa `resetQueries()`: ele refaz na hora as queries ativas, e no
 *   logout manual o cookie só cai depois (`apiService.logout()` roda após
 *   o `authStore.logout()`) - o refetch traria de volta o dado da conta que
 *   está saindo.
 *
 * Na entrada de uma conta, as queries ativas são refeitas já com a sessão
 * nova; sem isso a tela que ficou montada continuaria vazia.
 *
 * Mesmo gatilho do carrinho (LDMF-239): todo caminho que troca o usuário
 * passa pelo auth-store. Devolve a função que cancela a inscrição.
 */
export function bindQueryCacheToUser(queryClient: QueryClient) {
  let currentUserId = useAuthStore.getState().user?.id ?? null;

  return useAuthStore.subscribe((state) => {
    const nextUserId = state.user?.id ?? null;
    if (nextUserId === currentUserId) return;

    const previousUserId = currentUserId;
    currentUserId = nextUserId;

    if (previousUserId !== null) {
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => query.reset());
    }

    if (nextUserId !== null) {
      void queryClient.invalidateQueries();
    }
  });
}
