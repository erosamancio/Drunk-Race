// Builds nothing: run `npm run build` first. Serves dist/ with `vite preview`,
// opens it in headless Chromium and saves a screenshot to screenshots/.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4173;
const OUTPUT = process.argv[2] ?? 'screenshots/showroom.png';
const executablePath = process.env.CHROMIUM_PATH ?? undefined;

const waitForServer = async (url) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`preview server did not start at ${url}`);
};

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
try {
  const url = `http://localhost:${PORT}/`;
  await waitForServer(url);
  const browser = await chromium.launch({
    executablePath,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('[page]', message.text());
  });
  await page.goto(url);
  await page.waitForFunction(() => window.drunkRaceReady === true, null, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  mkdirSync('screenshots', { recursive: true });
  await page.screenshot({ path: OUTPUT });
  console.log(`saved ${OUTPUT}`);
  await browser.close();
} finally {
  server.kill();
}
