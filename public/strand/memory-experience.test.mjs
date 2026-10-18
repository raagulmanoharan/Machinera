import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { RugArchive } from "./rug-archive.js";
import { MemoryStore, snapshotWeave } from "./memory-store.js";
import {
  prepareVariation,
  currentCandidate,
  memoryName,
  nameCharacters,
  weaveSignature,
} from "./memory-exploration.js";
import { postcardDetails, postcardLines } from "./memory-postcard.js";
const palette = [
    { rgb: [18, 90, 130], share: 0.65, weight: 65 },
    { rgb: [235, 160, 65], share: 0.35, weight: 35 },
  ],
  analysis = { brightness: 0.4, contrast: 0.2, complexity: 0.5 };
function make() {
  const archive = new RugArchive();
  const entry = archive.append(
    { palette, analysis, designSeed: 123 },
    3.8,
    null,
    { memoryId: "first-memory", analysis },
  );
  return { archive, entry };
}

test("exploration never changes original; accepted input reproduces the exact preview", () => {
  const { archive, entry } = make(),
    before = structuredClone(snapshotWeave(entry));
  let prior = null;
  for (let i = 0; i < 3; i++) {
    const candidate = prepareVariation(archive, entry, {
      seed: 900 + i,
      previous: prior,
    });
    assert.equal(archive.entries.length, 1);
    assert.equal(archive.length, 3.8);
    assert.deepEqual(snapshotWeave(entry), before);
    assert.deepEqual(candidate.entry.palette, entry.palette);
    assert.equal(candidate.input.derivedFrom, "first-memory");
    assert.notEqual(weaveSignature(candidate.entry), weaveSignature(entry));
    assert.equal(currentCandidate(candidate, archive), true);
    prior = candidate;
  }
  const added = archive.append(prior.input, 2.4, null, { analysis });
  assert.equal(weaveSignature(added), weaveSignature(prior.entry));
  assert.deepEqual(snapshotWeave(entry), before);
  assert.equal(currentCandidate(prior, archive), false);
  assert.equal(archive.entries.length, 2);
});

test("old memory does not invent analysis; only latest is eligible", () => {
  const { archive, entry } = make();
  archive.append({ palette, analysis, designSeed: 9 }, 2.4);
  assert.throws(() => prepareVariation(archive, entry), /latest/);
  assert.throws(
    () => prepareVariation(archive, archive.entries.at(-1)),
    /latest/,
  );
});

test("names count graphemes, trim whitespace and preserve plain text", () => {
  const family = "👨‍👩‍👧‍👦";
  assert.equal(nameCharacters(family), 1);
  assert.equal(memoryName(family.repeat(40)), family.repeat(40));
  assert.throws(() => memoryName(family.repeat(41)), /40/);
  assert.equal(memoryName("  Sunday\n  lunch  "), "Sunday lunch");
  assert.equal(memoryName("<script>hello</script>"), "<script>hello</script>");
  assert.equal(memoryName(""), "");
  assert.equal(nameCharacters("e\u0301"), 1);
});

test("IndexedDB save/restore preserves snapshots, IDs and metadata-only edits", async () => {
  const store = new MemoryStore(new IDBFactory()),
    { archive, entry } = make(),
    original = structuredClone(snapshotWeave(entry));
  await store.assertTail(0);
  await store.save(entry);
  assert.equal(entry.saveState, "saved");
  assert.ok(entry.storageId);
  await store.rename(entry, "Kitchen", "");
  const records = await store.load();
  assert.equal(records.length, 1);
  assert.equal(records[0].archive.metadata.name, "Kitchen");
  assert.equal(records[0].archive.storageId, entry.storageId);
  assert.deepEqual(records[0].archive.baked, original.baked);
  assert.equal(records[0].archive.plan.seed, original.plan.seed);
  assert.deepEqual(records[0].archive.palette, original.palette);
  await assert.rejects(store.rename(entry, "Overwritten", ""), /another tab/);
  await store.rename(entry, "", "Kitchen");
  assert.equal((await store.load())[0].archive.metadata.name, "");
  await assert.rejects(
    store.assertTail(0),
    (e) => e.code === "MEMORY_CONFLICT",
  );
  await store.assertTail(archive.length);
  const snapshot = snapshotWeave(entry);
  assert.equal("storageId" in snapshot, false);
  assert.equal("saveState" in snapshot, false);
  assert.equal("previous" in snapshot, false);
  assert.equal("scanMap" in snapshot, false);
});

test("stale-tab appends reject without deleting or replacing the saved cloth", async () => {
  const store = new MemoryStore(new IDBFactory()),
    a = make(),
    b = make();
  await store.save(a.entry);
  await assert.rejects(store.save(b.entry), /another tab/);
  const records = await store.load();
  assert.equal(records.length, 1);
  assert.equal(records[0].archive.plan.id, a.entry.plan.id);
  const restored = new RugArchive().restore(records.map((r) => r.archive));
  assert.deepEqual(restored.entries[0].baked, a.entry.baked);
});

test("corrupt restore is distinguished from an empty database and preserves the row", async () => {
  const store = new MemoryStore(new IDBFactory()),
    db = await store.open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("memories", "readwrite");
    tx.objectStore("memories").add({ archive: { version: 99 } });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  await assert.rejects(store.load(), (e) => e.code === "ARCHIVE_READ");
  await new Promise((resolve) => {
    const tx = db.transaction("memories", "readonly"),
      request = tx.objectStore("memories").count();
    request.onsuccess = () => {
      assert.equal(request.result, 1);
      resolve();
    };
  });
});

test("postcard details use the selected name; unbroken names wrap within width", () => {
  const { entry } = make();
  entry.metadata.name = "A blue room";
  assert.equal(postcardDetails(entry, 3).number, "04");
  assert.equal(postcardDetails(entry, 3).name, "A blue room");
  const ctx = {
    measureText: (text) => ({ width: Array.from(text).length * 10 }),
  };
  const rows = postcardLines(ctx, "abcdefghijklmnopqrstuv", 60);
  assert.ok(rows.every((row) => ctx.measureText(row).width <= 60));
  assert.equal(rows.join(""), "abcdefghijklmnopqrstuv");
});
