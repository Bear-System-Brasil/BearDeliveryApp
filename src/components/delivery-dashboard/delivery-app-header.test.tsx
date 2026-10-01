import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A area de entregas e standalone: barra propria no rodape e nenhum menu do
 * app. A unica saida esta em Ajustes e leva pra tela inicial do cliente, nao
 * pra area do restaurante - entao quem administra o restaurante entrava aqui
 * e ficava isolado. E a tela do entregador nao pode mudar por causa disso.
 */

// Lido a cada render pelo mock do store - permite trocar de role e simular a
// hidratacao assincrona do Zustand persist.
let user: { id: string; role: string } | null = null;
let hasHydrated = true;

const STATE = {
  get user() {
    return user;
  },
  get _hasHydrated() {
    return hasHydrated;
  },
};

vi.mock("@/stores", () => ({
  useAuthStore: (selector: (state: typeof STATE) => unknown) =>
    selector(STATE),
}));

// O MainHeader de verdade puxa auth-provider, router, carrinho e socket. Aqui
// o que importa e se ele entra na arvore, e com que posicao.
vi.mock("@/components/main-header", () => ({
  MainHeader: ({ position }: { position?: string }) => (
    <div data-testid="menu-do-app" data-position={position} />
  ),
}));

const { DeliveryAppHeader } = await import("./delivery-app-header");

const menu = () => screen.queryByTestId("menu-do-app");

beforeEach(() => {
  user = null;
  hasHydrated = true;
});

describe("DeliveryAppHeader", () => {
  it.each(["owner", "admin", "manager"])(
    "mostra o menu do app para %s",
    (role) => {
      user = { id: "u1", role };
      render(<DeliveryAppHeader />);

      expect(menu()).toBeInTheDocument();
    },
  );

  it("nao muda nada para o entregador", () => {
    user = { id: "u1", role: "delivery" };
    render(<DeliveryAppHeader />);

    expect(menu()).not.toBeInTheDocument();
  });

  it("espera a sessao hidratar antes de decidir", () => {
    // Sem isto o cabecalho piscava na tela do entregador a cada F5, no
    // intervalo entre o primeiro render e a role chegar do localStorage.
    user = { id: "u1", role: "delivery" };
    hasHydrated = false;
    render(<DeliveryAppHeader />);

    expect(menu()).not.toBeInTheDocument();
  });

  it("nao renderiza sem sessao", () => {
    user = null;
    render(<DeliveryAppHeader />);

    expect(menu()).not.toBeInTheDocument();
  });

  it("entra estatico, para nao cobrir o cabecalho da tela", () => {
    // As telas daqui tem cabecalho proprio `sticky top-0` com as acoes da
    // tela; flutuante ou sticky, o menu do app pararia em cima dele.
    user = { id: "u1", role: "owner" };
    render(<DeliveryAppHeader />);

    expect(menu()).toHaveAttribute("data-position", "static");
  });
});
