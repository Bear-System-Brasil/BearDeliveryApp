import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore, type User } from "./auth-store";
import { useCourierPositionStore } from "./courier-position-store";

const initialAuthState = useAuthStore.getState();

function makeCourier(id: string): User {
  return {
    id,
    name: `Entregador ${id}`,
    email: `${id}@example.com`,
    cpf: "",
    phone: "",
    birthDate: "",
    role: "delivery",
  };
}

const position = () => useCourierPositionStore.getState().position;

describe("posição do entregador x sessão (LDMF-244)", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    useAuthStore.getState().logout();
    useCourierPositionStore.setState({ position: null });
  });

  it("logout descarta a posição do entregador que saiu", () => {
    useAuthStore.getState().login(makeCourier("a"));
    useCourierPositionStore
      .getState()
      .setPosition({ lat: -23.5, lng: -46.6 }, "gps");

    useAuthStore.getState().logout();

    expect(position()).toBeNull();
  });

  it("troca direta de entregador também descarta", () => {
    useAuthStore.getState().login(makeCourier("a"));
    useCourierPositionStore
      .getState()
      .setPosition({ lat: -23.5, lng: -46.6 }, "manual", "Rua A, 10");

    useAuthStore.getState().login(makeCourier("b"));

    expect(position()).toBeNull();
  });

  it("atualizar o perfil do mesmo entregador mantém a posição", () => {
    useAuthStore.getState().login(makeCourier("a"));
    useCourierPositionStore
      .getState()
      .setPosition({ lat: -23.5, lng: -46.6 }, "tracking");

    useAuthStore.getState().updateUser({ name: "Novo nome" });

    expect(position()?.source).toBe("tracking");
  });
});
