import { describe, expect, it } from "vitest";
import {
  getProfileRoute,
  isClientRole,
  isCompanyAdminRole,
  isCompanyStaffRole,
} from "./role-helpers";

describe("isCompanyStaffRole", () => {
  it("reconhece qualquer role de staff, incluindo o legado 'company'", () => {
    for (const role of ["company", "admin", "owner", "manager", "financial", "cook", "delivery"]) {
      expect(isCompanyStaffRole(role)).toBe(true);
    }
  });

  it("não reconhece role de cliente nem undefined", () => {
    expect(isCompanyStaffRole("client")).toBe(false);
    expect(isCompanyStaffRole(undefined)).toBe(false);
  });
});

describe("isCompanyAdminRole", () => {
  it("só é true para owner, admin e o legado 'company'", () => {
    expect(isCompanyAdminRole("owner")).toBe(true);
    expect(isCompanyAdminRole("admin")).toBe(true);
    expect(isCompanyAdminRole("company")).toBe(true);
  });

  it("staff que não administra cadastro (manager/financial/cook/delivery) não é admin role", () => {
    for (const role of ["manager", "financial", "cook", "delivery"]) {
      expect(isCompanyAdminRole(role)).toBe(false);
    }
  });

  it("retorna false para undefined", () => {
    expect(isCompanyAdminRole(undefined)).toBe(false);
  });
});

describe("isClientRole", () => {
  it("reconhece client, customer e user", () => {
    expect(isClientRole("client")).toBe(true);
    expect(isClientRole("customer")).toBe(true);
    expect(isClientRole("user")).toBe(true);
  });

  it("não reconhece role de staff", () => {
    expect(isClientRole("owner")).toBe(false);
  });
});

describe("getProfileRoute", () => {
  it("leva admin/owner para /company-profile", () => {
    expect(getProfileRoute("owner")).toBe("/company-profile");
    expect(getProfileRoute("admin")).toBe("/company-profile");
  });

  it("leva staff que não administra cadastro para /profile, não /company-profile", () => {
    expect(getProfileRoute("manager")).toBe("/profile");
    expect(getProfileRoute("financial")).toBe("/profile");
    expect(getProfileRoute("cook")).toBe("/profile");
    expect(getProfileRoute("delivery")).toBe("/profile");
  });

  it("leva cliente e undefined para /profile", () => {
    expect(getProfileRoute("client")).toBe("/profile");
    expect(getProfileRoute(undefined)).toBe("/profile");
  });
});
