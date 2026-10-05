import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { Security } from "./index";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("Security", () => {
  it("Alterar Senha avisa que a troca não está disponível", () => {
    render(<Security />);

    fireEvent.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(toast.error).toHaveBeenCalledWith(
      "A troca de senha ainda não está disponível. Sua senha não foi alterada.",
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
