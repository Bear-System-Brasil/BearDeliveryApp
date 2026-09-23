import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "@/services/api";

/**
 * Enquanto POST /order/:id não aceitar `deliveryAddressId`, o endereço da
 * entrega é o PADRÃO do cliente. Trocar esse padrão no meio de um pedido é
 * mexer numa preferência que não é nossa - e a ordem dos dois PATCHes decide
 * se uma falha no meio quebra em voz alta ou entrega no endereço errado em
 * silêncio. É isso que estes testes travam.
 */

const updateUserAddress = vi.fn();

vi.mock("@/services/api", () => ({
  apiService: { address: { updateUserAddress } },
}));

const {
  restoreDefaultAddress,
  restorePendingDefaultAddress,
  setDefaultAddress,
  takeOverDefaultAddress,
  readPendingDefaultSwap,
} = await import("./default-address");

const { STORAGE_KEYS } = await import("@/utils/storage-manager");

const address = (id: string, isDefault: boolean) =>
  ({ id, isDefault }) as Address;

/** Ordem em que cada endereço foi marcado/desmarcado, na sequência real. */
const calls = () =>
  updateUserAddress.mock.calls.map(
    ([id, body]) => `${id}:${body.isDefault ? "on" : "off"}`,
  );

beforeEach(() => {
  updateUserAddress.mockReset();
  updateUserAddress.mockResolvedValue({ success: true, data: {} });
  localStorage.clear();
});

describe("takeOverDefaultAddress", () => {
  it("não mexe em nada quando o endereço do pedido já é o padrão", async () => {
    const swap = await takeOverDefaultAddress({
      addresses: [address("addr-1", true)],
      addressId: "addr-1",
      userId: "user-1",
    });

    expect(swap).toBeNull();
    expect(updateUserAddress).not.toHaveBeenCalled();
  });

  it("promove e não agenda volta quando o cliente não tinha padrão nenhum", async () => {
    const swap = await takeOverDefaultAddress({
      addresses: [address("addr-1", false)],
      addressId: "addr-1",
      userId: "user-1",
    });

    // Não há preferência a proteger: o cliente sai do checkout com o padrão
    // que faltava, em vez de voltar ao estado que quebra o próximo pedido.
    expect(swap).toBeNull();
    expect(calls()).toEqual(["addr-1:on"]);
    expect(readPendingDefaultSwap()).toBeNull();
  });

  it("desmarca o padrão antigo ANTES de promover o novo", async () => {
    const swap = await takeOverDefaultAddress({
      addresses: [address("addr-1", false), address("addr-2", true)],
      addressId: "addr-1",
      userId: "user-1",
    });

    // A ordem importa: promover primeiro deixaria uma janela com dois
    // padrões, e aí quem escolhe o endereço da entrega é o backend.
    expect(calls()).toEqual(["addr-2:off", "addr-1:on"]);
    expect(swap).toEqual({
      previousDefaultId: "addr-2",
      promotedId: "addr-1",
      userId: "user-1",
    });
  });

  it("grava a troca antes do primeiro PATCH", async () => {
    let storedAtFirstPatch: unknown = "não gravado";

    updateUserAddress.mockImplementation(async () => {
      if (storedAtFirstPatch === "não gravado") {
        storedAtFirstPatch = localStorage.getItem(
          STORAGE_KEYS.PENDING_DEFAULT_ADDRESS,
        );
      }
      return { success: true, data: {} };
    });

    await takeOverDefaultAddress({
      addresses: [address("addr-1", false), address("addr-2", true)],
      addressId: "addr-1",
      userId: "user-1",
    });

    // Se a aba fechar entre os dois PATCHes, é este registro que devolve o
    // padrão do cliente na próxima abertura.
    expect(storedAtFirstPatch).toContain("addr-2");
  });

  it("devolve o padrão antigo e falha quando a promoção não passa", async () => {
    updateUserAddress.mockImplementation(async (_id, body) => ({
      success: body.isDefault !== true,
    }));

    await expect(
      takeOverDefaultAddress({
        addresses: [address("addr-1", false), address("addr-2", true)],
        addressId: "addr-1",
        userId: "user-1",
      }),
    ).rejects.toThrow(/endereço de entrega/i);

    // Sem isso o cliente ficaria sem padrão nenhum por causa de um pedido
    // que nem chegou a ser criado.
    expect(calls()).toEqual(["addr-2:off", "addr-1:on", "addr-1:off", "addr-2:on"]);
  });

  it("falha sem tocar em nada quando não consegue desmarcar o antigo", async () => {
    updateUserAddress.mockResolvedValue({ success: false });

    await expect(
      takeOverDefaultAddress({
        addresses: [address("addr-1", false), address("addr-2", true)],
        addressId: "addr-1",
        userId: "user-1",
      }),
    ).rejects.toThrow(/endereço de entrega/i);

    expect(calls()).toEqual(["addr-2:off"]);
    // Nada a desfazer depois: a troca não chegou a acontecer.
    expect(readPendingDefaultSwap()).toBeNull();
  });
});

describe("restoreDefaultAddress", () => {
  const swap = {
    previousDefaultId: "addr-2",
    promotedId: "addr-1",
    userId: "user-1",
  };

  it("desmarca o promovido antes de devolver o antigo, e limpa o registro", async () => {
    await expect(restoreDefaultAddress(swap)).resolves.toBe(true);

    expect(calls()).toEqual(["addr-1:off", "addr-2:on"]);
    expect(readPendingDefaultSwap()).toBeNull();
  });

  it("mantém o registro quando não consegue devolver o antigo", async () => {
    const { savePendingDefaultSwap } = await import("./default-address");
    savePendingDefaultSwap(swap);

    updateUserAddress.mockImplementation(async (id) => ({
      success: id !== "addr-2",
    }));

    await expect(restoreDefaultAddress(swap)).resolves.toBe(false);

    // A próxima abertura do checkout ou do perfil tenta de novo, em vez de
    // deixar o cliente com a preferência trocada para sempre.
    expect(readPendingDefaultSwap()).toEqual(swap);
  });
});

describe("restorePendingDefaultAddress", () => {
  it("desfaz a troca que ficou pela metade", async () => {
    const { savePendingDefaultSwap } = await import("./default-address");
    savePendingDefaultSwap({
      previousDefaultId: "addr-2",
      promotedId: "addr-1",
      userId: "user-1",
    });

    await expect(restorePendingDefaultAddress("user-1")).resolves.toBe(true);
    expect(calls()).toEqual(["addr-1:off", "addr-2:on"]);
  });

  it("não restaura a troca de um cliente na sessão de outro", async () => {
    const { savePendingDefaultSwap } = await import("./default-address");
    savePendingDefaultSwap({
      previousDefaultId: "addr-2",
      promotedId: "addr-1",
      userId: "user-1",
    });

    await expect(restorePendingDefaultAddress("user-2")).resolves.toBe(false);
    expect(updateUserAddress).not.toHaveBeenCalled();
  });

  it("não faz nada quando não há troca pendente", async () => {
    await expect(restorePendingDefaultAddress("user-1")).resolves.toBe(false);
    expect(updateUserAddress).not.toHaveBeenCalled();
  });
});

describe("setDefaultAddress", () => {
  it("promove o escolhido antes de desmarcar os outros", async () => {
    const result = await setDefaultAddress(
      [address("addr-1", false), address("addr-2", true)],
      "addr-1",
    );

    // No perfil não há pedido em andamento: o risco a evitar é o salvamento
    // falhar no meio e deixar o cliente sem padrão nenhum.
    expect(calls()).toEqual(["addr-1:on", "addr-2:off"]);
    expect(result).toEqual({ promoted: true, demotedAll: true });
  });

  it("não desmarca ninguém quando a promoção falha", async () => {
    updateUserAddress.mockResolvedValue({ success: false });

    const result = await setDefaultAddress(
      [address("addr-1", false), address("addr-2", true)],
      "addr-1",
    );

    expect(calls()).toEqual(["addr-1:on"]);
    expect(result).toEqual({ promoted: false, demotedAll: false });
  });

  it("avisa quando sobrou um padrão antigo marcado", async () => {
    updateUserAddress.mockImplementation(async (id) => ({
      success: id !== "addr-2",
    }));

    const result = await setDefaultAddress(
      [address("addr-1", false), address("addr-2", true)],
      "addr-1",
    );

    expect(result).toEqual({ promoted: true, demotedAll: false });
  });
});
