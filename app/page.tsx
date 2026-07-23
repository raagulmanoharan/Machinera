"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boot, openChild, reply as replyToChild } from "@/lib/engine";
import { primeVoice, speak, startListening, stopSpeaking, type Recording } from "@/lib/voice";
import type { MindState, Vision } from "@/lib/mind/types";

export default function Page() {
  const mind = useRef<MindState | null>(null);
  const [text, setText] = useState("");
  const [vision, setVision] = useState<Vision | null>(null);
  const [displayKey, setDisplayKey] = useState(0);
  const [thinking, setThinking] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [draft, setDraft] = useState("");
  const [version, setVersion] = useState(0);
  const started = useRef(false);
  const primed = useRef(false);
  const recRef = useRef<Recording | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const present = useCallback((sp: { text: string; vision?: Vision }) => {
    setText(sp.text);
    setVision(sp.vision ?? null);
    setDisplayKey((k) => k + 1);
    setVersion((v) => v + 1);
    // the mind speaks its words aloud (open-source voice)
    if (sp.text) {
      setSpeaking(true);
      speak(sp.text).finally(() => setSpeaking(false));
    }
  }, []);

  const prime = () => {
    if (!primed.current) {
      primed.current = true;
      primeVoice();
    }
  };

  const grow = () => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  };

  const teachText = useCallback(
    async (t: string) => {
      const s = t.trim();
      if (!s || thinking || !mind.current) return;
      setDraft("");
      requestAnimationFrame(grow);
      setThinking(true);
      stopSpeaking();
      try {
        present(await replyToChild(mind.current, s));
      } finally {
        setThinking(false);
      }
    },
    [thinking, present]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mind.current = boot();
    (async () => {
      present(await openChild(mind.current!));
      setThinking(false);
    })();
  }, [present]);

  // keep the whole field above the on-screen keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () =>
      document.documentElement.style.setProperty("--vh", `${vv.height}px`);
    vv.addEventListener("resize", onResize);
    onResize();
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const toggleMic = useCallback(async () => {
    prime();
    if (listening) {
      const r = recRef.current;
      recRef.current = null;
      setListening(false);
      if (r) {
        const t = await r.stop();
        if (t) teachText(t);
      }
    } else {
      try {
        stopSpeaking();
        const r = await startListening();
        recRef.current = r;
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }, [listening, teachText]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      teachText(draft);
    }
  };

  const growFactor = useMemo(() => {
    void version;
    const n = mind.current ? Object.keys(mind.current.concepts).length : 0;
    return Math.min(1, Math.sqrt(n / 80));
  }, [version]);

  return (
    <main
      className={`field${thinking ? " is-thinking" : ""}${listening ? " is-listening" : ""}${speaking ? " is-speaking" : ""}${draft.trim() ? " composing" : ""}${vision ? " has-vision" : ""}`}
      style={{ ["--grow" as any]: growFactor.toFixed(3) }}
    >
      <div className="grain" aria-hidden />

      <div className="center">
        <div className="presence">
          <span className="halo a" />
          <span className="halo b" />
          <span className="core" />
          {vision && (
            <div className="dream" key={displayKey}>
              {vision.kind === "svg" ? (
                <div dangerouslySetInnerHTML={{ __html: vision.markup }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vision.dataUrl} alt="" />
              )}
              <span className="dream-warm" />
            </div>
          )}
        </div>

        <p className="utter" key={`u${displayKey}`}>
          {thinking ? "" : text}
        </p>
      </div>

      <div className="composer">
        <div className="inbox">
          <textarea
            ref={ta}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              grow();
            }}
            onKeyDown={onKey}
            onFocus={prime}
            placeholder={listening ? "listening…" : "tell it what you see"}
            rows={1}
          />
          {draft.trim() && (
            <button className="send" onClick={() => teachText(draft)} aria-label="tell it" type="button">
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                <path d="M9 14V4M4.5 8.5 9 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <button
          className={`mic${listening ? " on" : ""}`}
          onClick={toggleMic}
          aria-label={listening ? "stop" : "speak to it"}
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </main>
  );
}
