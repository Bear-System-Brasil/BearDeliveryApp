import type { RawAuthUser } from "@/services/api";
import { isCompanyStaffRole } from "@/utils/role-helpers";
import { STORAGE_KEYS } from "@/utils/storage-manager";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  role: string;
  companyId?: string;
  photoUrl?: string;
  tradeName?: string;
  legalName?: string;
  cnpj?: string;
  logo_url?: string;
  cover_url?: string;
}

/**
 * O backend de auth devolve um objeto cru ambíguo (campos de cliente ou de
 * empresa, dependendo da conta) - esta função normaliza pro shape único que
 * o store persiste, escolhendo os campos certos conforme a `role`.
 */
export function normalizeAuthUser(raw: RawAuthUser): User {
  const role = raw.role || "client";
  // Mesma lista de staff do resto do app: a cópia local que existia aqui
  // ficou sem `financial`, que era normalizado com campos de cliente.
  const isCompanyUser = isCompanyStaffRole(role);

  if (isCompanyUser) {
    return {
      id: raw.id,
      name: raw.tradeName || raw.legalName || raw.name || "Empresa",
      email: raw.email,
      cpf: raw.cnpj || raw.cpf || "",
      phone: raw.phone || "",
      birthDate: raw.birthDate || "",
      role,
      companyId: raw.companyId || undefined,
      photoUrl: raw.photoUrl || raw.logo_url,
      tradeName: raw.tradeName,
      legalName: raw.legalName,
      cnpj: raw.cnpj,
      logo_url: raw.logo_url,
    };
  }

  return {
    id: raw.id,
    name: raw.name || "",
    email: raw.email,
    cpf: raw.cpf || "",
    phone: raw.phone || "",
    birthDate: raw.birthDate || "",
    role,
    companyId: raw.companyId || undefined,
    photoUrl: raw.photoUrl,
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        _hasHydrated: false,

        login: (user) =>
          set(
            {
              user,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            "auth/login",
          ),

        logout: () =>
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
            },
            false,
            "auth/logout",
          ),

        updateUser: (updatedUser) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...updatedUser } : null,
            }),
            false,
            "auth/updateUser",
          ),

        setLoading: (loading) =>
          set({ isLoading: loading }, false, "auth/setLoading"),

        setHasHydrated: (state) =>
          set({ _hasHydrated: state }, false, "auth/setHasHydrated"),
      }),
      {
        name: STORAGE_KEYS.AUTH,
        version: 1,
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
    { name: "auth-store", enabled: process.env.NODE_ENV !== "production" },
  ),
);
