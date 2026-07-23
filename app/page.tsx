"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Constellation from "@/components/Constellation";
import { boot, openChild, reply as replyToChild } from "@/lib/engine";
import { maturity } from "@/lib/mind/maturity";
import type { MindState, Vision } from "@/lib/mind/types";

export default function Page() {
  const mind = useRef<MindState | null>(null);
  const [text, setText] = useState("");
  const [vision, setVision] = useState<Vision | null>(null);
  const [displayKey, setDisplayKey] = useState(0);
  const [thinking, setThinking] = useState(true);
  const [draft, setDraft] = useState("");
  const [version, setVersion] = useState(0);
  const started = useRef(false);

  const present = useCallback((spoken: { text: string; vision?: Vision }) => {
    setText(spoken.text);
    setVision(spoken.vision ?? null);
    setDisplayKey((k) => k + 1);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mind.current = boot();
    (async () => {
      const spoken = await openChild(mind.current!);
      present(spoken);
      setThinking(false);
    })();
  }, [present]);

  const teach = useCallback(async () => {
    const t = draft.trim();
    if (!t || thinking || !mind.current) return;
    setDraft("");
    setThinking(true);
    try {
      const spoken = await replyToChild(mind.current, t);
      present(spoken);
    } finally {
      setThinking(false);
    }
  }, [draft, thinking, present]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      teach();
    }
  };

  const meta = useMemo(() => {
    void version;
    const m = mind.current;
    if (!m) return { moment: 0, known: 0, stage: "—" };
    return {
      moment: m.turns,
      known: Object.keys(m.concepts).length,
      stage: maturity(m).stage,
    };
  }, [version]);

  return (
    <main className="stage">
      <Constellation mind={mind.current} />

      <div className="meta">
        <span>machinera</span>
        <span className="dot">·</span>
        <span>moment {String(meta.moment).padStart(3, "0")}</span>
        <span className="dot">·</span>
        <span>{meta.known} known</span>
        <span className="dot">·</span>
        <span>{meta.stage}</span>
      </div>

      <div className={`orb${thinking ? " thinking" : ""}`} />

      <div className="present" key={displayKey}>
        {vision && (
          <div className="vision">
            {vision.kind === "svg" ? (
              <div dangerouslySetInnerHTML={{ __html: vision.markup }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vision.dataUrl} alt="" />
            )}
          </div>
        )}
        <p className="voice">{thinking ? "" : text}</p>
      </div>

      {thinking && (
        <div className="listening">
          <i /> <i /> <i />
        </div>
      )}

      <form
        className="respond"
        onSubmit={(e) => {
          e.preventDefault();
          teach();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="tell it what you see"
          autoFocus
          enterKeyHint="send"
        />
        <button type="submit" className="give" disabled={thinking || !draft.trim()} aria-label="teach">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 14.5V4M4.5 8.5L9 4l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </main>
  );
}
