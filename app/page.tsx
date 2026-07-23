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
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const push = useCallback((msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveChat(next);
      return next;
    });
  }, []);

  // Wake the mind; if the conversation is empty, it speaks first.
  useEffect(() => {
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

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || thinking || !mind.current) return;
    setDraft("");
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

  return (
    <div className="app">
      <header className="bar">
        <span className="dot" />
        <span className="name">machinera</span>
      </header>

      <div className="thread" ref={scroller}>
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {thinking && (
          <div className="msg child">
            <div className="bubble typing">
              <i /> <i /> <i />
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="reply to it…"
          rows={1}
        />
        <button onClick={send} disabled={thinking || !draft.trim()} aria-label="send">
          ↑
        </button>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  return (
    <div className={`msg ${msg.from}`}>
      <div className="bubble">
        {msg.vision && <VisionMedia vision={msg.vision} />}
        {msg.text && <p>{msg.text}</p>}
      </div>
    </div>
  );
}

function VisionMedia({ vision }: { vision: Vision }) {
  if (vision.kind === "svg") {
    return <div className="media" dangerouslySetInnerHTML={{ __html: vision.markup }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="media" src={vision.dataUrl} alt="what it sees" />;
}
