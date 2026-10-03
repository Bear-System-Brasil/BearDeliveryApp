import {
  parseBrasilApiCoords,
  withCoords,
  type CoordinateSource,
  type SourcedCoords,
} from "@/lib/address-coordinates";
import { parseCoords } from "@/lib/geocode";
import { apiService } from "@/services/api";
import {
  restorePendingDefaultAddress,
  setDefaultAddress,
} from "@/lib/default-address";
import { useAuthStore } from "@/stores";
import { Coords } from "@/types/restaurant";
import { getErrorMessage, onlyNumbers } from "@/utils";
import { isCompanyAdminRole } from "@/utils/role-helpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAddressFields } from "./use-address-fields";
import { useAddressPin, type PinSource } from "./use-address-pin";
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

  // Posição do pino + de onde ela veio. É exatamente o que vai para o
  // backend ao salvar (LDMF-261): sem pino, não salva.
  const [addressCoords, setAddressCoords] = useState<SourcedCoords | null>(
    null,
  );

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
    ,
    watchedStreet,
    watchedNumber,
    watchedNeighborhood,
    watchedCity,
    watchedState,
  ] = watchedAddress;

  // Bairro, rua e número movem o pino na frente do cliente - o salvar não
  // geocodifica nada escondido.
  const addressPin = useAddressPin({
    fields: {
      state: watchedState,
      city: watchedCity,
      neighborhood: watchedNeighborhood,
      street: watchedStreet,
      number: watchedNumber,
    },
    onPin: (coords: Coords, source: PinSource) =>
      setAddressCoords({ coords, source }),
  });

  // Ordem e trava dos campos; trocar estado, cidade ou bairro limpa os
  // seguintes e o pino.
  const addressFields = useAddressFields({
    form: addressForm,
    enabled: addingAddressState.isOpen,
    onPreviousFieldChange: () => {
      setAddressCoords(null);
      addressPin.resetBaseline();
    },
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
   * O useForm guarda os defaultValues do primeiro render. No F5 esse render
   * acontece antes do persist hidratar o usuário, e o formulário ficava vazio
   * até sair e voltar da tela. Reidrata sempre que os dados do usuário mudam,
   * menos durante a edição, para não apagar o que está sendo digitado.
   */
  useEffect(() => {
    if (!user || editingState.isOpen) return;

    profileForm.reset({
      name: user.name || "",
      email: user.email || "",
      cpf: user.cpf || "",
      phone: user.phone || "",
      birthDate: user.birthDate || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.name,
    user?.email,
    user?.cpf,
    user?.phone,
    user?.birthDate,
    editingState.isOpen,
  ]);

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
   * O checkout promove o endereço do pedido a padrão durante a finalização e
   * devolve o anterior logo depois (ver src/lib/default-address.ts). Se
   * aquele pedido foi interrompido no meio, a troca ficou de pé - e é nesta
   * tela que o cliente veria o padrão errado. Desfaz aqui também.
   */
  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    restorePendingDefaultAddress(user.id).then((restored) => {
      if (restored && active) {
        queryClient.invalidateQueries({
          queryKey: ["addresses", "user", user.id],
        });
      }
    });

    return () => {
      active = false;
    };
  }, [user?.id, queryClient]);

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
      // CEP preenche estado e cidade. Se a cidade mudou, os campos seguintes
      // e o pino são limpos como em qualquer troca de campo anterior.
      if (data.state) addressFields.changeState(data.state);
      if (data.city) addressFields.changeCity(data.city);
      // CEP de rua (não o de cidade inteira) também traz bairro e rua.
      if (data.neighborhood) addressForm.setValue("neighborhood", data.neighborhood);
      if (data.street) addressForm.setValue("street", data.street);

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
      toast.error(getErrorMessage(error, "Erro ao atualizar perfil"));
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
    // O pino abre na coordenada salva: só mudança de bairro, rua ou número
    // dispara nova posição. Mudar o complemento mantém.
    addressPin.resetBaseline({
      state: address.state,
      city: address.city,
      neighborhood: address.neighborhood,
      street: address.street,
      number: String(address.number ?? ""),
    });
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

    // Salvar = confirmar o pino. Endereço sem coordenada some das buscas por
    // proximidade, então sem pino não sai nada.
    if (!addressCoords) {
      toast.error("Marque no mapa onde fica o endereço antes de salvar.");
      return;
    }

    const pinCoords = addressCoords.coords;

    setIsSavingAddress(true);
    try {
      const payload = {
        street: data.street,
        number: data.number,
        complement: shouldOmitComplement ? undefined : data.complement || undefined,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        longitude: pinCoords.lng,
        latitude: pinCoords.lat,
        zipCode: onlyNumbers(data.zipCode),
        isDefault: data.isDefault ?? false,
      };

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

      // O backend não desmarca o padrão anterior sozinho (ver adress.md).
      // Isto rodava ANTES do salvamento: quando o PATCH do endereço falhava
      // - e ele falha por regras que nada têm a ver com o padrão, como o
      // mínimo de 5 caracteres no complemento - o cliente ficava sem padrão
      // nenhum, e sem padrão o finalizar de uma entrega quebra. Agora só
      // desmarca depois que o endereço escolhido virou padrão de fato: um
      // salvamento que falha não mexe em nada.
      let failedToUnsetDefault = false;

      if (payload.isDefault && response.success) {
        const savedId = editingAddressId ?? response.data?.id;

        if (savedId) {
          const currentAddresses = await apiService.address.getUserAddresses();
          const backendAddresses =
            currentAddresses.success && Array.isArray(currentAddresses.data)
              ? currentAddresses.data
              : [];

          const { demotedAll } = await setDefaultAddress(
            backendAddresses,
            savedId,
          );
          failedToUnsetDefault = !demotedAll;
        }
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
        addressPin.resetBaseline();

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
    addressPin.resetBaseline();
    addingAddressState.close();
  };

  /**
   * Marcar um endereço como padrão direto da lista.
   *
   * Até aqui, o único jeito de escolher o padrão era abrir "Editar", marcar
   * a caixa e salvar o endereço inteiro de novo - e o PATCH do endereço tem
   * regras próprias (complemento com mínimo de 5 caracteres, latitude e
   * longitude como número) que fazem o salvamento falhar por motivos que não
   * têm nada a ver com o padrão. Da lista sai um PATCH só, com um campo só.
   */
  const [settingDefaultAddressId, setSettingDefaultAddressId] = useState<
    string | null
  >(null);

  const handleSetDefaultAddress = async (addressId: string) => {
    setSettingDefaultAddressId(addressId);

    try {
      const { promoted, demotedAll, message } = await setDefaultAddress(
        rawAddresses,
        addressId,
      );

      if (!promoted) {
        // A razão do backend vale mais que uma mensagem genérica: é ela que
        // diz se o problema é a regra dele ou o que mandamos.
        toast.error(
          message
            ? `Não foi possível definir este endereço como padrão: ${message}`
            : "Não foi possível definir este endereço como padrão.",
        );
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["addresses", "user", user?.id],
      });

      if (demotedAll) {
        toast.success("Endereço padrão atualizado!");
      } else {
        // Dois padrões ao mesmo tempo fazem o backend escolher sozinho o
        // endereço da entrega - o cliente precisa saber que ficou assim.
        toast.warning(
          message
            ? `Endereço marcado como padrão, mas não conseguimos desmarcar o anterior: ${message}`
            : "Endereço marcado como padrão, mas não conseguimos desmarcar o anterior. Confira sua lista de endereços.",
        );
      }
    } finally {
      setSettingDefaultAddressId(null);
    }
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
    handleSetDefaultAddress,
    settingDefaultAddressId,
    handleCloseAddressModal,
    handleDeleteAddress,
    handleEditAddress,
    editingAddressId,
    addressCoords,
    applyCoords,
    neighborhoodOptions:
      addressPin.neighborhoodList?.neighborhoods.map((item) => item.name) ??
      null,
    stateOptions: addressFields.stateOptions,
    cityOptions: addressFields.cityOptions,
    isLoadingCities: addressFields.isLoadingCities,
    citiesError: addressFields.citiesError,
    fieldLocks: addressFields.locks,
    changeState: addressFields.changeState,
    changeCity: addressFields.changeCity,
    changeNeighborhood: addressFields.changeNeighborhood,
    isLocatingPin: addressPin.isLocating,
    // CEP
    isLoadingCep,
    formatCep,
    watchedZipCode,
  };
};
