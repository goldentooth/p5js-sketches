import { test, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

// Discover all sketch directories that have an index.md and are not drafts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, "../../content");
const sketches = fs
  .readdirSync(contentDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => {
    const indexPath = path.join(contentDir, entry.name, "index.md");
    if (!fs.existsSync(indexPath)) return false;
    const content = fs.readFileSync(indexPath, "utf8");
    return !/^draft:\s*true/m.test(content);
  })
  .map((entry) => entry.name);

if (sketches.length === 0) {
  throw new Error("No sketches discovered in content/. Check contentDir path.");
}

for (const sketch of sketches) {
  test(`${sketch} loads without errors`, async ({ page }) => {
    const errors = [];

    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    // Collect uncaught page errors
    page.on("pageerror", (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    await page.goto(`${sketch}/`);

    // Wait for p5.js to create the canvas
    await page.waitForSelector("canvas", { timeout: 10000 });

    // Assert no errors occurred
    expect(errors, `Errors on ${sketch}:\n${errors.join("\n")}`).toHaveLength(
      0
    );
  });
}
