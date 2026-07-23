"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VisionView from "@/components/Vision";
import MindPanel from "@/components/MindPanel";
import {
  boot,
  teach as teachMind,
  think as thinkMind,
  usingSidecar,
} from "@/lib/engine";
import { maturity as computeMaturity } from "@/lib/mind/maturity";
import type { MindState, TurnView } from "@/lib/mind/types";

export default function Page() {
  const mind = useRef<MindState | null>(null);
  const [turn, setTurn] = useState<TurnView | null>(null);
  const [version, setVersion] = useState(0); // bump to re-read the mind for the panel
  const [thinking, setThinking] = useState(true);
  const [literal, setLiteral] = useState("");
  const [emotional, setEmotional] = useState("");
  const started = useRef(false);

  // The mind wakes and forms its first thought the moment the page opens.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      mind.current = boot();
      const view = await thinkMind(mind.current);
      setTurn(view);
      setVersion((v) => v + 1);
      setThinking(false);
    })();
  }, []);

  const offer = useCallback(async () => {
    if (thinking || !mind.current) return;
    if (!literal.trim() && !emotional.trim()) return;
    setThinking(true);
    const view = await teachMind(mind.current, { literal, emotional });
    setLiteral("");
    setEmotional("");
    setVersion((v) => v + 1);
    // Let the previous image fade before the new thought appears.
    setTimeout(() => {
      setTurn(view);
      setThinking(false);
    }, 500);
  }, [literal, emotional, thinking]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) offer();
  };

  const panel = useMemo(() => {
    const m = mind.current;
    void version; // recompute when the mind changes
    if (!m) return { concepts: [], maturity: null, turns: 0 };
    return {
      concepts: Object.values(m.concepts),
      maturity: computeMaturity(m),
      turns: m.turns,
    };
  }, [version]);

  return (
    <main className="stage" data-busy={thinking}>
      <section className="center">
        <div className={`mode${usingSidecar() ? " live" : ""}`}>
          {usingSidecar() ? "live · llm faculty" : "local faculty"}
        </div>

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

      <MindPanel
        concepts={panel.concepts}
        maturity={panel.maturity}
        turns={panel.turns}
      />
    </main>
  );
}
