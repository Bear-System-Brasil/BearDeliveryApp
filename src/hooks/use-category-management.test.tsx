import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiService, type Category } from "@/services/api";
import { useAuthStore } from "@/stores";
import { useCategoryManagement } from "./use-category-management";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiService: {
      getMyCategories: vi.fn(),
      deleteMyCategory: vi.fn(),
    },
  };
});

const api = vi.mocked(apiService);

const category: Category = {
  id: "cat-1",
  name: "Lanches",
  companyId: "c1",
  description: "",
  created_at: "",
  updated_at: "",
} as Category;

const initialAuthState = useAuthStore.getState();
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function loginAs(role: string) {
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: "u1",
      name: "Staff",
      email: "staff@example.com",
      cpf: "",
      phone: "",
      birthDate: "",
      role,
      companyId: "c1",
    },
  });
}

async function renderCategories() {
  const hook = renderHook(() => useCategoryManagement(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("useCategoryManagement - exclusão por role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    api.getMyCategories.mockResolvedValue({
      success: true,
      data: { data: [category], meta: { total: 1, page: 1, limit: 100 } },
    } as never);
    api.deleteMyCategory.mockResolvedValue({ success: true, data: category } as never);
  });

  afterEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it.each(["owner", "admin"])("%s pode excluir categoria", async (role) => {
    loginAs(role);
    const { result } = await renderCategories();

    expect(result.current.allCategories).toEqual([category]);
    expect(result.current.canDelete).toBe(true);

    act(() => result.current.handleRequestDelete(category));
    expect(result.current.deleteTarget).toEqual(category);

    await act(async () => {
      await result.current.handleConfirmDelete();
    });
    expect(api.deleteMyCategory).toHaveBeenCalledWith("cat-1");
  });

  it("manager não pode excluir: o backend nega DELETE /categories/:id pra ele", async () => {
    loginAs("manager");
    const { result } = await renderCategories();

    expect(result.current.canDelete).toBe(false);

    act(() => result.current.handleRequestDelete(category));
    expect(result.current.deleteTarget).toBeNull();

    await act(async () => {
      await result.current.handleConfirmDelete();
    });
    expect(api.deleteMyCategory).not.toHaveBeenCalled();
  });
});
