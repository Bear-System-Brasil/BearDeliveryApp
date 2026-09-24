import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NewDish } from "@/services/products/new-dishes";
import type { Restaurant } from "@/types/restaurant";

/**
 * Seção "Novidades" da home: carrossel de pratos. Trava o que o mock
 * promete - chips só quando há dado pra filtrar, card abre o modal do
 * prato, coração favorita a loja sem abrir nada.
 */

let dishes: NewDish[] = [];
let loadingDishes = false;

vi.mock("@/hooks", () => ({
  useNewDishes: () => ({ data: dishes, isLoading: loadingDishes }),
}));

// O modal real puxa restaurante, tamanhos e complementos da API - aqui só
// interessa saber se abriu e com qual prato.
vi.mock("@/components/customize-order/customize-order", () => ({
  CustomizeOrder: ({
    isModalOpen,
    productData,
  }: {
    isModalOpen: boolean;
    productData: { name: string };
  }) =>
    isModalOpen ? (
      <div role="dialog">Modal: {productData.name}</div>
    ) : null,
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { NewDishesSection } = await import("./index");
const { useFavoritesStore } = await import("@/stores");

const STORE = { id: "comp-1", tradeName: "DeCasa Pizzaria" } as Restaurant;

function dish(id: string, overrides: Partial<NewDish> = {}): NewDish {
  return {
    id,
    name: `Prato ${id}`,
    price: 42.9,
    originalPrice: null,
    discountPercent: 0,
    imageUrl: null,
    createdAt: null,
    product: {
      id,
      companyId: "comp-1",
      name: `Prato ${id}`,
      description: "",
      salePrice: 42.9,
      isAvailable: true,
    },
    restaurant: {
      id: "comp-1",
      name: "DeCasa Pizzaria",
      logoUrl: null,
      deliveryFeeLabel: null,
      isFreeDelivery: false,
      deliveryTimeLabel: null,
      deliveryMaxMinutes: null,
    },
    ...overrides,
  };
}

function renderSection() {
  return render(
    <NewDishesSection
      restaurants={[STORE]}
      loading={false}
      hasUserLocation
    />,
  );
}

describe("NewDishesSection", () => {
  beforeEach(() => {
    dishes = [];
    loadingDishes = false;
    useFavoritesStore.getState().clearFavorites();
  });

  it("lista os pratos com badge NOVO, loja e preço", () => {
    dishes = [dish("p1")];
    renderSection();

    expect(screen.getByText("Prato p1")).toBeInTheDocument();
    expect(screen.getByText("NOVO")).toBeInTheDocument();
    expect(screen.getByText("DeCasa Pizzaria")).toBeInTheDocument();
    expect(screen.getByText("R$ 42,90")).toBeInTheDocument();
  });

  it("esconde os chips quando nenhum prato tem frete, tempo ou promoção", () => {
    dishes = [dish("p1")];
    renderSection();

    expect(screen.queryByRole("button", { name: "Tudo" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Promoções" }),
    ).not.toBeInTheDocument();
  });

  it("mostra só os chips com dado e filtra por eles", async () => {
    dishes = [
      dish("p1"),
      dish("p2", {
        price: 58,
        originalPrice: 69,
        discountPercent: 16,
        restaurant: {
          ...dish("p2").restaurant,
          deliveryTimeLabel: "40-50 min",
          deliveryMaxMinutes: 50,
        },
      }),
    ];
    renderSection();

    expect(screen.getByRole("button", { name: "Tudo" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Promoções" }),
    ).toBeInTheDocument();
    // ninguém entrega em até 30 min nem tem frete grátis
    expect(
      screen.queryByRole("button", { name: "Até 30 min" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Entrega grátis" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("-16%")).toBeInTheDocument();
    expect(screen.getByText("R$ 69,00")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Promoções" }));

    expect(screen.queryByText("Prato p1")).not.toBeInTheDocument();
    expect(screen.getByText("Prato p2")).toBeInTheDocument();
  });

  it("abre o modal do prato ao clicar no card ou no +", async () => {
    dishes = [dish("p1")];
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "Ver Prato p1" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Modal: Prato p1");
  });

  it("coração favorita a loja sem abrir o modal", async () => {
    dishes = [dish("p1")];
    renderSection();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Salvar DeCasa Pizzaria nos favoritos",
      }),
    );

    expect(useFavoritesStore.getState().favorites).toEqual(["comp-1"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há pratos", () => {
    renderSection();

    expect(
      screen.getByText("Nenhuma novidade encontrada"),
    ).toBeInTheDocument();
  });
});
