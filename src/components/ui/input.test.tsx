import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renderiza com o placeholder recebido", () => {
    render(<Input placeholder="Buscar..." />);
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
  });

  it("aceita digitação do usuário", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Nome" />);

    const input = screen.getByPlaceholderText("Nome");
    await user.type(input, "Maria");

    expect(input).toHaveValue("Maria");
  });

  it("repassa o type recebido", () => {
    render(<Input type="email" placeholder="E-mail" />);
    expect(screen.getByPlaceholderText("E-mail")).toHaveAttribute("type", "email");
  });

  it("mantém className extra junto das classes padrão", () => {
    render(<Input placeholder="Extra" className="my-custom-class" />);
    expect(screen.getByPlaceholderText("Extra")).toHaveClass("my-custom-class");
  });

  it("fica desabilitado quando disabled", () => {
    render(<Input placeholder="Desabilitado" disabled />);
    expect(screen.getByPlaceholderText("Desabilitado")).toBeDisabled();
  });
});
