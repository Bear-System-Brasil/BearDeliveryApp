import { describe, expect, it } from "vitest";
import { decodeJwt, isExpired } from "./jwt";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeToken(payload: object): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.assinatura`;
}

describe("decodeJwt", () => {
  it("decodifica o payload de um JWT válido (base64url, sem padding)", () => {
    const token = makeToken({ sub: "user-1", role: "client", companyId: null });
    expect(decodeJwt(token)).toEqual({ sub: "user-1", role: "client", companyId: null });
  });

  it("decodifica payload com exp", () => {
    const token = makeToken({ sub: "u", role: "owner", companyId: "c1", exp: 123 });
    expect(decodeJwt(token)?.exp).toBe(123);
  });

  it("retorna null quando o token não tem 3 partes", () => {
    expect(decodeJwt("apenas-uma-parte")).toBeNull();
    expect(decodeJwt("duas.partes")).toBeNull();
    expect(decodeJwt("")).toBeNull();
  });

  it("retorna null quando o payload não é base64/JSON válido", () => {
    expect(decodeJwt("header.@@nao-e-base64@@.assinatura")).toBeNull();
  });
});

describe("isExpired", () => {
  it("retorna false quando o payload é null", () => {
    expect(isExpired(null)).toBe(false);
  });

  it("retorna false quando não há exp (fluxo por telefone, sem expiração)", () => {
    expect(isExpired({ sub: "u", role: "client", companyId: null })).toBe(false);
  });

  it("retorna true quando exp já passou", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(isExpired({ sub: "u", role: "client", companyId: null, exp: past })).toBe(true);
  });

  it("retorna false quando exp ainda está no futuro", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isExpired({ sub: "u", role: "client", companyId: null, exp: future })).toBe(false);
  });
});
