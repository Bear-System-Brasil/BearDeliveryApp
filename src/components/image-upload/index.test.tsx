import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageUpload } from "./index";
import { apiService } from "@/services/api";
import { toast } from "sonner";

vi.mock("@/services/api", () => ({
  apiService: {
    uploadImage: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite múltiplos uploads seguidos sem recarregar", async () => {
    const onChange = vi.fn();
    vi.mocked(apiService.uploadImage)
      .mockResolvedValueOnce({
        success: true,
        data: { url: "https://r2.test/img1.png" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { url: "https://r2.test/img2.png" },
      });

    const { container } = render(
      <ImageUpload
        value=""
        onChange={onChange}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file1 = new File(["test1"], "img.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file1] } });

    await waitFor(() => {
      expect(apiService.uploadImage).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/img1.png");

    // Segundo upload
    const file2 = new File(["test2"], "img.png", { type: "image/png" });
    fireEvent.click(input);
    fireEvent.change(input, { target: { files: [file2] } });

    await waitFor(() => {
      expect(apiService.uploadImage).toHaveBeenCalledTimes(2);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/img2.png");
  });

  it("reseta o valor do input mesmo quando a validação falha", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ImageUpload
        value=""
        onChange={onChange}
        maxSizeMB={1}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const badFile = new File(["bad"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(toast.error).toHaveBeenCalledWith("Por favor, selecione uma imagem válida");
    expect(input.value).toBe("");
    expect(apiService.uploadImage).not.toHaveBeenCalled();

    // Arquivo válido em seguida funciona normalmente
    vi.mocked(apiService.uploadImage).mockResolvedValueOnce({
      success: true,
      data: { url: "https://r2.test/img-ok.png" },
    });
    const goodFile = new File(["ok"], "img.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(apiService.uploadImage).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/img-ok.png");
  });
});
