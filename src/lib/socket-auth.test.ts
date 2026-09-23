import { afterEach, describe, expect, it, vi } from "vitest";
import { socketAuthProvider } from "./socket-auth";

describe("socketAuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca o token em /api/auth/socket-token e devolve pro callback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ token: "fresh-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const callback = vi.fn();
    socketAuthProvider(callback);

    await vi.waitFor(() => expect(callback).toHaveBeenCalledWith({ token: "fresh-token" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/socket-token");
  });

  it("devolve token null quando a rota responde sem token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ token: null }) }),
    );

    const callback = vi.fn();
    socketAuthProvider(callback);

    await vi.waitFor(() => expect(callback).toHaveBeenCalledWith({ token: null }));
  });

  it("devolve token null em vez de deixar o erro subir quando o fetch falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const callback = vi.fn();
    socketAuthProvider(callback);

    await vi.waitFor(() => expect(callback).toHaveBeenCalledWith({ token: null }));
  });
});
