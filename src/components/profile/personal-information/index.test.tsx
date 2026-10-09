import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalInformation } from "./index";
import { useForm } from "react-hook-form";
import type { ProfileFormData } from "@/hooks";
import type { User } from "@/stores/auth-store";

const mockUser: User = {
  id: "user-123",
  name: "João Silva",
  email: "joao@exemplo.com",
  cpf: "123.456.789-00",
  phone: "(11) 98765-4321",
  birthDate: "1990-05-15",
  role: "client",
};

function TestWrapper({
  isOpen = false,
  handleCancelEdit = vi.fn(),
  handleSaveProfile = vi.fn(),
  open = vi.fn(),
  isPending = false,
}) {
  const form = useForm<ProfileFormData>({
    defaultValues: {
      name: mockUser.name || "",
      email: mockUser.email || "",
      cpf: mockUser.cpf || "",
      phone: mockUser.phone || "",
      birthDate: "1990-05-15",
    },
  });

  const editingState = {
    isOpen,
    toggle: vi.fn(),
    open,
    close: vi.fn(),
    setIsOpen: vi.fn(),
  };

  const updateProfile = {
    isPending,
    isError: false,
    reset: vi.fn(),
  } as any;

  return (
    <PersonalInformation
      handleCancelEdit={handleCancelEdit}
      handleSaveProfile={handleSaveProfile}
      updateProfile={updateProfile}
      profileForm={form}
      editingState={editingState}
      user={mockUser}
    />
  );
}

describe("PersonalInformation Component", () => {
  it("renderiza os campos em modo de visualização com email desabilitado e data formatada", () => {
    render(<TestWrapper isOpen={false} />);

    expect(screen.getByText("Informações Pessoais")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/nome completo/i);
    expect(nameInput).toBeDisabled();
    expect(nameInput).toHaveValue("João Silva");

    const emailInput = screen.getByLabelText(/email \(não editável\)/i);
    expect(emailInput).toBeDisabled();
    expect(emailInput).toHaveValue("joao@exemplo.com");

    const birthDateInput = screen.getByLabelText(/data de nascimento/i);
    expect(birthDateInput).toBeDisabled();
    // Exibição formatada em DD/MM/YYYY
    expect(birthDateInput).toHaveValue("15/05/1990");
  });

  it("ao clicar em Editar, chama a ação de abrir edição", () => {
    const openMock = vi.fn();
    render(<TestWrapper isOpen={false} open={openMock} />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    expect(openMock).toHaveBeenCalled();
  });

  it("em modo de edição, exibe botões Cancelar e Salvar e email continua desabilitado", () => {
    const cancelMock = vi.fn();
    render(<TestWrapper isOpen={true} handleCancelEdit={cancelMock} />);

    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();

    // Email NUNCA pode ser editado pelo usuário
    const emailInput = screen.getByLabelText(/email \(não editável\)/i);
    expect(emailInput).toBeDisabled();

    // Data de nascimento vira input type="date"
    const birthDateInput = screen.getByLabelText(/data de nascimento/i);
    expect(birthDateInput).not.toBeDisabled();
    expect(birthDateInput).toHaveAttribute("type", "date");

    // Cancelar chama o callback correspondente
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(cancelMock).toHaveBeenCalled();
  });
});

