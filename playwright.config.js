import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/smoke",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:1315/p5js-sketches/",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "hugo server --port 1315",
    url: "http://localhost:1315/p5js-sketches/",
    reuseExistingServer: true,
    timeout: 15000,
  },
});
