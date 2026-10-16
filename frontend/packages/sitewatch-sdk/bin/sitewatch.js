#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const cwd = process.cwd();
const args = process.argv.slice(2);
const help = `SiteWatch setup\n\nUsage:\n  npx sitewatch init\n\nThe guided setup detects a React or Vite entry file and adds SiteWatch once.`;

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

async function prompt(question) {
  const rl = createInterface({ input, output });
  try { return (await rl.question(question)).trim(); } finally { rl.close(); }
}

async function findEntryFile() {
  const candidates = ["src/main.jsx", "src/main.js", "src/main.tsx", "src/main.ts", "src/index.jsx", "src/index.js", "src/index.tsx", "src/index.ts"];
  for (const candidate of candidates) {
    const path = join(cwd, candidate);
    if (await exists(path)) return path;
  }
  return null;
}

function integration(apiKey, endpoint) {
  return `import { initSiteWatch } from "@tozvi/sitewatch";\n\ninitSiteWatch({\n  apiKey: ${JSON.stringify(apiKey)},\n  endpoint: ${JSON.stringify(endpoint)},\n});\n\n`;
}

async function init() {
  const entry = await findEntryFile();
  if (!entry) throw new Error("Could not find a supported app entry file. Add SiteWatch manually to src/main.* or src/index.*.");
  const apiKey = await prompt("SiteWatch project key: ");
  if (!apiKey) throw new Error("A SiteWatch project key is required.");
  const endpoint = (await prompt("Error endpoint [https://sitewatch-sigma.vercel.app/api/errors]: ")) || "https://sitewatch-sigma.vercel.app/api/errors";
  const source = await readFile(entry, "utf8");
  if (source.includes("initSiteWatch") || source.includes("@tozvi/sitewatch")) {
    console.log(`SiteWatch is already configured in ${basename(entry)}. No changes made.`);
    return;
  }
  await writeFile(entry, integration(apiKey, endpoint) + source, "utf8");
  console.log(`✓ Detected ${basename(entry)}\n✓ Added SiteWatch monitoring\n\nStart or deploy your app. The first browser error or failed request will appear in your SiteWatch dashboard.`);
}

if (args[0] === "init") init().catch((error) => { console.error(`SiteWatch setup failed: ${error.message}`); process.exitCode = 1; });
else console.log(help);
