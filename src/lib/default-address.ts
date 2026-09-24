import {
  apiService,
  type Address,
  type UpdateAddressRequest,
} from "@/services/api";
import { onlyNumbers } from "@/utils";
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

type DefaultChange = { ok: boolean; message?: string };

/**
 * Campos do endereço que acompanham a segunda tentativa do PATCH.
 *
 * Saneados, e omitidos quando não passam: o valor vem do banco, não de um
 * formulário, e o PATCH valida tudo que recebe. Mandar de volta um CEP
 * incompleto que o POST deixou entrar faz a mudança de padrão falhar com
 * "CEP inválido" - um erro sobre um campo que não estamos tentando mudar.
 */
function addressFields(address: Address) {
  const zipCode = onlyNumbers(address.zipCode ?? "");
  const text = (value?: string | null) =>
    value && value.trim().length > 0 ? value.trim() : undefined;
  const coord = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

  return {
    ...(zipCode.length === 8 ? { zipCode } : {}),
    state: text(address.state),
    city: text(address.city),
    neighborhood: text(address.neighborhood),
    street: text(address.street),
    number: text(address.number),
    latitude: coord(address.latitude),
    longitude: coord(address.longitude),
  };
}

async function patchIsDefault(
  addressId: string,
  body: UpdateAddressRequest,
): Promise<DefaultChange> {
  try {
    const response = await apiService.address.updateUserAddress(
      addressId,
      body,
    );

    return { ok: response.success === true, message: response.message };
  } catch (error) {
    console.error("Erro ao mudar o endereço padrão:", error);
    return { ok: false };
  }
}

/**
 * Marca ou desmarca um endereço como padrão.
 *
 * Tenta primeiro com o corpo mínimo - é só uma flag que queremos mudar, e
 * é assim que o checkout marca padrão em produção desde o PR #96. Se o
 * backend recusar, tenta de novo com os campos do endereço junto, que é
 * como os outros pontos do app fazem (use-company-profile-management e o
 * formulário do perfil). As duas são idempotentes, então repetir não custa
 * nada além de um round-trip no caminho de erro.
 */
async function setIsDefault(
  address: Address | string,
  isDefault: boolean,
): Promise<DefaultChange> {
  const full = typeof address === "string" ? null : address;
  const addressId = typeof address === "string" ? address : address.id;

  const minimal = await patchIsDefault(addressId, { isDefault });

  if (minimal.ok || !full) return minimal;

  const withFields = await patchIsDefault(addressId, {
    isDefault,
    ...addressFields(full),
  });

  if (withFields.ok) return withFields;

  // As duas razões, quando diferem: a da primeira tentativa diz por que
  // mudar só a flag não passou, a da segunda diz por que o jeito do resto
  // do app também não. Uma sem a outra deixa metade do diagnóstico de fora.
  const reasons = [
    ...new Set([minimal.message, withFields.message].filter(Boolean)),
  ];

  return { ok: false, message: reasons.join(" / ") || undefined };
}

async function readUserAddresses(): Promise<Address[] | undefined> {
  try {
    const response = await apiService.address.getUserAddresses();

    if (!response.success || !Array.isArray(response.data)) return undefined;

    // DELETE é soft delete (isActive: false) - um endereço apagado não conta
    // como padrão de ninguém.
    return response.data.filter((address) => address.isActive !== false);
  } catch (error) {
    console.error("Erro ao ler os endereços do cliente:", error);
    return undefined;
  }
}

/** Ids de todos os endereços marcados como padrão agora. */
async function readDefaultAddressIds(): Promise<string[] | undefined> {
  const addresses = await readUserAddresses();

  return addresses
    ?.filter((address) => address.isDefault)
    .map((address) => address.id);
}

/** O alvo está marcado como padrão? `undefined` = não deu para saber. */
async function isDefaultNow(addressId: string): Promise<boolean | undefined> {
  const ids = await readDefaultAddressIds();

  return ids && ids.includes(addressId);
}

/**
 * O alvo é o ÚNICO padrão?
 *
 * Diferente de `isDefaultNow` de propósito: com dois padrões marcados, quem
 * escolhe o endereço da entrega é o backend, e "o alvo está entre eles" não
 * garante nada. Antes de finalizar um pedido, só a exclusividade serve.
 */
async function isOnlyDefault(addressId: string): Promise<boolean | undefined> {
  const ids = await readDefaultAddressIds();

  return ids && ids.length === 1 && ids[0] === addressId;
}

/**
 * Deixa `addressId` como o único endereço padrão do cliente.
 *
 * Promove primeiro e só depois desmarca os outros: se a promoção falhar,
 * nada mudou - é o que se espera de um salvamento que deu errado. A ordem
 * inversa (desmarcar antes) deixava o cliente sem padrão nenhum quando o
 * segundo passo falhava, e sem padrão o finalizar de entrega quebra.
 *
 * Usado pelo perfil, onde não há pedido em andamento. O checkout usa
 * `takeOverDefaultAddress`, que precisa da ordem contrária.
 */
export async function setDefaultAddress(
  addresses: Address[],
  addressId: string,
): Promise<{ promoted: boolean; demotedAll: boolean; message?: string }> {
  const target = addresses.find((address) => address.id === addressId) ?? null;
  const promotion = await setIsDefault(target ?? addressId, true);

  if (!promotion.ok) {
    // O PATCH pode ter respondido erro e mesmo assim ter gravado, ou o
    // backend pode desmarcar o anterior sozinho e responder de um jeito que
    // não reconhecemos. Quem decide é o estado, não o status.
    //
    // Aqui basta o alvo estar marcado: desmarcar os outros é o passo
    // seguinte. Não deu para ler o estado (`undefined`) conta como falha -
    // o único sinal que temos é o erro que o backend devolveu.
    if ((await isDefaultNow(addressId)) !== true) {
      return { promoted: false, demotedAll: false, message: promotion.message };
    }
  }

  // O backend não desmarca o padrão anterior sozinho (ver adress.md): dois
  // endereços padrão ao mesmo tempo deixariam o backend escolher qual usar
  // na entrega, e a escolha errada é silenciosa.
  const previousDefaults = addresses.filter(
    (address) => address.isDefault && address.id !== addressId,
  );

  const results = await Promise.all(
    previousDefaults.map((address) => setIsDefault(address, false)),
  );

  return {
    promoted: true,
    demotedAll: results.every((result) => result.ok),
    message: results.find((result) => !result.ok)?.message,
  };
}

/**
 * O erro diz qual passo falhou, e não só que algo falhou.
 *
 * Marcar o endereço do pedido e desmarcar o anterior são dois PATCHes
 * diferentes, e o backend valida cada um do seu jeito. Uma mensagem que
 * não diz qual dos dois quebrou custa uma rodada de testes inteira.
 */
function deliveryAddressError(step: string, message?: string) {
  return new Error(
    message
      ? `Não foi possível ${step}: ${message}`
      : `Não foi possível ${step}. Tente novamente ou escolha outro endereço.`,
  );
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
  const target = addresses.find((address) => address.id === addressId) ?? null;

  if (previousDefault?.id === addressId) return null;

  if (!previousDefault) {
    const promotion = await setIsDefault(target ?? addressId, true);

    if (!promotion.ok && (await isOnlyDefault(addressId)) !== true) {
      throw deliveryAddressError(
        "usar este endereço na entrega",
        promotion.message,
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

  const demotion = await setIsDefault(previousDefault, false);
  const promotion = await setIsDefault(target ?? addressId, true);

  // Nenhum dos dois status decide sozinho: o que importa é quem ficou como
  // padrão no fim. Só assim a entrega sai no endereço que o cliente
  // escolheu, e não no que um 200 enganoso sugeriu.
  const exclusive = await isOnlyDefault(addressId);
  const succeeded =
    exclusive === undefined ? demotion.ok && promotion.ok : exclusive;

  if (!succeeded) {
    await restoreDefaultAddress(swap);

    throw demotion.ok
      ? deliveryAddressError("usar este endereço na entrega", promotion.message)
      : deliveryAddressError(
          "desmarcar seu endereço padrão anterior",
          demotion.message,
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
  // Uma leitura só, que serve para dois fins: montar o corpo do PATCH que
  // desmarca (que vai com os campos do endereço junto) e, no fim, conferir
  // em que estado o cliente ficou.
  const before = await readUserAddresses();
  const promotedAddress =
    before?.find((address) => address.id === swap.promotedId) ?? null;

  const demoted = await setIsDefault(
    promotedAddress ?? swap.promotedId,
    false,
  );
  const promoted = await setIsDefault(swap.previousDefaultId, true);

  // De novo, quem decide é o estado. Um PATCH que respondeu erro mas gravou
  // deixaria a troca registrada para sempre, e toda abertura do checkout
  // tentaria desfazer o que já está desfeito.
  const exclusive = await isOnlyDefault(swap.previousDefaultId);
  const back = exclusive === undefined ? promoted.ok : exclusive;

  // A troca só sai do storage quando o padrão anterior está de volta. Se
  // falhar, a próxima abertura do checkout ou do perfil tenta de novo, em
  // vez de deixar o cliente com a preferência trocada.
  if (back) clearPendingDefaultSwap();

  return back && demoted.ok;
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
