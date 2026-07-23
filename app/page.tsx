"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VisionView from "@/components/Vision";
import MindPanel from "@/components/MindPanel";
import type { Concept, Maturity, TurnView } from "@/lib/mind/types";

export default function Page() {
  const [turn, setTurn] = useState<TurnView | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [maturity, setMaturity] = useState<Maturity | null>(null);
  const [totalTurns, setTotalTurns] = useState(0);
  const [thinking, setThinking] = useState(true);
  const [literal, setLiteral] = useState("");
  const [emotional, setEmotional] = useState("");
  const started = useRef(false);

  const refreshMind = useCallback(async () => {
    const res = await fetch("/api/mind/state", { cache: "no-store" });
    const data = await res.json();
    setConcepts(data.concepts ?? []);
    setMaturity(data.maturity ?? null);
    setTotalTurns(data.turns ?? 0);
  }, []);

  // The mind forms its first thought the moment the page opens.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const res = await fetch("/api/mind/next", { method: "POST" });
      setTurn(await res.json());
      await refreshMind();
      setThinking(false);
    })();
  }, [refreshMind]);

  const offer = useCallback(async () => {
    if (thinking) return;
    if (!literal.trim() && !emotional.trim()) return;
    setThinking(true);
    const res = await fetch("/api/mind/teach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ literal, emotional }),
    });
    const view = (await res.json()) as TurnView;
    setLiteral("");
    setEmotional("");
    // Let the previous image fade before the new thought appears.
    setTimeout(() => {
      setTurn(view);
      setThinking(false);
    }, 500);
    await refreshMind();
  }, [literal, emotional, thinking, refreshMind]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) offer();
  };

  return (
    <main className="stage">
      <section className="center">
        <VisionView vision={turn?.vision ?? null} thinking={thinking} />

        <div className="voice">
          {turn?.utterance?.length ? turn.utterance.join(" ") : "…"}
        </div>

        <div className="ask" onKeyDown={onKey}>
          <div className="row">
            <div className="field">
              <label>what it is</label>
              <input
                value={literal}
                onChange={(e) => setLiteral(e.target.value)}
                placeholder="name it…"
                autoFocus
              />
            </div>
            <div className="field">
              <label>what it feels like</label>
              <input
                value={emotional}
                onChange={(e) => setEmotional(e.target.value)}
                placeholder="a feeling…"
              />
            </div>
          </div>
          <button
            className="offer"
            onClick={offer}
            disabled={thinking || (!literal.trim() && !emotional.trim())}
          >
            tell it
          </button>
          <p className="hint">
            It only knows what you teach it. Say what a thing is, or how it feels —
            either is enough. ⌘/Ctrl+Enter to tell it.
          </p>
        </div>
      </section>

      <MindPanel concepts={concepts} maturity={maturity} turns={totalTurns} />
    </main>
  );
}
