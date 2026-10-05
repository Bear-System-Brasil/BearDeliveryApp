import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalHubPage from "./legal/page";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

describe("páginas legais", () => {
  it("política de privacidade traz responsáveis e e-mail de contato", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeInTheDocument();
    expect(screen.getByText("Kauan Alves Prata e Wesley da Silva Brum")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "beardeliveryofc@gmail.com" })[0],
    ).toHaveAttribute("href", "mailto:beardeliveryofc@gmail.com");
  });

  it("termos de uso apontam para a política e trazem o foro", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByText(/comarca de Castelo\/ES/)).toBeInTheDocument();
  });

  it("tela do menu junta termos, política e contato", () => {
    render(<LegalHubPage />);

    expect(screen.getByRole("link", { name: /Termos de uso/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Política de privacidade/ })).toHaveAttribute("href", "/privacy");
    expect(screen.getByText("Fale com a gente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar e-mail" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir app de e-mail" })).toHaveAttribute(
      "href",
      "mailto:beardeliveryofc@gmail.com",
    );
  });
});
