import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useAuthStore } from "@/stores/auth-store";
import { useNavigation } from "./use-navigation";

afterEach(() => {
  mockPush.mockClear();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("useNavigation", () => {
  it("navigateToHome navega para a raiz", () => {
    const { result } = renderHook(() => useNavigation());
    result.current.navigateToHome();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("navigateToCart navega para /cart", () => {
    const { result } = renderHook(() => useNavigation());
    result.current.navigateToCart();
    expect(mockPush).toHaveBeenCalledWith("/cart");
  });

  it("navigateToRestaurants e navigateToOffers levam pra âncora de lojas na home", () => {
    const { result } = renderHook(() => useNavigation());

    result.current.navigateToRestaurants();
    expect(mockPush).toHaveBeenCalledWith("/#lojas");

    mockPush.mockClear();
    result.current.navigateToOffers();
    expect(mockPush).toHaveBeenCalledWith("/#lojas");
  });

  it("navigateToRestaurant/Category/Filter também caem na âncora de lojas (ainda sem tela própria)", () => {
    const { result } = renderHook(() => useNavigation());

    result.current.navigateToRestaurant(1, "Restaurante do Zé");
    expect(mockPush).toHaveBeenCalledWith("/#lojas");

    mockPush.mockClear();
    result.current.navigateToCategory("Pizza");
    expect(mockPush).toHaveBeenCalledWith("/#lojas");

    mockPush.mockClear();
    result.current.navigateToFilter("Promoções");
    expect(mockPush).toHaveBeenCalledWith("/#lojas");
  });

  it("navigateToProfile manda quem administra a empresa pro /company-profile", () => {
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Zé",
        email: "ze@example.com",
        cpf: "",
        phone: "",
        birthDate: "",
        role: "owner",
      },
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useNavigation());
    result.current.navigateToProfile();
    expect(mockPush).toHaveBeenCalledWith("/company-profile");
  });

  it("navigateToProfile manda cliente (ou visitante sem login) pro /profile", () => {
    const { result } = renderHook(() => useNavigation());
    result.current.navigateToProfile();
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("navigateToLocation ignora texto vazio e não navega", () => {
    const { result } = renderHook(() => useNavigation());
    const handled = result.current.navigateToLocation("   ");

    expect(handled).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigateToLocation com texto válido navega e retorna true", () => {
    const { result } = renderHook(() => useNavigation());
    const handled = result.current.navigateToLocation("Rua Tal, 123");

    expect(handled).toBe(true);
    expect(mockPush).toHaveBeenCalledWith("/#lojas");
  });
});
