import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address, UpdateAddressRequest } from "@/services/api";

/**
 * Enquanto POST /order/:id não aceitar `deliveryAddressId`, o endereço da
 * entrega é o PADRÃO do cliente. Trocar esse padrão no meio de um pedido é
 * mexer numa preferência que não é nossa - e a ordem dos dois PATCHes decide
 * se uma falha no meio quebra em voz alta ou entrega no endereço errado em
 * silêncio.
 *
 * Os testes rodam contra um backend de mentira que guarda estado, e não
 * contra mocks que só devolvem `success`. É o que permite separar as duas
 * coisas que a produção mostrou não andarem juntas: o que o PATCH respondeu
 * e o que ele de fato gravou.
 */

type FakeAddress = Address & { isDefault: boolean };

/** Estado do "banco": o PATCH mexe aqui, o GET lê daqui. */
let backend: FakeAddress[] = [];

/** Decide, por chamada, se o PATCH grava e o que responde. */
let patchRule: (
  id: string,
  body: UpdateAddressRequest,
) => { success: boolean; persists?: boolean; message?: string };

const updateUserAddress = vi.fn(
  async (id: string, body: UpdateAddressRequest) => {
    const outcome = patchRule(id, body);

    if (outcome.persists ?? outcome.success) {
      const address = backend.find((item) => item.id === id);
      if (address && body.isDefault !== undefined) {
        address.isDefault = body.isDefault;
      }
    }

    return outcome.success
      ? { success: true, data: {} }
      : { success: false, message: outcome.message };
  },
);

const getUserAddresses = vi.fn(async () => ({
  success: true,
  data: backend.map((address) => ({ ...address })),
}));

vi.mock("@/services/api", () => ({
  apiService: { address: { updateUserAddress, getUserAddresses } },
}));

const {
  restoreDefaultAddress,
  restorePendingDefaultAddress,
  savePendingDefaultSwap,
  setDefaultAddress,
  takeOverDefaultAddress,
  readPendingDefaultSwap,
} = await import("./default-address");

const address = (id: string, isDefault: boolean) =>
  ({
    id,
    isDefault,
    zipCode: "01001000",
    state: "SP",
    city: "São Paulo",
    neighborhood: "Sé",
    street: "Praça da Sé",
    number: "1",
    complement: "301",
  }) as FakeAddress;

/** Ordem em que cada endereço foi marcado/desmarcado, na sequência real. */
const calls = () =>
  updateUserAddress.mock.calls.map(
    ([id, body]) => `${id}:${body.isDefault ? "on" : "off"}`,
  );

const currentDefault = () => backend.find((item) => item.isDefault)?.id ?? null;

beforeEach(() => {
  updateUserAddress.mockClear();
  getUserAddresses.mockClear();
  patchRule = () => ({ success: true });
  backend = [address("addr-casa", true), address("addr-trabalho", false)];
  localStorage.clear();
});

describe("corpo do PATCH", () => {
  it("desmarca mandando os campos do endereço junto, e promove com o corpo mínimo", async () => {
    await takeOverDefaultAddress({
      addresses: backend.map((item) => ({ ...item })),
      addressId: "addr-trabalho",
      userId: "user-1",
    });

    const [demoteBody] = updateUserAddress.mock.calls
      .filter(([, body]) => body.isDefault === false)
      .map(([, body]) => body);
    const [promoteBody] = updateUserAddress.mock.calls
      .filter(([, body]) => body.isDefault === true)
      .map(([, body]) => body);

    // Nenhum outro ponto do app desmarca padrão com `isDefault` sozinho -
    // era a única diferença entre este código e o que já roda em produção.
    expect(demoteBody).toMatchObject({
      isDefault: false,
      street: "Praça da Sé",
      zipCode: "01001000",
      number: "1",
    });

    // Complemento de fora: no PATCH ele exige 5 caracteres quando
    // preenchido, e "301" reprovaria a troca de padrão por um motivo que
    // não tem nada a ver com padrão.
    expect(demoteBody).not.toHaveProperty("complement");

    // Marcar como padrão com o corpo mínimo é o que já funciona em
    // produção desde o PR #96 - não mexer no que está de pé.
    expect(promoteBody).toEqual({ isDefault: true });
  });
});

describe("takeOverDefaultAddress", () => {
  it("não mexe em nada quando o endereço do pedido já é o padrão", async () => {
    const swap = await takeOverDefaultAddress({
      addresses: backend.map((item) => ({ ...item })),
      addressId: "addr-casa",
      userId: "user-1",
    });

    expect(swap).toBeNull();
    expect(updateUserAddress).not.toHaveBeenCalled();
  });

  it("promove e não agenda volta quando o cliente não tinha padrão nenhum", async () => {
    backend = [address("addr-trabalho", false)];

    const swap = await takeOverDefaultAddress({
      addresses: backend.map((item) => ({ ...item })),
      addressId: "addr-trabalho",
      userId: "user-1",
    });

    // Não há preferência a proteger: o cliente sai do checkout com o padrão
    // que faltava, em vez de voltar ao estado que quebra o próximo pedido.
    expect(swap).toBeNull();
    expect(calls()).toEqual(["addr-trabalho:on"]);
    expect(readPendingDefaultSwap()).toBeNull();
  });

  it("desmarca o padrão antigo ANTES de promover o novo", async () => {
    const swap = await takeOverDefaultAddress({
      addresses: backend.map((item) => ({ ...item })),
      addressId: "addr-trabalho",
      userId: "user-1",
    });

    // A ordem importa: promover primeiro deixaria uma janela com dois
    // padrões, e aí quem escolhe o endereço da entrega é o backend.
    expect(calls()).toEqual(["addr-casa:off", "addr-trabalho:on"]);
    expect(currentDefault()).toBe("addr-trabalho");
    expect(swap).toEqual({
      previousDefaultId: "addr-casa",
      promotedId: "addr-trabalho",
      userId: "user-1",
    });
  });

  it("grava a troca antes do primeiro PATCH", async () => {
    let storedAtFirstPatch: string | null = "não gravado";

    patchRule = () => {
      if (storedAtFirstPatch === "não gravado") {
        storedAtFirstPatch = localStorage.getItem("pending-default-address");
      }
      return { success: true };
    };

    await takeOverDefaultAddress({
      addresses: backend.map((item) => ({ ...item })),
      addressId: "addr-trabalho",
      userId: "user-1",
    });

    // Se a aba fechar entre os dois PATCHes, é este registro que devolve o
    // padrão do cliente na próxima abertura.
    expect(storedAtFirstPatch).toContain("addr-casa");
  });

  it("segue em frente quando o PATCH responde erro mas a gravação valeu", async () => {
    patchRule = () => ({ success: false, persists: true, message: "ruído" });

    const swap = await takeOverDefaultAddress({
      addresses: backend.map((item) => ({ ...item })),
      addressId: "addr-trabalho",
      userId: "user-1",
    });

    // Quem decide é o estado, não o status: o endereço do pedido é o padrão,
    // então a entrega sai certa e não há por que cancelar o pedido.
    expect(swap).not.toBeNull();
    expect(currentDefault()).toBe("addr-trabalho");
  });

  it("cancela e devolve o padrão quando o PATCH responde OK mas não gravou", async () => {
    // O caso mais traiçoeiro: 200 em tudo e o padrão continua no lugar. Sem
    // conferir o estado, o pedido seria finalizado e entregue no endereço
    // errado, em silêncio.
    patchRule = () => ({ success: true, persists: false });

    await expect(
      takeOverDefaultAddress({
        addresses: backend.map((item) => ({ ...item })),
        addressId: "addr-trabalho",
        userId: "user-1",
      }),
    ).rejects.toThrow(/endereço/i);

    expect(currentDefault()).toBe("addr-casa");
  });

  it("leva a mensagem do backend para a tela", async () => {
    patchRule = (_id, body) =>
      body.isDefault
        ? { success: false, message: "já existe um endereço padrão" }
        : { success: true };

    await expect(
      takeOverDefaultAddress({
        addresses: backend.map((item) => ({ ...item })),
        addressId: "addr-trabalho",
        userId: "user-1",
      }),
    ).rejects.toThrow(/já existe um endereço padrão/);
  });

  it("devolve o padrão antigo quando a promoção não passa", async () => {
    patchRule = (id, body) =>
      body.isDefault && id === "addr-trabalho"
        ? { success: false, message: "não pode" }
        : { success: true };

    await expect(
      takeOverDefaultAddress({
        addresses: backend.map((item) => ({ ...item })),
        addressId: "addr-trabalho",
        userId: "user-1",
      }),
    ).rejects.toThrow(/não pode/);

    // Sem isso o cliente ficaria sem padrão nenhum por causa de um pedido
    // que nem chegou a ser criado.
    expect(currentDefault()).toBe("addr-casa");
    expect(readPendingDefaultSwap()).toBeNull();
  });

  it("guarda a troca para depois quando nem a volta consegue passar", async () => {
    // Backend fora do ar no meio do caminho: desmarcar funciona, marcar
    // não. O cliente fica sem padrão, e o registro tem de sobreviver para
    // a próxima abertura consertar.
    patchRule = (_id, body) =>
      body.isDefault ? { success: false } : { success: true };

    await expect(
      takeOverDefaultAddress({
        addresses: backend.map((item) => ({ ...item })),
        addressId: "addr-trabalho",
        userId: "user-1",
      }),
    ).rejects.toThrow(/endereço/i);

    expect(readPendingDefaultSwap()).toEqual({
      previousDefaultId: "addr-casa",
      promotedId: "addr-trabalho",
      userId: "user-1",
    });
  });
});

describe("restoreDefaultAddress", () => {
  const swap = {
    previousDefaultId: "addr-casa",
    promotedId: "addr-trabalho",
    userId: "user-1",
  };

  beforeEach(() => {
    backend = [address("addr-casa", false), address("addr-trabalho", true)];
  });

  it("desmarca o promovido antes de devolver o antigo, e limpa o registro", async () => {
    await expect(restoreDefaultAddress(swap)).resolves.toBe(true);

    expect(calls()).toEqual(["addr-trabalho:off", "addr-casa:on"]);
    expect(currentDefault()).toBe("addr-casa");
    expect(readPendingDefaultSwap()).toBeNull();
  });

  it("mantém o registro quando não consegue devolver o antigo", async () => {
    savePendingDefaultSwap(swap);
    patchRule = (id) => ({ success: id !== "addr-casa", persists: false });

    await expect(restoreDefaultAddress(swap)).resolves.toBe(false);

    // A próxima abertura do checkout ou do perfil tenta de novo, em vez de
    // deixar o cliente com a preferência trocada para sempre.
    expect(readPendingDefaultSwap()).toEqual(swap);
  });
});

describe("restorePendingDefaultAddress", () => {
  beforeEach(() => {
    backend = [address("addr-casa", false), address("addr-trabalho", true)];
  });

  it("desfaz a troca que ficou pela metade", async () => {
    savePendingDefaultSwap({
      previousDefaultId: "addr-casa",
      promotedId: "addr-trabalho",
      userId: "user-1",
    });

    await expect(restorePendingDefaultAddress("user-1")).resolves.toBe(true);
    expect(currentDefault()).toBe("addr-casa");
  });

  it("não restaura a troca de um cliente na sessão de outro", async () => {
    savePendingDefaultSwap({
      previousDefaultId: "addr-casa",
      promotedId: "addr-trabalho",
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
      backend.map((item) => ({ ...item })),
      "addr-trabalho",
    );

    // No perfil não há pedido em andamento: o risco a evitar é o salvamento
    // falhar no meio e deixar o cliente sem padrão nenhum.
    expect(calls()).toEqual(["addr-trabalho:on", "addr-casa:off"]);
    expect(result).toEqual({
      promoted: true,
      demotedAll: true,
      message: undefined,
    });
    expect(currentDefault()).toBe("addr-trabalho");
  });

  it("não desmarca ninguém quando a promoção falha de verdade", async () => {
    patchRule = () => ({ success: false, message: "não pode" });

    const result = await setDefaultAddress(
      backend.map((item) => ({ ...item })),
      "addr-trabalho",
    );

    expect(calls()).toEqual(["addr-trabalho:on"]);
    expect(result).toEqual({
      promoted: false,
      demotedAll: false,
      message: "não pode",
    });
    expect(currentDefault()).toBe("addr-casa");
  });

  it("aceita a promoção que gravou apesar do erro na resposta", async () => {
    patchRule = () => ({ success: false, persists: true, message: "ruído" });

    const result = await setDefaultAddress(
      backend.map((item) => ({ ...item })),
      "addr-trabalho",
    );

    expect(result.promoted).toBe(true);
    expect(currentDefault()).toBe("addr-trabalho");
  });
});
