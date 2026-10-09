import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiService } from "./api";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Fluxos de ciclo de vida de contas (Restaurante, Usuário e Edição de Perfil)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("1. Criar conta de restaurante", () => {
    it("executa o registro do usuário e a criação da empresa associada", async () => {
      // Mock do BFF de registro (/api/auth/register)
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            data: {
              user: { id: "user-rest-1", name: "Bear Burger" },
            },
          },
        }),
      );

      // Chamada de registro
      const regResponse = await apiService.register({
        name: "Bear Burger",
        email: "rest@bear.com",
        phone: "41999990000",
        password: "Password@123",
      });

      expect(regResponse.success).toBe(true);

      // Mock da criação da empresa
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          id: "comp-1",
          tradeName: "Bear Burger",
          cnpj: "12345678000190",
        }),
      );

      const compResponse = await apiService.companies.create({
        tradeName: "Bear Burger",
        legalName: "Bear Burger LTDA",
        cnpj: "12345678000190",
        email: "rest@bear.com",
        phone: "41999990000",
        actionRadius: "10",
      });

      expect(compResponse.success).toBe(true);
      expect(compResponse.data?.id).toBe("comp-1");

      const [, compConfig] = vi.mocked(fetch).mock.calls.at(-1)!;
      expect(compConfig?.body).toBeInstanceOf(FormData);
    });
  });

  describe("2. Criar conta de usuário", () => {
    it("cria usuário cliente com termos e omite CPF se não fornecido", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          id: "user-client-1",
          name: "Cliente Teste",
          email: "cliente@teste.com",
        }),
      );

      const response = await apiService.createUser({
        name: "Cliente Teste",
        email: "cliente@teste.com",
        phone: "41988887777",
        password: "Password@123",
        birthDate: "01/01/1995",
        cpf: "",
      });

      expect(response.success).toBe(true);
      const [url, config] = vi.mocked(fetch).mock.calls.at(-1)!;
      expect(url).toBe("/api/proxy/user");

      const body = JSON.parse(config?.body as string);
      expect(body).not.toHaveProperty("cpf");
      expect(body.email).toBe("cliente@teste.com");
      expect(body.termsVersion).toBe("2026-10-04");
      expect(body.privacyVersion).toBe("2026-10-05");
    });
  });

  describe("3. Modificar informações do perfil", () => {
    it("omite email, id e campos inalterados, e normaliza birthDate para DD/MM/YYYY", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          id: "user-client-1",
          name: "Cliente Atualizado",
          birthDate: "1995-01-01T00:00:00.000Z",
        }),
      );

      // Simulando envio de atualização de perfil onde o usuário mudou o nome e a data de nascimento
      const response = await apiService.updateUser({
        id: "user-client-1",
        email: "cliente@teste.com", // Tentativa de passar email
        name: "Cliente Atualizado",
        birthDate: "1995-01-01", // Data no formato HTML date picker
      });

      expect(response.success).toBe(true);
      const [url, config] = vi.mocked(fetch).mock.calls.at(-1)!;
      expect(url).toBe("/api/proxy/user");
      expect(config?.method).toBe("PUT");

      const body = JSON.parse(config?.body as string);
      // NUNCA envia email ou id para evitar erro de unicidade e schema no NestJS
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("email");
      expect(body.name).toBe("Cliente Atualizado");
      // Data deve ser convertida para DD/MM/YYYY para o moment do NestJS aceitar
      expect(body.birthDate).toBe("01/01/1995");
    });

    it("sanitiza telefone e cpf se eles forem alterados", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          id: "user-client-1",
          name: "Cliente",
          phone: "41999998888",
          cpf: "12345678901",
        }),
      );

      const response = await apiService.updateUser({
        name: "Cliente",
        phone: "(41) 99999-8888",
        cpf: "123.456.789-01",
      });

      expect(response.success).toBe(true);
      const [, config] = vi.mocked(fetch).mock.calls.at(-1)!;
      const body = JSON.parse(config?.body as string);

      expect(body.phone).toBe("41999998888");
      expect(body.cpf).toBe("12345678901");
    });
  });
});
