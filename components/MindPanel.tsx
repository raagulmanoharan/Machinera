"use client";

import type { Concept, Maturity } from "@/lib/mind/types";

// The mind laid bare, growing in the periphery — so the parent watches the
// understanding they are building take shape.
export default function MindPanel({
  concepts,
  maturity,
  turns,
}: {
  concepts: Concept[];
  maturity: Maturity | null;
  turns: number;
}) {
  const things = concepts.filter((c) => c.kind === "thing");
  const feelings = concepts.filter((c) => c.kind === "feeling");
  const attributes = concepts.filter((c) => c.kind === "attribute");

  return (
    <aside className="mind">
      <h2>The mind</h2>
      <div className="stage-line">
        {maturity ? maturity.stage : "…"} · {concepts.length}{" "}
        {concepts.length === 1 ? "thing known" : "things known"} · {turns} moments
      </div>
      <div className="meter">
        <span style={{ width: `${Math.round((maturity?.score ?? 0) * 100)}%` }} />
      </div>

      {concepts.length === 0 ? (
        <p className="empty-mind">
          It knows nothing yet. Everything it will ever understand begins with
          what you tell it now.
        </p>
      ) : (
        <>
          <ConceptGroup title="things" items={things} className="" />
          <ConceptGroup title="feelings" items={feelings} className="feeling" />
          <ConceptGroup title="qualities" items={attributes} className="attribute" />
        </>
      )}
    </aside>
  );
}

function ConceptGroup({
  title,
  items,
  className,
}: {
  title: string;
  items: Concept[];
  className: string;
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <div className="concepts">
        {[...items]
          .sort((a, b) => b.vividness - a.vividness)
          .map((c) => (
            <span
              key={c.id}
              className={`chip ${className}`}
              title={c.provenance.join(" · ")}
              style={{ opacity: 0.55 + Math.min(c.vividness, 6) * 0.075 }}
            >
              {c.label}
            </span>
          ))}
      </div>
    </div>
  );
}
