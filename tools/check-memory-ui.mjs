// DOM interaction regression using real weave data, with mocked storage/render failures.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/strand/index.html", (route) =>
  route.fulfill({
    contentType: "text/html",
    body: fs
      .readFileSync("public/strand/index.html", "utf8")
      .replace(/<script[\s\S]*?<\/script>/g, ""),
  }),
);
await page.goto(
  process.env.MACHINERA_TEST_URL ?? "http://127.0.0.1:5188/strand/index.html",
);
await page.evaluate(async () => {
  const { RugArchive } = await import("./rug-archive.js?v=199");
  const { createMemoryBrowser } = await import("./memory-browser.js?v=199");
  const archive = new RugArchive();
  const palette = [
      { rgb: [18, 90, 130], share: 0.65, weight: 65 },
      { rgb: [235, 160, 65], share: 0.35, weight: 35 },
    ],
    analysis = { brightness: 0.4, contrast: 0.2, complexity: 0.5 };
  archive.append({ palette, analysis, designSeed: 123 }, 3.8, null, {
    analysis,
  });
  archive.append({ palette, analysis, designSeed: 456 }, 2.4, null, {
    analysis,
  });
  document.querySelector("#capture").hidden = true;
  window.h = {
    archive,
    adds: 0,
    renames: 0,
    failRename: false,
    pendingThumb: false,
    thumbResolvers: [],
    failThumb: false,
  };
  const h = window.h;
  window.ui = createMemoryBrowser({
    getArchive: () => archive,
    isBusy: () => false,
    thumbnail: async () => {
      if (h.pendingThumb) await new Promise((r) => h.thumbResolvers.push(r));
      if (h.failThumb) throw Error("Mock preview failure");
      return URL.createObjectURL(new Blob(["x"], { type: "image/png" }));
    },
    jump: () => {},
    save: () => {},
    rename: async (entry, name) => {
      h.renames++;
      if (h.failRename) throw Error("Mock name failure");
      entry.metadata.name = name;
    },
    add: async (candidate) => {
      h.adds++;
      await new Promise((r) => setTimeout(r, 60));
      archive.append(candidate.input, 2.4, null, { analysis });
    },
    onDialog: () => {},
  });
});
const click = (s) => page.locator(s).click();
const state = () =>
  page.evaluate(() => ({
    count: h.archive.entries.length,
    name: h.archive.entries[1].metadata.name,
    renames: h.renames,
    adds: h.adds,
    focus: document.activeElement.id,
    open: document.querySelector("#memoriesDialog").open,
  }));
await click("#browseMemories");
assert.equal(await page.locator(".memory-item").count(), 2);
await page.locator(".memory-item").first().click();
assert.equal(await page.locator("#memoryWeaveAgain").isVisible(), false);
await click("#memoriesBack");
await page.locator(".memory-item").last().click();
assert.equal(await page.locator("#memoryWeaveAgain").isVisible(), true);
await click("#memoryRename");
await page.locator("#memoryName").fill("Cancel name");
await click("#memoryNameCancel");
assert.equal((await state()).name, undefined);
assert.equal((await state()).focus, "memoryRename");
await click("#memoryRename");
await page.locator("#memoryName").fill("Sunday lunch");
await click("#memoryNameSave");
await page.waitForFunction(
  () => document.querySelector("#memoryNameForm").hidden,
);
assert.equal((await state()).name, "Sunday lunch");
assert.equal((await state()).focus, "memoryRename");
await click("#memoryRename");
await page.locator("#memoryName").fill("Retain this input");
await page.evaluate(() => (h.failRename = true));
await click("#memoryNameSave");
await page.waitForFunction(() =>
  document.querySelector("#memoryNameStatus").textContent.includes("Mock"),
);
assert.equal(
  await page.locator("#memoryName").inputValue(),
  "Retain this input",
);
assert.equal((await state()).name, "Sunday lunch");
await click("#memoryNameCancel");
await page.evaluate(() => (h.failRename = false));
await click("#memoryWeaveAgain");
await page.waitForFunction(
  () => !document.querySelector("#variantAdd").disabled,
);
assert.equal((await state()).count, 2);
await page.keyboard.press("Escape");
await page.waitForFunction(
  () => !document.querySelector("#memoriesDialog").open,
);
assert.equal((await state()).focus, "browseMemories");
assert.equal((await state()).count, 2);
await click("#browseMemories");
await page.locator(".memory-item").last().click();
await click("#memoryWeaveAgain");
await page.waitForFunction(
  () => !document.querySelector("#variantAdd").disabled,
);
await page.evaluate(() => {
  document.querySelector("#variantAdd").click();
  document.querySelector("#variantAdd").click();
});
await page.waitForFunction(
  () => !document.querySelector("#memoriesDialog").open,
);
assert.equal((await state()).adds, 1);
assert.equal((await state()).count, 3);
await page.evaluate(() => (h.pendingThumb = true));
await click("#browseMemories");
await page.locator(".memory-item").last().click();
await click("#memoryWeaveAgain");
await page.waitForFunction(() => h.thumbResolvers.length > 0);
await click("#memoriesClose");
await page.evaluate(() => {
  h.pendingThumb = false;
  for (const done of h.thumbResolvers) done();
  h.thumbResolvers = [];
});
await page.waitForTimeout(100);
assert.equal((await state()).open, false);
assert.equal((await state()).focus, "browseMemories");
assert.equal((await state()).count, 3);
console.log(
  JSON.stringify(
    {
      passed: [
        "overview",
        "latest-only variation",
        "rename cancel",
        "rename success",
        "rename failure preserves input",
        "variant cancellation no append",
        "focus return",
        "double Add one append",
        "close during thumbnail no reopening",
      ],
      state: await state(),
      pageErrors: errors,
    },
    null,
    2,
  ),
);
await browser.close();
