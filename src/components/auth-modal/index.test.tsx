import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuthModal from "./index";

// Referências estáveis: mock com identidade nova a cada render causa laço.
const noop = vi.fn();
const hookState = {
  activeTab: "login",
  setActiveTab: noop,
  step: "forgot-password",
  setStep: noop,
  isLoading: false,
  loginData: { identifier: "", password: "" },
  forgotPasswordData: { phone: "" },
  setForgotPasswordData: noop,
  resetPasswordData: { phone: "", code: "", newPassword: "", confirmPassword: "" },
  setResetPasswordData: noop,
  registerData: {},
  acceptedTerms: false,
  setAcceptedTerms: noop,
  otpData: { code: "" },
  setOtpData: noop,
  passwordErrors: [],
  passwordMatch: false,
  submitMessage: null,
  setSubmitMessage: noop,
  formatPhone: (value: string) => value,
  handleInputChange: noop,
  isFormValid: false,
  handleSubmit: noop,
  handleOTPSubmit: noop,
  handleForgotPasswordSubmit: noop,
  handleResetPasswordSubmit: noop,
  handleClose: noop,
};

vi.mock("@/hooks/useAuthModal", () => ({
  useAuthModal: () => hookState,
}));

describe("AuthModal - Esqueci minha senha", () => {
  it("avisa que a recuperação não está disponível, sem pedir telefone", () => {
    render(<AuthModal isOpen onClose={noop} />);

    expect(
      screen.getByText(/a recuperação de senha ainda não está disponível/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enviar código/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /voltar ao login/i }),
    ).toBeInTheDocument();
  });

  it("indica o e-mail de contato para quem precisa entrar agora", () => {
    render(<AuthModal isOpen onClose={noop} />);

    expect(
      screen.getByRole("link", { name: "beardeliveryofc@gmail.com" }),
    ).toHaveAttribute("href", "mailto:beardeliveryofc@gmail.com");
  });
});
