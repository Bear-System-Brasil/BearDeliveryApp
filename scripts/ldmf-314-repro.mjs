// LDMF-314: reproduz o aceite do entregador com a localizacao negada.
//
// Roda contra o app local (`pnpm next dev -p 3100`), que fala com o backend
// configurado nele. Login pelo BFF do proprio app: o token fica so no cookie
// do navegador. Registra request/response de /api/proxy.
//
// Uso:
//   BD_EMAIL=... BD_PASS=... node scripts/ldmf-314-repro.mjs <pasta-prints> [list|accept-text]
//
// - list: so lista as entregas da conta, sem aceitar nada.
// - accept-text: nega o GPS, digita um endereco no dialogo e aceita de verdade;
//   depois repete o aceite pra ver se a posicao em cache e reaproveitada.
//   O Nominatim e simulado (resposta vazia pro endereco, centro do pais pra
//   "Brasil"), porque e esse fallback que esta sob suspeita.
//
// Credenciais SO por variavel de ambiente. PW_CHROMIUM aponta outro Chromium.
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3100";
const OUT = process.argv[2] ?? ".";
if (!process.env.BD_EMAIL || !process.env.BD_PASS) {
  console.error("Defina BD_EMAIL e BD_PASS no ambiente.");
  process.exit(1);
}
const STEP = process.argv[3] ?? "list"; // list | accept-text | accept-direct
const t0 = Date.now();
const log = [];
const L = (kind, data) => log.push({ t: Date.now() - t0, kind, ...data });

const executablePath =
  process.env.PW_CHROMIUM ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
{
  const ps = await context.newCDPSession(page);
  const { targetInfo } = await ps.send("Target.getTargetInfo");
  const cdp = await browser.newBrowserCDPSession();
  await cdp.send("Browser.setPermission", {
    permission: { name: "geolocation" }, setting: "denied", origin: BASE,
    browserContextId: targetInfo.browserContextId,
  });
}
await context.addInitScript(() => {
  const g = navigator.geolocation;
  for (const name of ["getCurrentPosition", "watchPosition"]) {
    const orig = g[name].bind(g);
    g[name] = (ok, err, opts) => {
      console.log("GEO " + JSON.stringify({ call: name }));
      return orig(ok, (e) => { console.log("GEO " + JSON.stringify({ cb: name + ":error", code: e.code })); if (err) err(e); }, opts);
    };
  }
});
page.on("console", (m) => { const t = m.text(); if (t.startsWith("GEO ")) L("geo", JSON.parse(t.slice(4))); });

// So o Nominatim e simulado, e so neste passo: e o fallback "Brasil" que
// esta sob suspeita, e o Nominatim real pode estar fora de alcance.
if (STEP === "accept-text") {
  await page.route("**/nominatim.openstreetmap.org/**", (r) => {
    const q = new URL(r.request().url()).searchParams.get("q");
    L("nominatim(simulado)", { q });
    r.fulfill({ json: q === "Brasil" ? [{ lat: "-10.3333333", lon: "-53.2" }] : [] });
  });
}

page.on("response", async (res) => {
  const url = new URL(res.url());
  if (!url.pathname.startsWith("/api/proxy")) return;
  const req = res.request();
  let body = null;
  try { body = await res.json(); } catch {}
  const entry = { method: req.method(), path: url.pathname + url.search, status: res.status() };
  if (req.method() !== "GET") { entry.reqBody = req.postData() && JSON.parse(req.postData()); entry.resBody = body; }
  else if (url.pathname.includes("delivery-person/me")) {
    const items = Array.isArray(body) ? body : (body?.data?.data ?? body?.data ?? []);
    entry.summary = (Array.isArray(items) ? items : []).map((d) => ({ id: d.id, status: d.status }));
  }
  L("http", entry);
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
const login = await page.evaluate(async ({ email, password }) => {
  const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json().catch(() => null);
  const user = j?.data?.data?.user ?? null;
  if (user) localStorage.setItem("auth-storage", JSON.stringify({ state: { user: { ...user, role: user.role }, isAuthenticated: true }, version: 1 }));
  return { status: r.status, role: user?.role ?? null, message: j?.message ?? null };
}, { email: process.env.BD_EMAIL, password: process.env.BD_PASS });
L("login", login);
if (login.status !== 200) { console.log(JSON.stringify(log, null, 1)); await browser.close(); process.exit(0); }

await page.goto(`${BASE}/delivery-dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/real-01-painel.png` });
L("ui", { buttons: await page.getByRole("button", { name: /^Aceitar/ }).count() });

if (STEP.startsWith("accept")) {
  await page.getByRole("button", { name: /^Aceitar/ }).first().click();
  await page.waitForTimeout(800);
  const confirm = page.getByRole("dialog").getByRole("button", { name: /Aceitar/ });
  if (await confirm.count()) await confirm.first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/real-02-apos-aceitar.png` });
  L("ui", { step: "apos aceitar", dialog: (await page.getByRole("dialog").allInnerTexts()).join(" | ").slice(0, 200) });

  if (STEP === "accept-text" && (await page.getByLabel(/Ou digite onde/).count())) {
    await page.getByLabel(/Ou digite onde/).fill(process.env.TEXT ?? "Rua Inexistente 123");
    await page.getByRole("button", { name: /Usar este endereço/ }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/real-03-texto.png` });
    L("ui", { step: "apos texto", toasts: await page.locator("[data-sonner-toast]").allInnerTexts() });

    // Segundo aceite, com a posicao manual em cache
    const again = page.getByRole("button", { name: /^Aceitar/ });
    if (await again.count()) {
      await again.first().click();
      await page.waitForTimeout(800);
      const c2 = page.getByRole("dialog").getByRole("button", { name: /Aceitar/ });
      if (await c2.count()) await c2.first().click();
      await page.waitForTimeout(3000);
      L("ui", { step: "segundo aceite", toasts: await page.locator("[data-sonner-toast]").allInnerTexts() });
    }
  }
}
console.log(JSON.stringify(log, null, 1));
await browser.close();
