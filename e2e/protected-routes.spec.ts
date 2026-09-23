import { expect, test } from "@playwright/test";

test.describe("Rotas protegidas (visitante sem login)", () => {
  test("acessar /profile sem estar logado redireciona pra home e abre o modal de login", async ({
    page,
  }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  });

  test("acessar /menu-management sem estar logado redireciona pra home e abre o modal de login", async ({
    page,
  }) => {
    await page.goto("/menu-management");

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("/cart é liberado pra visitante sem login (guestAllowed)", async ({ page }) => {
    const response = await page.goto("/cart");

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
