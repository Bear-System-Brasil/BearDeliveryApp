import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renderiza o conteúdo recebido", () => {
    render(<Badge>Novo</Badge>);
    expect(screen.getByText("Novo")).toBeInTheDocument();
  });

  it("aplica a variante default quando nenhuma é passada", () => {
    render(<Badge>Padrão</Badge>);
    expect(screen.getByText("Padrão")).toHaveClass("bg-primary");
  });

  it("troca as classes de cor conforme a variante", () => {
    render(<Badge variant="destructive">Cancelado</Badge>);
    expect(screen.getByText("Cancelado")).toHaveClass("bg-destructive");
  });

  it("mantém className extra junto das classes da variante", () => {
    render(<Badge className="my-custom-class">Com extra</Badge>);
    expect(screen.getByText("Com extra")).toHaveClass("my-custom-class");
  });
});
