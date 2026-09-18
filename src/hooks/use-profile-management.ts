import {
  addressTextKey,
  parseBrasilApiCoords,
  resolveAddressCoordinates,
  withCoords,
  type CoordinateSource,
  type SourcedCoords,
} from "@/lib/address-coordinates";
import { parseCoords } from "@/lib/geocode";
import { apiService } from "@/services/api";
import { useAuthStore } from "@/stores";
import { Coords } from "@/types/restaurant";
import { onlyNumbers } from "@/utils";
import { isCompanyAdminRole } from "@/utils/role-helpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useUserAddresses } from "./use-addresses";
import { useProfile } from "./use-api";
import {
  AddressFormData,
  ProfileFormData,
  useAddressForm,
  useProfileForm,
} from "./use-form-validation";
import { useToggle } from "./use-toggle";

interface Address extends AddressFormData {
  id: string;
  type?: string;
}

/**
 * Hook para gerenciar perfil do usuário (cliente)
 * Inclui: dados pessoais, foto, endereços
 */
export const useProfileManagement = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, updateUser, _hasHydrated } = useAuthStore();
  const { updateProfile } = useProfile();

  const [isMounted, setIsMounted] = useState(false);

  // Address state - useUserAddresses já é cacheado (staleTime 5min) e
  // compartilhado com checkout/company-profile, então editar um endereço
  // aqui reflete lá sem precisar de F5, e vice-versa.
  const { data: rawAddresses = [], isLoading: isLoadingAddresses } =
    useUserAddresses();
  const addresses = useMemo<Address[]>(
    () =>
      rawAddresses.map((addr) => ({
        id: addr.id,
        type: "Endereço",
        street: addr.street || "",
        number: String(addr.number ?? ""),
        complement: addr.complement || "",
        neighborhood: addr.neighborhood || "",
        longitude: addr.longitude ?? undefined,
        latitude: addr.latitude ?? undefined,
        city: addr.city || "",
        state: addr.state || "",
        zipCode: addr.zipCode || "",
        isDefault: addr.isDefault ?? false,
      })),
    [rawAddresses],
  );
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editingAddressOriginalComplement, setEditingAddressOriginalComplement] =
    useState<string>("");

  // CEP state
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [lastFetchedCep, setLastFetchedCep] = useState<string | null>(null);

  // Coordenada do endereço + de onde ela veio. Este formulário nunca gravou
  // coordenada nenhuma: agora vem do CEP, da geocodificação do endereço
  // digitado ou do clique no mapa, nessa ordem de prioridade.
  const [addressCoords, setAddressCoords] = useState<SourcedCoords | null>(
    null,
  );

  // Endereço como estava ao abrir a edição. Enquanto o texto não muda, a
  // coordenada já salva continua valendo (o cliente pode ter ajustado o pino
  // no mapa antes); assim que muda, ela é descartada e recalculada.
  const [editingAddressTextKey, setEditingAddressTextKey] = useState<
    string | null
  >(null);

  // Form management with validation
  const profileForm = useProfileForm({
    name: user?.name || "",
    email: user?.email || "",
    cpf: user?.cpf || "",
    phone: user?.phone || "",
    birthDate: user?.birthDate || "",
  });
  const addressForm = useAddressForm();

  // UI state management with custom hooks
  const editingState = useToggle();
  const addingAddressState = useToggle();

  // Watch CEP field changes
  const watchedZipCode = addressForm.watch("zipCode");

  const watchedAddress = addressForm.watch([
    "zipCode",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
  ]);
  const [
    watchedCep,
    watchedStreet,
    watchedNumber,
    watchedNeighborhood,
    watchedCity,
    watchedState,
  ] = watchedAddress;

  const watchedAddressTextKey = addressTextKey({
    zipCode: watchedCep,
    street: watchedStreet,
    number: watchedNumber,
    neighborhood: watchedNeighborhood,
    city: watchedCity,
    state: watchedState,
  });

  /**
   * Prevent SSR issues
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Redireciona quem não devia estar nessa tela. Espera o Zustand persist
   * hidratar - antes disso isAuthenticated começa em `false` mesmo pra quem
   * tá logado, e esse redirect rodava cedo demais a cada F5 (correndo em
   * paralelo com o efeito equivalente do ProfileWrapper).
   */
  useEffect(() => {
    if (!isMounted || !_hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/?auth=required");
      return;
    }

    // Só quem edita o cadastro da empresa é levado pra lá; staff como
    // financial e manager usa /profile mesmo.
    if (isCompanyAdminRole(user?.role)) {
      router.push("/company-profile");
    }
  }, [isMounted, _hasHydrated, isAuthenticated, user?.role, router]);

  /**
   * Dados da conta autenticada (GET /user/me), cacheados - antes era um
   * useEffect cru que refazia essa chamada toda vez que /profile montava,
   * mesmo revisitando a tela poucos segundos depois.
   */
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileQueryError,
  } = useQuery({
    queryKey: ["profile", "me", user?.id],
    queryFn: async () => {
      const response = await apiService.getMe();
      if (!response.success || !response.data) {
        throw new Error(response.message || "Erro ao carregar perfil");
      }
      return response.data;
    },
    enabled:
      isMounted &&
      _hasHydrated &&
      isAuthenticated &&
      !isCompanyAdminRole(user?.role),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const profileError = profileQueryError
    ? (profileQueryError as Error).message
    : null;

  useEffect(() => {
    if (profileData) updateUser(profileData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

  /**
   * Auto-fetch CEP when complete (8 digits)
   */
  useEffect(() => {
    if (watchedZipCode) {
      const cleanCep = onlyNumbers(watchedZipCode);
      if (cleanCep.length === 8 && cleanCep !== lastFetchedCep) {
        fetchCepData(watchedZipCode);
        setLastFetchedCep(cleanCep);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedZipCode]);

  /**
   * O endereço mudou desde que a edição abriu, então a coordenada que estava
   * salva aponta para outro lugar - descarta para o save geocodificar de novo.
   */
  useEffect(() => {
    if (!editingAddressTextKey) return;
    if (watchedAddressTextKey === editingAddressTextKey) return;

    setEditingAddressTextKey(null);
    setAddressCoords((coords) =>
      coords?.source === "stored" ? null : coords,
    );
  }, [watchedAddressTextKey, editingAddressTextKey]);

  /**
   * Registra uma coordenada respeitando a prioridade das fontes
   * (clique no mapa > geocodificação > CEP).
   */
  const applyCoords = (coords: Coords | null, source: CoordinateSource) => {
    setAddressCoords((current) => withCoords(current, coords, source));
  };

  /**
   * Buscar CEP na BrasilAPI
   */
  const fetchCepData = async (cep: string) => {
    const cleanCep = onlyNumbers(cep);
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cep/v2/${cleanCep}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("CEP não encontrado");
        } else {
          toast.error("Erro ao buscar CEP");
        }
        return;
      }

      const data = await response.json();
      addressForm.setValue("street", data.street || "");
      addressForm.setValue("neighborhood", data.neighborhood || "");
      addressForm.setValue("city", data.city || "");
      addressForm.setValue("state", data.state || "");

      // A BrasilAPI já devolve a coordenada do logradouro - usa como ponto de
      // partida e centra o mapa nela. É a fonte de menor prioridade: cede
      // para a geocodificação do endereço completo e para o clique no mapa.
      applyCoords(parseBrasilApiCoords(data), "cep");

      toast.success("CEP encontrado! Campos preenchidos automaticamente");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP. Verifique sua conexão.");
    } finally {
      setIsLoadingCep(false);
    }
  };

  /**
   * Formatar CEP com máscara
   */
  const formatCep = (value: string) => {
    const cleanValue = onlyNumbers(value);
    if (cleanValue.length <= 5) {
      return cleanValue;
    }
    return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5, 8)}`;
  };

  /**
   * Salvar alterações do perfil
   */
  const handleSaveProfile = async (data: ProfileFormData) => {
    if (!user?.id) return;

    try {
      await updateProfile.mutateAsync({ id: user.id, ...data });
      updateUser({ ...user, ...data });
      editingState.close();
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar perfil");
    }
  };

  /**
   * Cancelar edição do perfil
   */
  const handleCancelEdit = () => {
    profileForm.reset();
    editingState.close();
  };

  /**
   * Atualizar foto do perfil
   */
  const handleUpdatePhoto = (url: string) => {
    if (!user) return;
    updateUser({ ...user, photoUrl: url });
  };

  /**
   * Abrir modal para editar endereço
   */
  const handleEditAddress = (address: Address) => {
    addressForm.reset({
      street: address.street || "",
      number: String(address.number ?? ""),
      neighborhood: address.neighborhood || "",
      city: address.city || "",
      state: address.state || "",
      zipCode: address.zipCode || "",
      type: address.type,
      complement: address.complement || "",
      longitude: address.longitude,
      latitude: address.latitude,
      isDefault: address.isDefault ?? false,
    });

    const storedCoords = parseCoords(address.latitude, address.longitude);

    setAddressCoords(
      storedCoords ? { coords: storedCoords, source: "stored" } : null,
    );
    setEditingAddressTextKey(storedCoords ? addressTextKey(address) : null);
    setEditingAddressId(address.id);
    setEditingAddressOriginalComplement(address.complement || "");
    setLastFetchedCep(onlyNumbers(address.zipCode));
    addingAddressState.open();
  };

  /**
   * Salvar endereço (cria ou atualiza)
   */
  const handleAddAddress = async (data: AddressFormData) => {
    // No PATCH (diferente do POST), complement exige mínimo de 5 caracteres
    // quando preenchido (ver adress.md). Endereços antigos criados via POST
    // podem ter complemento curto (ex: "301") - só bloqueamos se o usuário
    // de fato digitou um valor novo inválido; se não mexeu no campo, o
    // complemento herdado é omitido do PATCH para não travar o resto do form.
    const trimmedComplement = data.complement?.trim() ?? "";
    const complementUnchanged =
      trimmedComplement === editingAddressOriginalComplement.trim();

    if (
      editingAddressId &&
      trimmedComplement.length > 0 &&
      trimmedComplement.length < 5 &&
      !complementUnchanged
    ) {
      toast.error("Complemento deve ter pelo menos 5 caracteres (ou ficar vazio)");
      return;
    }

    const shouldOmitComplement =
      editingAddressId &&
      complementUnchanged &&
      trimmedComplement.length > 0 &&
      trimmedComplement.length < 5;

    setIsSavingAddress(true);
    try {
      // Sem gesto explícito do cliente (clique no mapa) nem coordenada salva
      // ainda válida, geocodifica o endereço digitado - é o que a loja já faz
      // em use-company-profile-management. Sem isso este formulário gravava o
      // endereço sem coordenada nenhuma, e o cliente sumia das buscas por
      // proximidade.
      const resolvedCoords = await resolveAddressCoordinates(
        data,
        addressCoords,
      );

      if (resolvedCoords) setAddressCoords(resolvedCoords);

      const payload = {
        street: data.street,
        number: data.number,
        complement: shouldOmitComplement ? undefined : data.complement || undefined,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        longitude: resolvedCoords?.coords.lng,
        latitude: resolvedCoords?.coords.lat,
        zipCode: onlyNumbers(data.zipCode),
        isDefault: data.isDefault ?? false,
      };

      // Se for marcado como padrão, desmarca os outros
      let failedToUnsetDefault = false;
      if (payload.isDefault) {
        const currentAddresses = await apiService.address.getUserAddresses();
        if (currentAddresses.success && currentAddresses.data) {
          const backendAddresses = Array.isArray(currentAddresses.data)
            ? currentAddresses.data
            : [];

          const backendDefaults = backendAddresses.filter(
            (addr) => addr.isDefault,
          );

          for (const addr of backendDefaults) {
            if (editingAddressId && addr.id === editingAddressId) continue;

            try {
              const unsetResponse = await apiService.address.updateUserAddress(
                addr.id,
                {
                  isDefault: false,
                  latitude: addr.latitude ?? undefined,
                  longitude: addr.longitude ?? undefined,
                },
              );
              if (!unsetResponse.success) failedToUnsetDefault = true;
            } catch (error) {
              console.error("Erro ao desmarcar endereço padrão:", error);
              failedToUnsetDefault = true;
            }
          }
        }
      }

      let response;

      if (editingAddressId) {
        // UPDATE
        response = await apiService.address.updateUserAddress(
          editingAddressId,
          payload,
        );
      } else {
        // CREATE
        response = await apiService.address.createUserAddress(payload);
      }

      if (response.success) {
        queryClient.invalidateQueries({
          queryKey: ["addresses", "user", user?.id],
        });
        addressForm.reset();
        setEditingAddressId(null);
        setEditingAddressOriginalComplement("");
        addingAddressState.close();
        setLastFetchedCep(null);
        setAddressCoords(null);
        setEditingAddressTextKey(null);

        toast.success(
          editingAddressId
            ? "Endereço atualizado com sucesso!"
            : "Endereço adicionado com sucesso!",
        );

        if (failedToUnsetDefault) {
          toast.warning(
            "Não conseguimos desmarcar todos os endereços padrão antigos. Confira sua lista de endereços.",
          );
        }
      } else {
        toast.error(
          response.message ||
            (editingAddressId
              ? "Erro ao atualizar endereço"
              : "Erro ao adicionar endereço"),
        );
      }
    } catch (error) {
      toast.error(
        editingAddressId
          ? "Erro ao atualizar endereço"
          : "Erro ao adicionar endereço",
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  /**
   * Fechar modal de endereço
   */
  const handleCloseAddressModal = () => {
    addressForm.reset();
    setLastFetchedCep(null);
    setEditingAddressId(null);
    setEditingAddressOriginalComplement("");
    setAddressCoords(null);
    setEditingAddressTextKey(null);
    addingAddressState.close();
  };

  /**
   * Deletar endereço
   */
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Tem certeza que deseja excluir este endereço?")) return;

    try {
      const response = await apiService.address.deleteUserAddress(addressId);
      if (response.success) {
        queryClient.invalidateQueries({
          queryKey: ["addresses", "user", user?.id],
        });
        toast.success("Endereço excluído com sucesso!");
      } else {
        toast.error(response.message || "Erro ao excluir endereço");
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Erro ao excluir endereço");
    }
  };

  return {
    // Auth & Loading
    user,
    isMounted,
    isAuthenticated,
    hasHydrated: _hasHydrated,
    isLoadingProfile,
    profileError,
    // Profile
    profileForm,
    editingState,
    updateProfile,
    handleSaveProfile,
    handleCancelEdit,
    handleUpdatePhoto,
    // Addresses
    addresses,
    isLoadingAddresses,
    addressForm,
    addingAddressState,
    isSavingAddress,
    handleAddAddress,
    handleCloseAddressModal,
    handleDeleteAddress,
    handleEditAddress,
    editingAddressId,
    addressCoords,
    applyCoords,
    // CEP
    isLoadingCep,
    formatCep,
    watchedZipCode,
  };
};
