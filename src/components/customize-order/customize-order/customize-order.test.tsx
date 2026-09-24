import type { Product } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O visitante monta o prato, clica em "Adicionar" e só então descobre que
 * precisa de login. Estes testes travam o que acontece com o que ele já
 * tinha escolhido: o modal não pode fechar nem zerar, e o clique tem que
 * ser refeito sozinho quando a sessão chega.
 */

const addToCart = vi.fn();
const showAuthModal = vi.fn();

// Lido a cada render pelo mock de useAuth - permite simular o login
// acontecendo com o modal do prato aberto.
let isAuthenticated = false;

const VARIATION = {
  id: "var-grande",
  name: "Grande",
  priceModifier: 5,
  isAvailable: true,
  stockQuantity: 10,
  productId: "prod-1",
};

const ADD_ON = {
  id: "add-queijo",
  name: "Queijo extra",
  priceModifier: 3,
  isAvailable: true,
  productId: "prod-1",
};

vi.mock("@/hooks", () => ({
  useAllCategories: () => ({ data: [] }),
  useCartActions: () => ({ handleAddToCart: addToCart }),
  useRestaurant: () => ({
    data: { id: "comp-1", tradeName: "Lanchonete do Bear" },
    isLoading: false,
  }),
  usePublicProductVariations: () => ({ data: [VARIATION], isLoading: false }),
  usePublicProductAddOns: () => ({ data: [ADD_ON], isLoading: false }),
}));

vi.mock("@/contexts/auth-provider", () => ({
  useAuth: () => ({ isAuthenticated, showAuthModal }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { CustomizeOrder } = await import("./index");

const product = {
  id: "prod-1",
  name: "xTudo Duplo",
  description: "Dois hambúrgueres, queijo e bacon",
  salePrice: 35,
  isAvailable: true,
  companyId: "comp-1",
  imageURL: [
    { id: "img-1", url: "/xtudo.jpg", productId: "prod-1" },
  ],
  productCategories: [],
} as unknown as Product;

function renderModal() {
  return render(
    <CustomizeOrder
      productData={product}
      isModalOpen
      setIsModalOpen={vi.fn()}
    />,
  );
}

/** Deixa o prato montado: tamanho escolhido, 2 queijos, 2 unidades. */
async function buildOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Grande"));
  await user.click(screen.getByLabelText("Aumentar Queijo extra"));
  await user.click(screen.getByLabelText("Aumentar Queijo extra"));
  await user.click(screen.getByLabelText("Aumentar quantidade"));
}

describe("CustomizeOrder - visitante sem sessão", () => {
  beforeEach(() => {
    addToCart.mockReset();
    // É o que o handleAddToCart real devolve sem sessão (use-cart-actions):
    // recusa e avisa. Mockar `true` aqui simularia um cenário impossível.
    addToCart.mockResolvedValue(false);
    showAuthModal.mockReset();
    isAuthenticated = false;
  });

  it("pede login em vez de tentar adicionar ao carrinho", async () => {
    const user = userEvent.setup();
    renderModal();

    await buildOrder(user);
    await user.click(screen.getByRole("button", { name: /Adicionar/ }));

    expect(showAuthModal).toHaveBeenCalledWith("login");
    expect(addToCart).not.toHaveBeenCalled();
  });

  it("mantém tamanho, complementos e quantidade na tela após o pedido de login", async () => {
    const user = userEvent.setup();
    renderModal();

    await buildOrder(user);
    // 35 base + 5 do tamanho + 2x3 de queijo = 46 por unidade, x2 = 92
    expect(screen.getByText("R$ 92,00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Adicionar/ }));

    // Nada foi descartado: o total continua o mesmo depois do pedido de
    // login, o que só acontece se tamanho, complementos e quantidade
    // seguirem escolhidos.
    expect(screen.getByText("R$ 92,00")).toBeInTheDocument();
  });

  it("refaz o 'Adicionar' sozinho quando a sessão chega, com as escolhas preservadas", async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();

    await buildOrder(user);
    await user.click(screen.getByRole("button", { name: /Adicionar/ }));
    expect(addToCart).not.toHaveBeenCalled();

    // O AuthModal fecha e o Zustand passa a reportar sessão ativa.
    isAuthenticated = true;
    rerender(
      <CustomizeOrder
        productData={product}
        isModalOpen
        setIsModalOpen={vi.fn()}
      />,
    );

    await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(1));

    expect(addToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prod-1",
        quantity: 2,
        price: 46,
        variations: [{ productVariationId: "var-grande" }],
        addOns: [{ productAddOnsId: "add-queijo", quantity: 2 }],
      }),
    );
  });
});

describe("CustomizeOrder - cliente com sessão", () => {
  beforeEach(() => {
    addToCart.mockReset();
    addToCart.mockResolvedValue(true);
    showAuthModal.mockReset();
    isAuthenticated = true;
  });

  it("adiciona direto, sem passar pelo pedido de login", async () => {
    const user = userEvent.setup();
    renderModal();

    await buildOrder(user);
    await user.click(screen.getByRole("button", { name: /Adicionar/ }));

    await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(1));
    expect(showAuthModal).not.toHaveBeenCalled();
  });
});

describe("CustomizeOrder - preços dos extras", () => {
  beforeEach(() => {
    addToCart.mockReset();
    showAuthModal.mockReset();
    isAuthenticated = false;
  });

  it("anuncia o tamanho pelo valor cheio e o complemento pelo acréscimo", () => {
    renderModal();

    // Tamanho: 35 de base + 5 = R$ 40,00, sem "+" - é o que o cliente paga
    // naquele tamanho, igual ao que a gestão do cardápio mostra.
    expect(screen.getByText("R$ 40,00")).toBeInTheDocument();
    expect(screen.queryByText("+ R$ 5,00")).not.toBeInTheDocument();
    // Complemento continua somando por cima.
    expect(screen.getByText("+ R$ 3,00")).toBeInTheDocument();
  });
});
