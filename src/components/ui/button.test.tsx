import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renderiza o texto recebido", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("aplica a variante e o tamanho default quando nada é passado", () => {
    render(<Button>Padrão</Button>);
    const button = screen.getByRole("button", { name: "Padrão" });
    expect(button).toHaveClass("bg-primary");
    expect(button).toHaveClass("h-9");
  });

  it("troca as classes conforme variant e size", () => {
    render(
      <Button variant="destructive" size="lg">
        Excluir
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Excluir" });
    expect(button).toHaveClass("bg-destructive");
    expect(button).toHaveClass("h-10");
  });

  it("dispara onClick ao ser clicado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);

    await user.click(screen.getByRole("button", { name: "Clique" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fica desabilitado e não dispara onClick quando disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Desabilitado
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Desabilitado" });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("com asChild, renderiza o elemento filho em vez de um <button>", () => {
    render(
      <Button asChild>
        <a href="/destino">Ir</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Ir" });
    expect(link).toHaveAttribute("href", "/destino");
    expect(link).toHaveClass("bg-primary");
  });
});
