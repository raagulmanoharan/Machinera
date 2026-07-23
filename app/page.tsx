"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { boot, openChild, reply as replyToChild } from "@/lib/engine";
import type { Message, MindState, Vision } from "@/lib/mind/types";

const CHAT_KEY = "machinera:chat:default";

function loadChat(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CHAT_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveChat(msgs: Message[]) {
  try {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
  } catch {}
}

let idc = 0;
const mkId = () => `m${Date.now().toString(36)}_${idc++}`;

export default function Page() {
  const mind = useRef<MindState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const [clock, setClock] = useState("");
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const push = useCallback((msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveChat(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setClock(
      new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    );
    if (started.current) return;
    started.current = true;
    mind.current = boot();
    const existing = loadChat();
    if (existing.length) {
      setMessages(existing);
      return;
    }
    (async () => {
      setThinking(true);
      const spoken = await openChild(mind.current!);
      push({ id: mkId(), from: "child", text: spoken.text, vision: spoken.vision });
      setThinking(false);
    })();
  }, [push]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const grow = () => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || thinking || !mind.current) return;
    setDraft("");
    requestAnimationFrame(grow);
    push({ id: mkId(), from: "parent", text });
    setThinking(true);
    try {
      const spoken = await replyToChild(mind.current, text);
      push({ id: mkId(), from: "child", text: spoken.text, vision: spoken.vision });
    } finally {
      setThinking(false);
    }
  }, [draft, thinking, push]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const lastIsParent = messages.length > 0 && messages[messages.length - 1].from === "parent";

  return (
    <div className="app">
      <div className="statusbar">
        <span className="sb-time">9:41</span>
        <span className="sb-island" />
        <span className="sb-right">
          <svg className="sb-signal" width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0.5" width="3" height="11.5" rx="1" />
          </svg>
          <svg className="sb-wifi" width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
            <path d="M8.5 2C5.4 2 2.6 3.2.6 5.2a1 1 0 0 0 0 1.4 1 1 0 0 0 1.4 0A9 9 0 0 1 8.5 4a9 9 0 0 1 6.5 2.6 1 1 0 0 0 1.4 0 1 1 0 0 0 0-1.4A11.5 11.5 0 0 0 8.5 2Z" />
            <path d="M8.5 6a6 6 0 0 0-4.2 1.7 1 1 0 0 0 0 1.4 1 1 0 0 0 1.4 0A3.7 3.7 0 0 1 8.5 8a3.7 3.7 0 0 1 2.8 1.1 1 1 0 0 0 1.4 0 1 1 0 0 0 0-1.4A6 6 0 0 0 8.5 6Z" />
            <circle cx="8.5" cy="11" r="1.2" />
          </svg>
          <span className="sb-batt">
            <span className="sb-batt-shell">
              <span className="sb-batt-fill" />
            </span>
            <span className="sb-batt-cap" />
          </span>
        </span>
      </div>
      <nav className="nav">
        <div className="nav-back">
          <svg width="11" height="20" viewBox="0 0 12 21" fill="none">
            <path d="M10 2L2 10.5l8 8.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="nav-count">1</span>
        </div>
        <div className="nav-center">
          <div className="nav-avatar" />
          <div className="nav-name">
            machinera
            <svg className="chev" width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="nav-sub">a new mind</div>
        </div>
        <div className="nav-video">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <rect x="2.5" y="6.5" width="12.5" height="11" rx="3.2" stroke="currentColor" strokeWidth="1.9" />
            <path d="M15 10.4l5.2-2.7v8.6L15 13.6" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          </svg>
        </div>
      </nav>

      <div className="thread" ref={scroller}>
        <div className="stamp">
          <b>Today</b> {clock}
        </div>

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const groupStart = !prev || prev.from !== m.from;
          const tail = !next || next.from !== m.from;
          const side = m.from === "parent" ? "me" : "them";
          return (
            <div key={m.id} className={`row ${side} ${groupStart ? "gap" : ""}`}>
              {m.vision && <Photo vision={m.vision} />}
              {m.text && (
                <div className={`bubble ${side} ${tail ? "tail" : ""}`}>{m.text}</div>
              )}
            </div>
          );
        })}

        {thinking && (
          <div className="row them gap">
            <div className="bubble them tail typing">
              <i /> <i /> <i />
            </div>
          </div>
        )}

        {lastIsParent && !thinking && <div className="delivered">Delivered</div>}
      </div>

      <div className="composer">
        <button className="plus" aria-label="attach">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <div className="field-wrap">
          <textarea
            ref={ta}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              grow();
            }}
            onKeyDown={onKey}
            placeholder="message"
            rows={1}
          />
          {draft.trim() && !thinking ? (
            <button className="send" onClick={send} aria-label="send">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M8.5 13.5V4M4.2 8.3L8.5 4l4.3 4.3" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span className="mic" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 9.5v3" />
                  <path d="M7 6v10" />
                  <path d="M11 3.5v15" />
                  <path d="M15 6v10" />
                  <path d="M19 9.5v3" />
                </g>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Photo({ vision }: { vision: Vision }) {
  if (vision.kind === "svg") {
    return <div className="photo" dangerouslySetInnerHTML={{ __html: vision.markup }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="photo" src={vision.dataUrl} alt="" />;
}
