import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactCard } from "./contact-card";

const EMAIL = "contato@exemplo.com";

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

describe("ContactCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o e-mail escrito e o link mailto como alternativa", () => {
    render(<ContactCard email={EMAIL} />);

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir app de e-mail" }),
    ).toHaveAttribute("href", `mailto:${EMAIL}`);
  });

  it("copia o e-mail e avisa, voltando ao normal depois", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<ContactCard email={EMAIL} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar e-mail" }));
    });

    expect(writeText).toHaveBeenCalledWith(EMAIL);
    expect(
      screen.getByRole("button", { name: "E-mail copiado" }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(
      screen.getByRole("button", { name: "Copiar e-mail" }),
    ).toBeInTheDocument();
  });

  it("sem permissão de copiar, pede para selecionar o e-mail", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("negado")));
    render(<ContactCard email={EMAIL} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar e-mail" }));
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Não foi possível copiar. Selecione o e-mail acima.",
    );
  });
});
