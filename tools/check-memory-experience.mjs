import { chromium } from "playwright";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";

const base =
  process.env.MACHINERA_TEST_URL ?? "http://127.0.0.1:5188/strand/index.html";
const output = process.env.MACHINERA_TEST_OUTPUT ?? "/tmp/machinera-experience";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(60000);
  globalThis.testPage = page;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://unpkg.com/three@0.170.0/**", (route) =>
    route.fulfill({
      path: path.resolve(
        "node_modules/three",
        route.request().url().split("three@0.170.0/")[1],
      ),
      contentType: "application/javascript",
    }),
  );
  // Reuse a local licensed HDR when supplied; otherwise exercise the normal loader.
  if (process.env.MACHINERA_TEST_HDR)
    await page.route("https://dl.polyhaven.org/**", (route) =>
      route.fulfill({
        path: process.env.MACHINERA_TEST_HDR,
        contentType: "application/octet-stream",
      }),
    );
  // Software-rendered CI can shorten presentation time without changing states.
  // Unit tests independently check the unmodified material/pan timing equations.
  if (process.env.MACHINERA_FAST_SMOKE === "1") {
    await page.route("**/strand/photo-rug-bridge.js*", async (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: (await fs.readFile("public/strand/photo-rug-bridge.js", "utf8"))
          .replace("remainingSeconds=8", "remainingSeconds=.15")
          .replace("19200/1.3", "1920/1.3"),
      }),
    );
    await page.route("**/strand/stream-cloth.js*", async (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: (
          await fs.readFile("public/strand/stream-cloth.js", "utf8")
        ).replace("duration:8", "duration:.15"),
      }),
    );
  }
  await page.goto(base);
  await page.waitForFunction(
    () => document.querySelector("#stage")?.dataset.ready === "true",
    null,
    { timeout: 180000 },
  );
  console.log("Ready");
  await page.locator("#aboutClose").click();
  await page.locator("#soundToggle").click();
  assert.equal(await page.locator("#browseMemories").isVisible(), false);
  if (process.env.MACHINERA_CAPTURE_ONLY === "1") {
    await page.locator("#photoFile").setInputFiles({name:"broken.png",mimeType:"image/png",buffer:Buffer.from("invalid image")});
    await page.waitForFunction(()=>document.querySelector("#photoStatus").textContent.includes("Could not open"));
    assert.equal(await page.locator("#shutter").isEnabled(),true);
  }
  await page
    .locator("#photoFile")
    .setInputFiles("public/strand/assets/demo/moment-2.jpg");
  console.log("Photo selected");
  await page.waitForSelector(".yarn-gather", { timeout: 30000 });
  await page.screenshot({ path: path.join(output, "01-scan.png") });
  if (process.env.MACHINERA_CAPTURE_ONLY === "1") {
    assert.deepEqual(errors,[]);
    console.log("Passed corrupt-file recovery, re-enabled capture and valid-photo scan");
    await browser.close();
    process.exit(0);
  }

  await page.waitForFunction(
    () => document.querySelector("#stage").dataset.bridgePhase === "panning",
    null,
    { timeout: 30000 },
  );
  console.log("Pan started");
  const progress = [];
  for (let i = 0; i < 4; i++) {
    progress.push(
      await page
        .locator("#stage")
        .evaluate((el) => ({
          pan: Number(el.dataset.bridgeProgress),
          printing: el.dataset.printing,
        })),
    );
    await page.waitForTimeout(450);
    console.log("Progress", progress.at(-1));
  }
  await page.waitForFunction(
    () =>
      document.querySelector("#capture").hidden &&
      !document.querySelector("#saveMemory").disabled,
    null,
    { timeout: 180000 },
  );
  console.log("First print completed");
  assert.equal(await page.locator("#memoryCount").textContent(), "01");
  await page.locator("#browseMemories").click();
  await page.locator(".memory-item").first().click();
  console.log("Detail opened");
  await page.locator("#memoryRename").click();
  await page.locator("#memoryName").fill("Sunday blue");
  await page.locator("#memoryNameSave").click();
  await page.waitForFunction(
    () => document.querySelector("#memoryNameForm").hidden,
  );
  console.log("Name saved");
  assert.equal(
    await page.locator("#memoryDetailName").textContent(),
    "Sunday blue",
  );
  await page.locator("#memoryWeaveAgain").click();
  await page.waitForFunction(
    () => !document.querySelector("#variantAdd").disabled,
    null,
    { timeout: 30000 },
  );
  console.log("Variant ready");
  await page.screenshot({ path: path.join(output, "02-variation.png") });
  assert.equal(await page.locator("#memoryCount").textContent(), "01");
  await page.locator("#memoriesClose").click();
  await page.locator("#browseMemories").click();
  await page.locator(".memory-item").first().click();
  await page.locator("#memoryWeaveAgain").click();
  await page.waitForFunction(
    () => !document.querySelector("#variantAdd").disabled,
    null,
    { timeout: 30000 },
  );
  await page.locator("#variantAdd").click();
  await page.waitForFunction(
    () =>
      !document.querySelector("#memoriesDialog").open &&
      !document.querySelector("#saveMemory").disabled,
    null,
    { timeout: 180000 },
  );
  assert.equal(await page.locator("#memoryCount").textContent(), "02");
  await page.locator("#browseMemories").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".memory-item").length === 2,
  );
  await page.screenshot({ path: path.join(output, "03-memories.png") });
  await page.locator(".memory-item").first().click();
  assert.equal(await page.locator("#memoryWeaveAgain").isVisible(), false);
  await page.locator("#memoryExport").click();
  await page.waitForFunction(
    () => !document.querySelector("#postcardDownload").disabled,
    null,
    { timeout: 45000 },
  );
  assert.match(
    await page.locator("#postcardPreview").getAttribute("alt"),
    /Memory 01/,
  );
  await page.screenshot({ path: path.join(output, "04-postcard.png") });
  await page.locator("#postcardClose").click();
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("#stage")?.dataset.ready === "true",
    null,
    { timeout: 180000 },
  );
  await page.locator("#aboutClose").click();
  assert.equal(await page.locator("#memoryCount").textContent(), "02");
  await page.locator("#secondFloor").click();
  await page.waitForFunction(
    () => document.querySelector("#capture").hidden,
    null,
    { timeout: 15000 },
  );
  await page.locator("#browseMemories").click();
  await page.locator(".memory-item").first().click();
  assert.equal(
    await page.locator("#memoryDetailName").textContent(),
    "Sunday blue",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ passed: true, progress, screenshots: output }, null, 2),
  );
  await context.close();
} catch (error) {
  if (globalThis.testPage) {
    console.log(
      "Failure state",
      await globalThis.testPage
        .locator("#stage")
        .evaluate((el) => ({ ...el.dataset }))
        .catch(() => null),
    );
    await globalThis.testPage
      .screenshot({ path: path.join(output, "failure.png") })
      .catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
