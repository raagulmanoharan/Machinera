"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boot, openChild, reply as replyToChild } from "@/lib/engine";
import type { MindState, Vision } from "@/lib/mind/types";

export default function Page() {
  const mind = useRef<MindState | null>(null);
  const [text, setText] = useState("");
  const [vision, setVision] = useState<Vision | null>(null);
  const [displayKey, setDisplayKey] = useState(0);
  const [thinking, setThinking] = useState(true);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState("");
  const [version, setVersion] = useState(0);
  const [voiceOK, setVoiceOK] = useState(false);
  const started = useRef(false);
  const recog = useRef<any>(null);
  const finalRef = useRef("");
  const ta = useRef<HTMLTextAreaElement>(null);

  const present = useCallback((sp: { text: string; vision?: Vision }) => {
    setText(sp.text);
    setVision(sp.vision ?? null);
    setDisplayKey((k) => k + 1);
    setVersion((v) => v + 1);
  }, []);

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

  // voice-first: speak to it, the way you would to a person
  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    setVoiceOK(true);
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      setDraft(s);
      requestAnimationFrame(grow);
      if (e.results[e.results.length - 1].isFinal) finalRef.current = s;
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      const s = finalRef.current.trim();
      finalRef.current = "";
      if (s) teachText(s);
    };
    recog.current = r;
  }, [teachText]);

  const toggleMic = () => {
    const r = recog.current;
    if (!r) return;
    if (listening) r.stop();
    else {
      setDraft("");
      finalRef.current = "";
      setListening(true);
      try {
        r.start();
      } catch {
        setListening(false);
      }
    }
  };

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
      className={`field${thinking ? " is-thinking" : ""}${listening ? " is-listening" : ""}${draft.trim() ? " composing" : ""}${vision ? " has-vision" : ""}`}
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

      <div className={`prompt${draft.trim() ? " has-text" : ""}`}>
        {voiceOK && (
          <button
            className="mic"
            onClick={toggleMic}
            aria-label={listening ? "stop" : "speak"}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="7" y="2" width="6" height="10" rx="3" fill="currentColor" />
              <path d="M4 9a6 6 0 0 0 12 0M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        )}
        <textarea
          ref={ta}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            grow();
          }}
          onKeyDown={onKey}
          placeholder={listening ? "listening…" : "tell it what you see"}
          rows={1}
          autoFocus
        />
        <button
          className="say"
          onClick={() => teachText(draft)}
          disabled={thinking || !draft.trim()}
          aria-label="tell it"
          type="button"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <path d="M9 14V4M4.5 8.5 9 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </main>
  );
}
