import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { resolveAddressCoordinates } from "@/lib/address-coordinates";
import {
  restorePendingDefaultAddress,
  setDefaultAddress,
} from "@/lib/default-address";
import { apiService, type Address } from "@/services/api";
import { useAuthStore } from "@/stores";
import type { AddressFormData } from "./use-form-validation";
import { useProfileManagement } from "./use-profile-management";

const { router } = vi.hoisted(() => ({ router: { push: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/lib/address-coordinates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/address-coordinates")>();
  return { ...actual, resolveAddressCoordinates: vi.fn() };
});

vi.mock("@/lib/default-address", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/default-address")>();
  return {
    ...actual,
    setDefaultAddress: vi.fn(),
    restorePendingDefaultAddress: vi.fn(),
  };
});

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiService: {
      getMe: vi.fn(),
      updateUser: vi.fn(),
      address: {
        getUserAddresses: vi.fn(),
        createUserAddress: vi.fn(),
        updateUserAddress: vi.fn(),
        deleteUserAddress: vi.fn(),
      },
    },
  };
});

const api = vi.mocked(apiService, true);

const user = {
  id: "user-1",
  name: "Ana",
  email: "ana@example.com",
  cpf: "12345678900",
  phone: "41999990000",
  birthDate: "1990-01-01",
  role: "client",
};

const stored = (id: string, extra: Partial<Address> = {}) =>
  ({
    id,
    street: "Rua A",
    number: "10",
    complement: "",
    neighborhood: "Centro",
    city: "Curitiba",
    state: "PR",
    zipCode: "80000000",
    isDefault: false,
    ...extra,
  }) as Address;

const formData = (extra: Partial<AddressFormData> = {}): AddressFormData => ({
  street: "Rua Nova",
  number: "200",
  complement: "",
  neighborhood: "Batel",
  city: "Curitiba",
  state: "PR",
  zipCode: "80420-000",
  isDefault: false,
  ...extra,
});

const geocoded = { coords: { lat: -25.44, lng: -49.29 }, source: "geocode" as const };

const initialAuthState = useAuthStore.getState();
let queryClient: QueryClient;
let savedAddresses: Address[] = [];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function renderProfile() {
  const hook = renderHook(() => useProfileManagement(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoadingAddresses).toBe(false));
  return hook;
}

describe("useProfileManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedAddresses = [];
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState(
      { ...initialAuthState, isAuthenticated: true, _hasHydrated: true, user },
      true,
    );
    api.getMe.mockResolvedValue({ success: true, data: user as never });
    api.address.getUserAddresses.mockImplementation(async () => ({
      success: true,
      data: savedAddresses,
    }));
    vi.mocked(resolveAddressCoordinates).mockResolvedValue(geocoded);
    vi.mocked(restorePendingDefaultAddress).mockResolvedValue(false);
    vi.mocked(setDefaultAddress).mockResolvedValue({ promoted: true, demotedAll: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  describe("acesso à tela", () => {
    it("sem login, depois de hidratar, manda para a home pedindo login", async () => {
      useAuthStore.setState({ ...initialAuthState, _hasHydrated: true }, true);

      renderHook(() => useProfileManagement(), { wrapper });

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/?auth=required"));
    });

    it("antes de hidratar, não redireciona", async () => {
      useAuthStore.setState({ ...initialAuthState, _hasHydrated: false }, true);

      const { result } = renderHook(() => useProfileManagement(), { wrapper });

      await waitFor(() => expect(result.current.isMounted).toBe(true));
      expect(router.push).not.toHaveBeenCalled();
    });

    it("admin da empresa vai para o perfil da empresa, sem buscar /user/me", async () => {
      useAuthStore.setState(
        { ...initialAuthState, isAuthenticated: true, _hasHydrated: true, user: { ...user, role: "owner" } },
        true,
      );

      renderHook(() => useProfileManagement(), { wrapper });

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/company-profile"));
      expect(api.getMe).not.toHaveBeenCalled();
    });

    it("cliente fica e carrega /user/me no store", async () => {
      api.getMe.mockResolvedValue({ success: true, data: { ...user, name: "Ana Maria" } as never });

      await renderProfile();

      await waitFor(() => expect(useAuthStore.getState().user?.name).toBe("Ana Maria"));
      expect(router.push).not.toHaveBeenCalled();
    });

    it("falha no /user/me vira profileError", async () => {
      api.getMe.mockResolvedValue({ success: false, message: "Sessão expirada" });

      const { result } = await renderProfile();

      await waitFor(() => expect(result.current.profileError).toBe("Sessão expirada"));
    });
  });

  describe("perfil", () => {
    it("salvar manda os dados com o id, atualiza o store e fecha a edição", async () => {
      api.updateUser.mockResolvedValue({ success: true, data: user as never });
      const { result } = await renderProfile();
      act(() => result.current.editingState.open());

      const data = { name: "Ana Paula", email: user.email, cpf: user.cpf, phone: "41988887777", birthDate: user.birthDate };
      await act(async () => {
        await result.current.handleSaveProfile(data);
      });

      expect(api.updateUser).toHaveBeenCalledWith({ id: "user-1", ...data });
      expect(useAuthStore.getState().user).toMatchObject({ name: "Ana Paula", phone: "41988887777" });
      expect(result.current.editingState.isOpen).toBe(false);
      expect(toast.success).toHaveBeenCalledWith("Perfil atualizado com sucesso!");
    });

    it("recusa do backend não salva no store e mostra a razão", async () => {
      api.updateUser.mockResolvedValue({ success: false, message: "E-mail já cadastrado" });
      const { result } = await renderProfile();
      act(() => result.current.editingState.open());

      await act(async () => {
        await result.current.handleSaveProfile({ ...user, email: "outro@example.com" });
      });

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("E-mail já cadastrado");
      expect(useAuthStore.getState().user?.email).toBe("ana@example.com");
      expect(result.current.editingState.isOpen).toBe(true);
      await waitFor(() => expect(result.current.updateProfile.isError).toBe(true));
    });

    it("exceção ao salvar avisa erro e mantém a edição aberta", async () => {
      api.updateUser.mockRejectedValue(new Error("offline"));
      const { result } = await renderProfile();
      act(() => result.current.editingState.open());

      await act(async () => {
        await result.current.handleSaveProfile({ ...user });
      });

      expect(toast.error).toHaveBeenCalledWith("offline");
      expect(result.current.editingState.isOpen).toBe(true);
    });

    it("trocar a foto atualiza só a foto no store", async () => {
      const { result } = await renderProfile();

      act(() => result.current.handleUpdatePhoto("https://r2.test/foto.jpg"));

      expect(useAuthStore.getState().user).toMatchObject({
        name: "Ana",
        photoUrl: "https://r2.test/foto.jpg",
      });
    });
  });

  describe("salvar endereço", () => {
    it("novo endereço sai com todos os campos, CEP só com dígitos e a coordenada geocodificada", async () => {
      api.address.createUserAddress.mockResolvedValue({ success: true, data: stored("novo") });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleAddAddress(formData({ complement: "Casa 2" }));
      });

      expect(api.address.createUserAddress).toHaveBeenCalledWith({
        street: "Rua Nova",
        number: "200",
        complement: "Casa 2",
        neighborhood: "Batel",
        city: "Curitiba",
        state: "PR",
        zipCode: "80420000",
        latitude: -25.44,
        longitude: -49.29,
        isDefault: false,
      });
      expect(toast.success).toHaveBeenCalledWith("Endereço adicionado com sucesso!");
      expect(setDefaultAddress).not.toHaveBeenCalled();
    });

    it("complemento vazio sai como undefined", async () => {
      api.address.createUserAddress.mockResolvedValue({ success: true, data: stored("novo") });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleAddAddress(formData({ complement: "" }));
      });

      expect(api.address.createUserAddress.mock.calls[0][0].complement).toBeUndefined();
    });

    it("sem coordenada resolvida, salva sem latitude e longitude", async () => {
      vi.mocked(resolveAddressCoordinates).mockResolvedValue(null);
      api.address.createUserAddress.mockResolvedValue({ success: true, data: stored("novo") });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleAddAddress(formData());
      });

      const payload = api.address.createUserAddress.mock.calls[0][0];
      expect(payload.latitude).toBeUndefined();
      expect(payload.longitude).toBeUndefined();
    });

    it("novo endereço marcado como padrão promove o id que o backend devolveu", async () => {
      savedAddresses = [stored("antigo", { isDefault: true }), stored("novo")];
      api.address.createUserAddress.mockResolvedValue({ success: true, data: stored("novo") });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleAddAddress(formData({ isDefault: true }));
      });

      expect(api.address.createUserAddress.mock.calls[0][0].isDefault).toBe(true);
      expect(setDefaultAddress).toHaveBeenCalledWith(savedAddresses, "novo");
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("se não conseguir desmarcar o padrão antigo, salva e avisa", async () => {
      vi.mocked(setDefaultAddress).mockResolvedValue({ promoted: true, demotedAll: false });
      api.address.createUserAddress.mockResolvedValue({ success: true, data: stored("novo") });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleAddAddress(formData({ isDefault: true }));
      });

      expect(toast.success).toHaveBeenCalledWith("Endereço adicionado com sucesso!");
      expect(toast.warning).toHaveBeenCalledWith(
        "Não conseguimos desmarcar todos os endereços padrão antigos. Confira sua lista de endereços.",
      );
    });

    it("salvamento recusado não mexe no padrão e mantém o formulário aberto", async () => {
      api.address.createUserAddress.mockResolvedValue({ success: false, message: "CEP inválido" });
      const { result } = await renderProfile();
      act(() => result.current.addingAddressState.open());

      await act(async () => {
        await result.current.handleAddAddress(formData({ isDefault: true }));
      });

      expect(setDefaultAddress).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("CEP inválido");
      expect(result.current.addingAddressState.isOpen).toBe(true);
      expect(result.current.isSavingAddress).toBe(false);
    });

    it("sucesso fecha o formulário e recarrega a lista", async () => {
      api.address.createUserAddress.mockResolvedValue({ success: true, data: stored("novo") });
      const { result } = await renderProfile();
      act(() => result.current.addingAddressState.open());
      const calls = api.address.getUserAddresses.mock.calls.length;

      await act(async () => {
        await result.current.handleAddAddress(formData());
      });

      expect(result.current.addingAddressState.isOpen).toBe(false);
      await waitFor(() =>
        expect(api.address.getUserAddresses.mock.calls.length).toBeGreaterThan(calls),
      );
    });

    it("exceção ao salvar avisa erro genérico", async () => {
      api.address.createUserAddress.mockRejectedValue(new Error("offline"));
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleAddAddress(formData());
      });

      expect(toast.error).toHaveBeenCalledWith("Erro ao adicionar endereço");
      expect(result.current.isSavingAddress).toBe(false);
    });
  });

  describe("editar endereço", () => {
    async function editing(address: Address) {
      savedAddresses = [address];
      const hook = await renderProfile();
      await waitFor(() => expect(hook.result.current.addresses).toHaveLength(1));
      act(() => hook.result.current.handleEditAddress(hook.result.current.addresses[0]));
      return hook;
    }

    it("abre o formulário preenchido e salva por PATCH no mesmo id", async () => {
      api.address.updateUserAddress.mockResolvedValue({ success: true });
      const { result } = await editing(stored("a1", { complement: "Bloco B" }));

      expect(result.current.addingAddressState.isOpen).toBe(true);
      expect(result.current.editingAddressId).toBe("a1");
      expect(result.current.addressForm.getValues()).toMatchObject({
        street: "Rua A",
        complement: "Bloco B",
        zipCode: "80000000",
      });

      await act(async () => {
        await result.current.handleAddAddress(formData({ complement: "Bloco B" }));
      });

      expect(api.address.updateUserAddress).toHaveBeenCalledWith(
        "a1",
        expect.objectContaining({ complement: "Bloco B", street: "Rua Nova" }),
      );
      expect(api.address.createUserAddress).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Endereço atualizado com sucesso!");
    });

    it("complemento novo com menos de 5 caracteres é barrado antes do PATCH", async () => {
      const { result } = await editing(stored("a1", { complement: "" }));

      await act(async () => {
        await result.current.handleAddAddress(formData({ complement: "301" }));
      });

      expect(api.address.updateUserAddress).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Complemento deve ter pelo menos 5 caracteres (ou ficar vazio)",
      );
    });

    it("complemento curto herdado e intocado é omitido do PATCH", async () => {
      api.address.updateUserAddress.mockResolvedValue({ success: true });
      const { result } = await editing(stored("a1", { complement: "301" }));

      await act(async () => {
        await result.current.handleAddAddress(formData({ complement: "301" }));
      });

      expect(api.address.updateUserAddress).toHaveBeenCalled();
      expect(api.address.updateUserAddress.mock.calls[0][1].complement).toBeUndefined();
    });

    it("endereço editado como padrão promove o próprio id", async () => {
      api.address.updateUserAddress.mockResolvedValue({ success: true });
      const { result } = await editing(stored("a1"));

      await act(async () => {
        await result.current.handleAddAddress(formData({ isDefault: true }));
      });

      expect(setDefaultAddress).toHaveBeenCalledWith(expect.any(Array), "a1");
    });

    it("coordenada salva vale enquanto o texto do endereço não muda", async () => {
      const { result } = await editing(stored("a1", { latitude: -25.1, longitude: -49.1 }));

      expect(result.current.addressCoords).toEqual({
        coords: { lat: -25.1, lng: -49.1 },
        source: "stored",
      });

      act(() => result.current.addressForm.setValue("street", "Rua Trocada"));

      await waitFor(() => expect(result.current.addressCoords).toBeNull());
    });

    it("PATCH recusado não promove o endereço a padrão", async () => {
      api.address.updateUserAddress.mockResolvedValue({ success: false, message: "complement too short" });
      const { result } = await editing(stored("a1"));

      await act(async () => {
        await result.current.handleAddAddress(formData({ isDefault: true }));
      });

      // Promover e depois falhar deixava o cliente sem padrão nenhum.
      expect(setDefaultAddress).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("complement too short");
    });

    it("erro no PATCH usa a mensagem de atualização", async () => {
      api.address.updateUserAddress.mockResolvedValue({ success: false });
      const { result } = await editing(stored("a1"));

      await act(async () => {
        await result.current.handleAddAddress(formData());
      });

      expect(toast.error).toHaveBeenCalledWith("Erro ao atualizar endereço");
    });

    it("fechar o modal limpa o estado de edição", async () => {
      const { result } = await editing(stored("a1", { latitude: -25.1, longitude: -49.1 }));

      act(() => result.current.handleCloseAddressModal());

      expect(result.current.editingAddressId).toBeNull();
      expect(result.current.addressCoords).toBeNull();
      expect(result.current.addingAddressState.isOpen).toBe(false);
    });
  });

  describe("padrão direto da lista", () => {
    it("sucesso avisa e recarrega a lista", async () => {
      savedAddresses = [stored("a1"), stored("a2", { isDefault: true })];
      const { result } = await renderProfile();
      await waitFor(() => expect(result.current.addresses).toHaveLength(2));

      await act(async () => {
        await result.current.handleSetDefaultAddress("a1");
      });

      expect(setDefaultAddress).toHaveBeenCalledWith(savedAddresses, "a1");
      expect(toast.success).toHaveBeenCalledWith("Endereço padrão atualizado!");
      expect(result.current.settingDefaultAddressId).toBeNull();
    });

    it("recusa mostra a razão do backend", async () => {
      vi.mocked(setDefaultAddress).mockResolvedValue({
        promoted: false,
        demotedAll: false,
        message: "latitude must be a number",
      });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleSetDefaultAddress("a1");
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Não foi possível definir este endereço como padrão: latitude must be a number",
      );
    });

    it("promovido sem desmarcar o anterior avisa os dois padrões", async () => {
      vi.mocked(setDefaultAddress).mockResolvedValue({ promoted: true, demotedAll: false });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleSetDefaultAddress("a1");
      });

      expect(toast.warning).toHaveBeenCalledWith(
        "Endereço marcado como padrão, mas não conseguimos desmarcar o anterior. Confira sua lista de endereços.",
      );
    });

    it("marca qual endereço está sendo promovido enquanto espera", async () => {
      vi.mocked(setDefaultAddress).mockReturnValue(new Promise(() => {}));
      const { result } = await renderProfile();

      act(() => {
        void result.current.handleSetDefaultAddress("a1");
      });

      expect(result.current.settingDefaultAddressId).toBe("a1");
    });
  });

  describe("excluir endereço", () => {
    it("sem confirmação, não chama a API", async () => {
      vi.stubGlobal("confirm", vi.fn(() => false));
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleDeleteAddress("a1");
      });

      expect(api.address.deleteUserAddress).not.toHaveBeenCalled();
    });

    it("confirmado, exclui e avisa", async () => {
      api.address.deleteUserAddress.mockResolvedValue({ success: true });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleDeleteAddress("a1");
      });

      expect(api.address.deleteUserAddress).toHaveBeenCalledWith("a1");
      expect(toast.success).toHaveBeenCalledWith("Endereço excluído com sucesso!");
    });

    it("recusa mostra a mensagem do backend", async () => {
      api.address.deleteUserAddress.mockResolvedValue({ success: false, message: "Endereço em uso" });
      const { result } = await renderProfile();

      await act(async () => {
        await result.current.handleDeleteAddress("a1");
      });

      expect(toast.error).toHaveBeenCalledWith("Endereço em uso");
    });
  });

  describe("CEP", () => {
    it("CEP completo busca na BrasilAPI e preenche o endereço", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          street: "Rua XV de Novembro",
          neighborhood: "Centro",
          city: "Curitiba",
          state: "PR",
          location: { coordinates: { latitude: "-25.43", longitude: "-49.27" } },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const { result } = await renderProfile();

      act(() => result.current.addressForm.setValue("zipCode", "80020-310"));

      await waitFor(() =>
        expect(result.current.addressForm.getValues("street")).toBe("Rua XV de Novembro"),
      );
      expect(fetchMock).toHaveBeenCalledWith("https://brasilapi.com.br/api/cep/v2/80020310");
      expect(result.current.addressForm.getValues()).toMatchObject({
        neighborhood: "Centro",
        city: "Curitiba",
        state: "PR",
      });
      expect(result.current.addressCoords).toEqual({
        coords: { lat: -25.43, lng: -49.27 },
        source: "cep",
      });
      expect(result.current.isLoadingCep).toBe(false);
    });

    it("CEP inexistente avisa sem preencher", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
      const { result } = await renderProfile();

      act(() => result.current.addressForm.setValue("zipCode", "99999999"));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("CEP não encontrado"));
      expect(result.current.addressForm.getValues("street")).toBeUndefined();
    });

    it("CEP incompleto não busca", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const { result } = await renderProfile();

      act(() => result.current.addressForm.setValue("zipCode", "8002"));

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("formatCep aplica a máscara 00000-000", async () => {
      const { result } = await renderProfile();

      expect(result.current.formatCep("80020310")).toBe("80020-310");
      expect(result.current.formatCep("800")).toBe("800");
      expect(result.current.formatCep("80020-3109999")).toBe("80020-310");
    });
  });

  it("desfaz a troca de padrão interrompida do checkout ao abrir a tela", async () => {
    // O restore faz PATCHs de verdade: termina depois da primeira leitura da lista.
    vi.mocked(restorePendingDefaultAddress).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 20)),
    );
    await renderProfile();

    expect(restorePendingDefaultAddress).toHaveBeenCalledWith("user-1");
    await waitFor(() => expect(api.address.getUserAddresses).toHaveBeenCalledTimes(2));
  });
});
