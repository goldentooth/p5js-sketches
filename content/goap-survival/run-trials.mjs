import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, "headless-test.html");

const NUM_TRIALS = 200;
const MAX_TICKS = 500; // ~4 full day/night cycles

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Suppress console noise from p5
  page.on("pageerror", (err) => {
    if (!err.message.includes("createCanvas")) {
      console.error("Page error:", err.message);
    }
  });

  // Capture console for debugging
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });

  // Wait for p5 setup to complete and trial runner to be ready
  await page.waitForFunction("window.__trialRunner !== undefined", {
    timeout: 15000,
  });

  console.log(`Running ${NUM_TRIALS} trials, max ${MAX_TICKS} ticks each...\n`);

  const data = await page.evaluate(
    ({ numTrials, maxTicks }) => {
      return window.__trialRunner(numTrials, maxTicks);
    },
    { numTrials: NUM_TRIALS, maxTicks: MAX_TICKS }
  );

  // Print summary
  const s = data.summary;
  console.log("=== SUMMARY ===");
  console.log(`Trials: ${s.totalTrials}`);
  console.log(`Max ticks: ${s.maxTicks}`);
  console.log(`Avg survival: ${s.avgSurvival} ticks`);
  console.log(
    `Survival rate (reached ${s.maxTicks}): ${(s.survivalRate * 100).toFixed(1)}%`
  );
  console.log(`\nDeaths by cause:`);
  for (const [cause, count] of Object.entries(s.deathsByCause).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cause}: ${count} (${((count / s.totalTrials) * 100).toFixed(1)}%)`);
  }

  // Death analysis - group by last goal and action
  const deaths = data.results.filter((r) => r.cause !== "alive");
  if (deaths.length > 0) {
    console.log(`\nDeath details (${deaths.length} deaths):`);

    // Group by cause + lastGoal
    const groups = {};
    for (const d of deaths) {
      const key = `${d.cause} | goal=${d.lastGoal} | action=${d.lastAction}`;
      if (!groups[key]) groups[key] = { count: 0, avgTick: 0, examples: [] };
      groups[key].count++;
      groups[key].avgTick += d.survived;
      if (groups[key].examples.length < 3) groups[key].examples.push(d);
    }

    const sorted = Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
    for (const [key, g] of sorted) {
      console.log(
        `\n  ${key} (${g.count}x, avg tick ${Math.round(g.avgTick / g.count)})`
      );
      for (const ex of g.examples) {
        const n = ex.needsAtDeath;
        console.log(
          `    trial ${ex.trial}: tick ${ex.survived}, needs=[h:${n?.hunger?.toFixed(0)} w:${n?.warmth?.toFixed(0)} hp:${n?.health?.toFixed(0)}] axe=${ex.hadAxe} torch=${ex.hadTorch} pole=${ex.hadPole}`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\n${errors.length} JS errors during trials (first 5):`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
