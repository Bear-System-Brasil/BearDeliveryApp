import { describe, expect, it } from "vitest";
import { toStaffMembers } from "./use-team-management";

const entry = {
  user: {
    id: "u-1",
    name: "Mamaco",
    email: "mamaco@c.com",
    role: "cook",
  },
  companyId: "c-1",
  staffRole: "cook" as const,
};

describe("toStaffMembers", () => {
  it("achata a resposta de GET /company/staff", () => {
    expect(toStaffMembers([entry])).toEqual([
      { id: "u-1", name: "Mamaco", email: "mamaco@c.com", role: "cook" },
    ]);
  });

  it("usa staffRole como função, não user.role", () => {
    const promovido = {
      ...entry,
      user: { ...entry.user, role: "cook" },
      staffRole: "manager" as const,
    };

    expect(toStaffMembers([promovido])[0].role).toBe("manager");
  });

  it("devolve lista vazia quando a resposta não é array", () => {
    // Sem isso a tela estourava ".map is not a function" no render.
    expect(toStaffMembers(undefined)).toEqual([]);
    expect(toStaffMembers(null)).toEqual([]);
    expect(toStaffMembers({ data: [entry] })).toEqual([]);
  });

  it("descarta linha sem user.id, que não tem chave estável", () => {
    const semId = { ...entry, user: { ...entry.user, id: "" } };

    expect(toStaffMembers([semId, entry])).toHaveLength(1);
    expect(toStaffMembers([null, undefined, entry])).toHaveLength(1);
  });

  it("cai no e-mail quando o nome vem vazio", () => {
    const semNome = { ...entry, user: { ...entry.user, name: "" } };

    expect(toStaffMembers([semNome])[0].name).toBe("mamaco@c.com");
  });
});
