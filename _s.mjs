import { chromium } from 'playwright';
const SP = '/tmp/claude-0/-home-user-Machinera/c0d83525-91aa-510d-8717-2f6fdf2b7f8e/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PE:' + e.message));
await p.addInitScript(v => localStorage.setItem('machinera', v), JSON.stringify({ source: 'procedural' }));
await p.goto('http://localhost:4191/index.html', { waitUntil: 'load' });
try { await p.waitForSelector('#hud:not(.hidden)', { timeout: 30000 }); } catch {}
await p.waitForTimeout(3500);
await p.screenshot({ path: `${SP}/gr-1.png` });
console.log('errors:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
await b.close();
