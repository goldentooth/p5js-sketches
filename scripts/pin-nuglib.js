import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const sourceFile = path.join(rootDir, "static/libraries/nuglib.min.js");
const contentDir = path.join(rootDir, "content");

function usage() {
  console.log("Usage:");
  console.log("  npm run pin-nuglib -- <sketch-name>   Pin nuglib to a specific sketch");
  console.log("  npm run pin-nuglib -- --all            Pin nuglib to all sketches");
  process.exit(1);
}

function pinSketch(sketchName) {
  const sketchDir = path.join(contentDir, sketchName);
  const indexFile = path.join(sketchDir, "index.md");

  if (!fs.existsSync(indexFile)) {
    console.error(`Error: No sketch found at content/${sketchName}/index.md`);
    process.exit(1);
  }

  const dest = path.join(sketchDir, "nuglib.min.js");
  fs.copyFileSync(sourceFile, dest);
  console.log(`Pinned nuglib.min.js → content/${sketchName}/nuglib.min.js`);
}

function pinAll() {
  const entries = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => fs.existsSync(path.join(contentDir, e.name, "index.md")));

  if (entries.length === 0) {
    console.error("Error: No sketches found in content/");
    process.exit(1);
  }

  for (const entry of entries) {
    pinSketch(entry.name);
  }
}

// Validate source exists
if (!fs.existsSync(sourceFile)) {
  console.error("Error: static/libraries/nuglib.min.js not found. Run 'npm run build' first.");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);

if (args.length === 0) {
  usage();
} else if (args[0] === "--all") {
  pinAll();
} else {
  pinSketch(args[0]);
}
