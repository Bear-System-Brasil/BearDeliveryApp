import { describe, expect, it } from "vitest";
import { decodeJwt, isExpired, type JwtPayload } from "./jwt";

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(payload: object, header: object = { alg: "HS256", typ: "JWT" }): string {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.fake-signature`;
}

describe("decodeJwt", () => {
  it("decodifica um JWT real (base64url, com - e _) de volta pro payload original", () => {
    const payload = {
      // Esse `sub` é sabido gerar tanto '+' quanto '/' na base64 padrão do
      // JSON serializado - cobre a troca de -/_ na decodificação (sem isso,
      // um payload comum de teste nunca exercita esse caminho).
      sub: "bLbs2q?Fe~ki",
      role: "client",
      companyId: null,
    };
    const token = makeJwt(payload);
    const [, encodedPayload] = token.split(".");
    expect(encodedPayload).toMatch(/[-_]/);

    expect(decodeJwt(token)).toEqual(payload);
  });

  it("decodifica corretamente independente do padding necessário", () => {
    // payloads de tamanhos diferentes geram base64 com 0, 1 ou 2 '=' de padding
    for (const sub of ["a", "ab", "abc", "abcd", "abcde"]) {
      const payload: JwtPayload = { sub, role: "client", companyId: null };
      expect(decodeJwt(makeJwt(payload))).toEqual(payload);
    }
  });

  it("retorna null para token com número errado de segmentos", () => {
    expect(decodeJwt("apenas-um-segmento")).toBeNull();
    expect(decodeJwt("a.b")).toBeNull();
    expect(decodeJwt("a.b.c.d")).toBeNull();
  });

  it("retorna null quando o payload não é JSON válido", () => {
    const token = `${base64url("{}")}.${base64url("nao-e-json")}.sig`;
    expect(decodeJwt(token)).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(decodeJwt("")).toBeNull();
  });
});

describe("isExpired", () => {
  it("retorna false quando o payload é null (token ausente/inválido)", () => {
    expect(isExpired(null)).toBe(false);
  });

  it("retorna false quando não há exp (fluxo por telefone)", () => {
    expect(isExpired({ sub: "1", role: "client", companyId: null })).toBe(false);
  });

  it("retorna true quando exp já passou", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(isExpired({ sub: "1", role: "client", companyId: null, exp: past })).toBe(true);
  });

  it("retorna false quando exp ainda está no futuro", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isExpired({ sub: "1", role: "client", companyId: null, exp: future })).toBe(false);
  });

  it("trata exp igual ao instante atual como expirado", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isExpired({ sub: "1", role: "client", companyId: null, exp: now - 1 })).toBe(true);
  });
});
