import { RugArchive } from "./rug-archive.js?v=156";

export const NAME_LIMIT = 40;
export function nameCharacters(value) {
  return typeof Intl.Segmenter === "function"
    ? [
        ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          value,
        ),
      ].length
    : Array.from(value).length;
}
export function memoryName(value) {
  const name = String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim();
  if (nameCharacters(name) > NAME_LIMIT)
    throw new Error(`Use ${NAME_LIMIT} characters or fewer.`);
  return name;
}
export function weaveSignature(entry) {
  return JSON.stringify([
    entry.plan.draft.rows,
    entry.warp,
    entry.weft,
    entry.plan.motif?.map ?? [],
  ]);
}
export function variationAvailable(entry) {
  return !!entry?.metadata?.analysis;
}
// A candidate has its own archive container. Existing snapshots and yarn arrays
// are only read; no live append or storage write happens during exploration.
export function prepareVariation(
  archive,
  source,
  {
    seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0],
    length = 2.4,
    previous = null,
  } = {},
) {
  if (source !== archive.entries.at(-1) || !variationAvailable(source))
    throw new Error(
      "Another weave is available for the latest new memory only.",
    );
  const original = weaveSignature(source),
    last = previous && weaveSignature(previous.entry);
  for (let attempt = 0; attempt < 6; attempt++) {
    const designSeed = (seed + Math.imul(attempt, 2654435761)) >>> 0;
    const input = {
      kind: "yarn-dye-palette",
      palette: source.palette.map((c) => ({ ...c, rgb: c.rgb.slice() })),
      analysis: { ...source.metadata.analysis },
      designSeed,
      derivedFrom: source.metadata.memoryId ?? source.plan.id,
    };
    const candidateArchive = new RugArchive().restore(archive.entries);
    const entry = candidateArchive.append(input, length, null, {
      analysis: input.analysis,
      derivedFrom: input.derivedFrom,
    });
    const signature = weaveSignature(entry);
    if (signature !== original && signature !== last)
      return {
        archive: candidateArchive,
        entry,
        input,
        source,
        tail: archive.length,
      };
  }
  throw new Error("No different weave was found. Try again.");
}
export function currentCandidate(candidate, archive) {
  return (
    !!candidate &&
    candidate.source === archive.entries.at(-1) &&
    candidate.tail === archive.length
  );
}
