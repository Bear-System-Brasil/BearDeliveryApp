import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompanyLogoUpload } from "./index";
import { apiService } from "@/services/api";
import { toast } from "sonner";

vi.mock("@/services/api", () => ({
  apiService: {
    uploadCompanyLogo: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CompanyLogoUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite múltiplos uploads seguidos sem recarregar", async () => {
    const onChange = vi.fn();
    vi.mocked(apiService.uploadCompanyLogo)
      .mockResolvedValueOnce({
        success: true,
        data: { logo_url: "https://r2.test/logo1.png" } as never,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { logo_url: "https://r2.test/logo2.png" } as never,
      });

    const { container } = render(
      <CompanyLogoUpload
        value=""
        onChange={onChange}
        companyId="comp-1"
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file1 = new File(["test1"], "logo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file1] } });

    await waitFor(() => {
      expect(apiService.uploadCompanyLogo).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/logo1.png");

    // Segundo upload com o mesmo nome de arquivo
    const file2 = new File(["test2"], "logo.png", { type: "image/png" });
    fireEvent.click(input);
    fireEvent.change(input, { target: { files: [file2] } });

    await waitFor(() => {
      expect(apiService.uploadCompanyLogo).toHaveBeenCalledTimes(2);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/logo2.png");
  });

  it("reseta o valor do input mesmo quando a validação falha", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <CompanyLogoUpload
        value=""
        onChange={onChange}
        companyId="comp-1"
        maxSizeMB={1}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Arquivo não-imagem
    const badFile = new File(["bad"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(toast.error).toHaveBeenCalledWith("Por favor, selecione uma imagem válida");
    expect(input.value).toBe("");
    expect(apiService.uploadCompanyLogo).not.toHaveBeenCalled();

    // Arquivo válido em seguida funciona normalmente
    vi.mocked(apiService.uploadCompanyLogo).mockResolvedValueOnce({
      success: true,
      data: { logo_url: "https://r2.test/logo-ok.png" } as never,
    });
    const goodFile = new File(["ok"], "logo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(apiService.uploadCompanyLogo).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/logo-ok.png");
  });

  it("garante que o clique no input não propaga para o container", () => {
    const onChange = vi.fn();
    const { container } = render(
      <CompanyLogoUpload
        value=""
        onChange={onChange}
        companyId="comp-1"
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    // Clicar no input não deve chamar click() recursivamente
    fireEvent.click(input);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
