import { describe, expect, it } from "vitest";
import {
  getProfileRoute,
  isClientRole,
  isCompanyAdminRole,
  isCompanyStaffRole,
} from "./role-helpers";

describe("isCompanyStaffRole", () => {
  it("reconhece qualquer role de staff do restaurante", () => {
    expect(isCompanyStaffRole("owner")).toBe(true);
    expect(isCompanyStaffRole("manager")).toBe(true);
    expect(isCompanyStaffRole("financial")).toBe(true);
    expect(isCompanyStaffRole("cook")).toBe(true);
    expect(isCompanyStaffRole("delivery")).toBe(true);
    expect(isCompanyStaffRole("company")).toBe(true);
  });

  it("não reconhece cliente nem valor vazio", () => {
    expect(isCompanyStaffRole("client")).toBe(false);
    expect(isCompanyStaffRole(undefined)).toBe(false);
  });
});

describe("isCompanyAdminRole", () => {
  it("só reconhece quem administra o cadastro da empresa", () => {
    expect(isCompanyAdminRole("owner")).toBe(true);
    expect(isCompanyAdminRole("admin")).toBe(true);
    expect(isCompanyAdminRole("company")).toBe(true);
  });

  it("staff que não é admin fica de fora (manager, financial, cook, delivery)", () => {
    expect(isCompanyAdminRole("manager")).toBe(false);
    expect(isCompanyAdminRole("financial")).toBe(false);
    expect(isCompanyAdminRole("cook")).toBe(false);
    expect(isCompanyAdminRole("delivery")).toBe(false);
    expect(isCompanyAdminRole(undefined)).toBe(false);
  });
});

describe("isClientRole", () => {
  it("reconhece os sinônimos de cliente", () => {
    expect(isClientRole("client")).toBe(true);
    expect(isClientRole("customer")).toBe(true);
    expect(isClientRole("user")).toBe(true);
  });

  it("não reconhece staff nem valor vazio", () => {
    expect(isClientRole("owner")).toBe(false);
    expect(isClientRole(undefined)).toBe(false);
  });
});

describe("getProfileRoute", () => {
  it("manda quem administra a empresa para /company-profile", () => {
    expect(getProfileRoute("owner")).toBe("/company-profile");
    expect(getProfileRoute("admin")).toBe("/company-profile");
  });

  it("manda o restante (staff não-admin e clientes) para /profile", () => {
    expect(getProfileRoute("manager")).toBe("/profile");
    expect(getProfileRoute("financial")).toBe("/profile");
    expect(getProfileRoute("client")).toBe("/profile");
    expect(getProfileRoute(undefined)).toBe("/profile");
  });
});
