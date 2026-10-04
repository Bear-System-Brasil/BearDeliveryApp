import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChangePaymentMethodDialog } from "./index";

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof ChangePaymentMethodDialog>> = {},
) {
  const props = {
    open: true,
    onClose: vi.fn(),
    currentMethod: "DEBIT_CARD",
    onConfirm: vi.fn().mockResolvedValue(true),
    title: "Alterar forma de pagamento",
    description: "Escolha a nova forma.",
    confirmLabel: "Salvar",
    ...overrides,
  };
  render(<ChangePaymentMethodDialog {...props} />);
  return props;
}

describe("ChangePaymentMethodDialog", () => {
  it("marca a forma atual e não deixa escolhê-la", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: /Débito/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Crédito/ })).toBeEnabled();
  });

  it("só habilita o confirmar depois de escolher uma forma", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Crédito/ }));
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("confirma com a forma escolhida e fecha quando dá certo", async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.click(screen.getByRole("button", { name: /PIX/ }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(props.onConfirm).toHaveBeenCalledWith("PIX", "");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("não fecha quando a confirmação falha", async () => {
    const user = userEvent.setup();
    const props = renderDialog({ onConfirm: vi.fn().mockResolvedValue(false) });

    await user.click(screen.getByRole("button", { name: /Crédito/ }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(props.onConfirm).toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("com observação, envia o texto junto", async () => {
    const user = userEvent.setup();
    const props = renderDialog({ withNote: true });

    await user.click(screen.getByRole("button", { name: /Crédito/ }));
    await user.type(screen.getByLabelText("Observação (opcional)"), " passou no crédito ");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(props.onConfirm).toHaveBeenCalledWith("CREDIT_CARD", "passou no crédito");
  });
});
