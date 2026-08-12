import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const dir = '/tmp/claude-0/-home-user-Machinera/c0d83525-91aa-510d-8717-2f6fdf2b7f8e/scratchpad';
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript((v) => localStorage.setItem('machinera', v), JSON.stringify({ source: 'procedural' }));
await page.goto('http://localhost:4191/?nocar', { waitUntil: 'load' });
try { await page.waitForSelector('#hud:not(.hidden)', { timeout: 40000 }); } catch {}
await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__mood, { timeout: 10000 }).catch(() => {});
for (const name of ['Blue Dusk', 'Deep Night', 'Winter Dusk']) {
  await page.evaluate((n) => { window.__mood.goto(n); window.__mood.t = 1; window.__mood.update(0.001); }, name);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dir}/lamp-${name.toLowerCase().replace(/\s+/g,'-')}.png` });
  console.log('shot', name);
}
console.log('errors:', errs.length ? errs.slice(0,4).join(' | ') : 'none');
await browser.close();
