import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigation } from "./use-navigation";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const initialAuthState = useAuthStore.getState();

describe("useNavigation", () => {
  beforeEach(() => {
    push.mockClear();
    useAuthStore.setState(initialAuthState, true);
  });

  it("navigateToHome vai para /", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.navigateToHome());
    expect(push).toHaveBeenCalledWith("/");
  });

  it("navigateToCart vai para /cart", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.navigateToCart());
    expect(push).toHaveBeenCalledWith("/cart");
  });

  it("navigateToRestaurants, navigateToOffers e navigateToRestaurantsWithFilters todas caem em /#lojas", () => {
    const { result } = renderHook(() => useNavigation());

    act(() => result.current.navigateToRestaurants());
    act(() => result.current.navigateToOffers());
    act(() => result.current.navigateToRestaurantsWithFilters());

    expect(push).toHaveBeenNthCalledWith(1, "/#lojas");
    expect(push).toHaveBeenNthCalledWith(2, "/#lojas");
    expect(push).toHaveBeenNthCalledWith(3, "/#lojas");
  });

  it("navigateToRestaurant/Category/Filter também redirecionam para /#lojas (catálogo ainda é só a home)", () => {
    const { result } = renderHook(() => useNavigation());

    act(() => result.current.navigateToRestaurant(1, "Pizzaria"));
    act(() => result.current.navigateToCategory("Pizza"));
    act(() => result.current.navigateToFilter("Promoção"));

    expect(push).toHaveBeenCalledTimes(3);
    expect(push).toHaveBeenCalledWith("/#lojas");
  });

  it("navigateToLocation navega e retorna true para localização não-vazia", () => {
    const { result } = renderHook(() => useNavigation());

    let returned: boolean | undefined;
    act(() => {
      returned = result.current.navigateToLocation("São Paulo");
    });

    expect(returned).toBe(true);
    expect(push).toHaveBeenCalledWith("/#lojas");
  });

  it("navigateToLocation não navega e retorna false para string vazia/só espaços", () => {
    const { result } = renderHook(() => useNavigation());

    let returned: boolean | undefined;
    act(() => {
      returned = result.current.navigateToLocation("   ");
    });

    expect(returned).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("navigateToProfile usa /company-profile para admin/owner e /profile para os demais", () => {
    const { result, rerender } = renderHook(() => useNavigation());

    act(() => {
      useAuthStore.getState().login({
        id: "1",
        name: "Dona",
        email: "d@example.com",
        cpf: "",
        phone: "",
        birthDate: "",
        role: "owner",
      });
    });
    rerender();
    act(() => result.current.navigateToProfile());
    expect(push).toHaveBeenLastCalledWith("/company-profile");

    act(() => {
      useAuthStore.getState().login({
        id: "2",
        name: "Cliente",
        email: "c@example.com",
        cpf: "",
        phone: "",
        birthDate: "",
        role: "client",
      });
    });
    rerender();
    act(() => result.current.navigateToProfile());
    expect(push).toHaveBeenLastCalledWith("/profile");
  });

  it("navigateToProfile sem usuário logado cai em /profile", () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.navigateToProfile());
    expect(push).toHaveBeenLastCalledWith("/profile");
  });
});
