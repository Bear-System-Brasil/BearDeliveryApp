import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("globals.css base button cursor rules", () => {
  const cssPath = path.resolve(__dirname, "./globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("define cursor pointer para botões habilitados na camada base", () => {
    expect(cssContent).toMatch(/button:not\(:disabled\)/);
    expect(cssContent).toMatch(/cursor:\s*pointer;/);
  });

  it("define cursor pointer para elementos com role=button habilitados", () => {
    expect(cssContent).toMatch(/\[role="button"\]:not\(:disabled\)/);
  });

  it("mantém cursor default para botões e role=button desabilitados", () => {
    expect(cssContent).toMatch(/button:disabled/);
    expect(cssContent).toMatch(/\[role="button"\]:disabled/);
    expect(cssContent).toMatch(/cursor:\s*default;/);
  });
});
