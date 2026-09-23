import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  addressSchema,
  loginSchema,
  profileSchema,
  useAddressForm,
  useLoginForm,
  useProfileForm,
} from "./use-form-validation";

describe("profileSchema", () => {
  it("aceita um payload válido", () => {
    const result = profileSchema.safeParse({
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    const result = profileSchema.safeParse({
      name: "M",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita email inválido", () => {
    const result = profileSchema.safeParse({
      name: "Maria",
      email: "não-é-email",
      cpf: "12345678900",
      phone: "11999999999",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita CPF/telefone curtos demais", () => {
    expect(
      profileSchema.safeParse({
        name: "Maria",
        email: "maria@example.com",
        cpf: "123",
        phone: "11999999999",
      }).success,
    ).toBe(false);

    expect(
      profileSchema.safeParse({
        name: "Maria",
        email: "maria@example.com",
        cpf: "12345678900",
        phone: "123",
      }).success,
    ).toBe(false);
  });

  it("birthDate é opcional", () => {
    const result = profileSchema.safeParse({
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
    });
    expect(result.success).toBe(true);
  });
});

describe("addressSchema", () => {
  const validAddress = {
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310100",
  };

  it("aceita um endereço válido com os campos obrigatórios", () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });

  it("rejeita quando falta rua, número, bairro, cidade ou CEP", () => {
    for (const field of ["street", "number", "neighborhood", "city", "zipCode"] as const) {
      const invalid = { ...validAddress, [field]: "" };
      expect(addressSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("rejeita CEP com menos de 8 caracteres", () => {
    expect(addressSchema.safeParse({ ...validAddress, zipCode: "0131010" }).success).toBe(
      false,
    );
  });

  it("rejeita estado com só 1 caractere", () => {
    expect(addressSchema.safeParse({ ...validAddress, state: "S" }).success).toBe(false);
  });

  it("complement, isDefault e coordenadas são opcionais", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      complement: "Apto 42",
      isDefault: true,
      latitude: -23.5,
      longitude: -46.6,
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("aceita telefone e senha válidos", () => {
    expect(loginSchema.safeParse({ phone: "11999999999", password: "123456" }).success).toBe(
      true,
    );
  });

  it("rejeita senha curta", () => {
    expect(loginSchema.safeParse({ phone: "11999999999", password: "123" }).success).toBe(
      false,
    );
  });

  it("rejeita telefone curto", () => {
    expect(loginSchema.safeParse({ phone: "123", password: "123456" }).success).toBe(false);
  });
});

describe("useProfileForm / useAddressForm / useLoginForm", () => {
  // O `formState` do react-hook-form é um Proxy que só reflete atualizações
  // em `result.current` para os campos lidos DURANTE o render - por isso
  // cada hook aqui precisa "tocar" `formState.errors` no próprio corpo do
  // renderHook, e não só depois, na asserção.
  function renderProfileForm(defaultValues?: Parameters<typeof useProfileForm>[0]) {
    return renderHook(() => {
      const form = useProfileForm(defaultValues);
      void form.formState.errors;
      return form;
    });
  }

  function renderAddressForm(defaultValues?: Parameters<typeof useAddressForm>[0]) {
    return renderHook(() => {
      const form = useAddressForm(defaultValues);
      void form.formState.errors;
      return form;
    });
  }

  function renderLoginForm(defaultValues?: Parameters<typeof useLoginForm>[0]) {
    return renderHook(() => {
      const form = useLoginForm(defaultValues);
      void form.formState.errors;
      return form;
    });
  }

  it("useProfileForm valida via zodResolver e reporta erro no campo errado", async () => {
    const { result } = renderProfileForm({ name: "M" });

    await act(async () => {
      await result.current.trigger("name");
    });

    expect(result.current.formState.errors.name?.message).toBe(
      "Nome deve ter pelo menos 2 caracteres",
    );
  });

  it("useProfileForm fica sem erro quando os valores default já são válidos", async () => {
    const { result } = renderProfileForm({
      name: "Maria",
      email: "maria@example.com",
      cpf: "12345678900",
      phone: "11999999999",
    });

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.formState.errors).toEqual({});
  });

  it("useAddressForm reporta 'Rua é obrigatória' quando o campo é omitido", async () => {
    const { result } = renderAddressForm({ street: "" });

    await act(async () => {
      await result.current.trigger("street");
    });

    expect(result.current.formState.errors.street?.message).toBe("Rua é obrigatória");
  });

  it("useLoginForm valida telefone e senha juntos", async () => {
    const { result } = renderLoginForm({ phone: "123", password: "12" });

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.formState.errors.phone).toBeDefined();
    expect(result.current.formState.errors.password).toBeDefined();
  });
});
