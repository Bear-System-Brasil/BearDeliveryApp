import { apiService, type Address } from "@/services/api";
import { STORAGE_KEYS, localStorageAdapter } from "@/utils/storage-manager";

/**
 * O backend monta a entrega a partir do endereço PADRÃO do cliente
 * (order.md, POST /order/:id): o corpo do finalizar não aceita
 * `deliveryAddressId`. Então, para o pedido sair no endereço que o cliente
 * escolheu no checkout, o front promove esse endereço a padrão só durante a
 * finalização e devolve o padrão anterior logo depois.
 *
 * A troca é gravada em localStorage ANTES do primeiro PATCH. Se a aba fechar
 * no meio, `restorePendingDefaultAddress` desfaz na próxima vez que o cliente
 * abrir o checkout ou o perfil - sem isso, uma finalização interrompida
 * deixaria a preferência do cliente trocada para sempre.
 *
 * Remover quando POST /order/:id aceitar `deliveryAddressId`.
 */
export type PendingDefaultSwap = {
  /** Endereço que era padrão antes do pedido - o que tem de voltar. */
  previousDefaultId: string;
  /** Endereço promovido só para este pedido. */
  promotedId: string;
  /** Evita restaurar o padrão de um cliente na sessão de outro. */
  userId: string;
};

function isPendingSwap(value: unknown): value is PendingDefaultSwap {
  if (!value || typeof value !== "object") return false;
  const swap = value as Record<string, unknown>;
  return (
    typeof swap.previousDefaultId === "string" &&
    typeof swap.promotedId === "string" &&
    typeof swap.userId === "string"
  );
}

export function readPendingDefaultSwap(): PendingDefaultSwap | null {
  const stored = localStorageAdapter.getItem<unknown>(
    STORAGE_KEYS.PENDING_DEFAULT_ADDRESS,
  );

  return isPendingSwap(stored) ? stored : null;
}

export function savePendingDefaultSwap(swap: PendingDefaultSwap): void {
  localStorageAdapter.setItem(STORAGE_KEYS.PENDING_DEFAULT_ADDRESS, swap);
}

export function clearPendingDefaultSwap(): void {
  localStorageAdapter.removeItem(STORAGE_KEYS.PENDING_DEFAULT_ADDRESS);
}

export function findDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((address) => address.isDefault) ?? null;
}

async function setIsDefault(addressId: string, isDefault: boolean) {
  try {
    const response = await apiService.address.updateUserAddress(addressId, {
      isDefault,
    });
    return response.success === true;
  } catch (error) {
    console.error(
      `Erro ao ${isDefault ? "definir" : "desmarcar"} endereço padrão:`,
      error,
    );
    return false;
  }
}

/**
 * Deixa `addressId` como o único endereço padrão do cliente.
 *
 * Promove primeiro e só depois desmarca os outros: se a promoção falhar,
 * nada mudou: é o que se espera de um salvamento que deu errado. A ordem
 * inversa (desmarcar antes) deixava o cliente sem padrão nenhum quando o
 * segundo passo falhava, e sem padrão o finalizar de entrega quebra.
 *
 * Usado pelo perfil, onde não há pedido em andamento. O checkout usa
 * `takeOverDefaultAddress`, que precisa da ordem contrária.
 */
export async function setDefaultAddress(
  addresses: Address[],
  addressId: string,
): Promise<{ promoted: boolean; demotedAll: boolean }> {
  const promoted = await setIsDefault(addressId, true);
  if (!promoted) return { promoted: false, demotedAll: false };

  // O backend não desmarca o padrão anterior sozinho (ver adress.md): dois
  // endereços padrão ao mesmo tempo deixariam o backend escolher qual usar
  // na entrega, e a escolha errada é silenciosa.
  const previousDefaults = addresses.filter(
    (address) => address.isDefault && address.id !== addressId,
  );

  const results = await Promise.all(
    previousDefaults.map((address) => setIsDefault(address.id, false)),
  );

  return { promoted: true, demotedAll: results.every(Boolean) };
}

/**
 * Assume o endereço do pedido como padrão durante a finalização.
 *
 * Devolve a troca a ser desfeita depois, ou `null` quando não houve o que
 * trocar - seja porque o endereço do pedido já era o padrão, seja porque o
 * cliente não tinha padrão nenhum. Nesse segundo caso a promoção fica de
 * pé: não há preferência a proteger, e o cliente sai do checkout com o
 * padrão que faltava.
 *
 * Aqui a ordem é desmarcar-e-depois-promover, ao contrário do perfil: entre
 * os dois PATCHes existe um pedido prestes a ser finalizado, e uma janela
 * com dois padrões faria o backend escolher o endereço de entrega sozinho.
 * Zero padrões, por outro lado, faz o finalizar falhar em voz alta - e o
 * chamador desfaz a troca e cancela.
 */
export async function takeOverDefaultAddress({
  addresses,
  addressId,
  userId,
}: {
  addresses: Address[];
  addressId: string;
  userId: string;
}): Promise<PendingDefaultSwap | null> {
  const previousDefault = findDefaultAddress(addresses);

  if (previousDefault?.id === addressId) return null;

  if (!previousDefault) {
    const promoted = await setIsDefault(addressId, true);

    if (!promoted) {
      throw new Error(
        "Não foi possível definir o endereço de entrega. Tente novamente ou escolha outro endereço.",
      );
    }

    return null;
  }

  const swap: PendingDefaultSwap = {
    previousDefaultId: previousDefault.id,
    promotedId: addressId,
    userId,
  };

  // Gravado antes do primeiro PATCH: é o que permite desfazer a troca se a
  // aba fechar no meio do caminho.
  savePendingDefaultSwap(swap);

  const demoted = await setIsDefault(previousDefault.id, false);

  if (!demoted) {
    clearPendingDefaultSwap();
    throw new Error(
      "Não foi possível definir o endereço de entrega. Tente novamente ou escolha outro endereço.",
    );
  }

  const promoted = await setIsDefault(addressId, true);

  if (!promoted) {
    await restoreDefaultAddress(swap);
    throw new Error(
      "Não foi possível definir o endereço de entrega. Tente novamente ou escolha outro endereço.",
    );
  }

  return swap;
}

/**
 * Devolve o padrão que o cliente tinha antes do pedido.
 *
 * Mesma ordem da troca (desmarcar antes de promover) pelo mesmo motivo: se
 * o segundo passo falhar, o cliente fica sem padrão - o que o próximo pedido
 * denuncia e conserta - em vez de com dois, que manda a entrega para um
 * endereço escolhido pelo backend.
 */
export async function restoreDefaultAddress(
  swap: PendingDefaultSwap,
): Promise<boolean> {
  const demoted = await setIsDefault(swap.promotedId, false);
  const promoted = await setIsDefault(swap.previousDefaultId, true);

  // A troca só sai do storage quando o padrão anterior está de volta. Se a
  // promoção falhar, a próxima abertura do checkout ou do perfil tenta de
  // novo, em vez de deixar o cliente com a preferência trocada.
  if (promoted) clearPendingDefaultSwap();

  return demoted && promoted;
}

/**
 * Desfaz uma troca que ficou pela metade (aba fechada, rede caída, F5 no
 * meio do finalizar). Chamado na montagem do checkout e do perfil.
 */
export async function restorePendingDefaultAddress(
  userId: string | undefined,
): Promise<boolean> {
  const swap = readPendingDefaultSwap();

  if (!swap || !userId || swap.userId !== userId) return false;

  return restoreDefaultAddress(swap);
}
