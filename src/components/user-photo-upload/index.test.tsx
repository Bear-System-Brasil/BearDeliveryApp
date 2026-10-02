import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserPhotoUpload } from "./index";
import { apiService } from "@/services/api";
import { toast } from "sonner";

vi.mock("@/services/api", () => ({
  apiService: {
    uploadUserPhoto: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("UserPhotoUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite múltiplos uploads seguidos sem recarregar", async () => {
    const onChange = vi.fn();
    vi.mocked(apiService.uploadUserPhoto)
      .mockResolvedValueOnce({
        success: true,
        data: { photoUrl: "https://r2.test/photo1.png" } as never,
      })
      .mockResolvedValueOnce({
        success: true,
        data: { photoUrl: "https://r2.test/photo2.png" } as never,
      });

    const { container } = render(
      <UserPhotoUpload
        value=""
        onChange={onChange}
        userId="user-1"
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file1 = new File(["test1"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file1] } });

    await waitFor(() => {
      expect(apiService.uploadUserPhoto).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/photo1.png");

    // Segundo upload
    const file2 = new File(["test2"], "avatar.png", { type: "image/png" });
    fireEvent.click(input);
    fireEvent.change(input, { target: { files: [file2] } });

    await waitFor(() => {
      expect(apiService.uploadUserPhoto).toHaveBeenCalledTimes(2);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/photo2.png");
  });

  it("reseta o valor do input mesmo quando a validação falha", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <UserPhotoUpload
        value=""
        onChange={onChange}
        userId="user-1"
        maxSizeMB={1}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const badFile = new File(["bad"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(toast.error).toHaveBeenCalledWith("Por favor, selecione uma imagem válida");
    expect(input.value).toBe("");
    expect(apiService.uploadUserPhoto).not.toHaveBeenCalled();

    // Arquivo válido em seguida funciona normalmente
    vi.mocked(apiService.uploadUserPhoto).mockResolvedValueOnce({
      success: true,
      data: { photoUrl: "https://r2.test/photo-ok.png" } as never,
    });
    const goodFile = new File(["ok"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(apiService.uploadUserPhoto).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith("https://r2.test/photo-ok.png");
  });
});
