// Voice, entirely on open-source models, in the browser — no proprietary cloud
// speech (so, not the Web Speech API). TTS is Kokoro (Apache-2.0) via kokoro-js;
// STT is Whisper (MIT) via @huggingface/transformers. Both packages, their
// weights and their wasm are fetched from public CDNs on first use and then run
// locally, in-browser. Everything degrades to silence if unavailable (offline,
// no mic, unsupported browser).
//
// The imports go through the browser's *native* dynamic import at runtime (built
// via `new Function` so the bundler never sees the specifier). That keeps the
// native-Node backend of these libraries out of the webpack graph — only the
// browser/wasm build is ever loaded, and only in the client.

const cdnImport = (url: string): Promise<any> =>
  (Function("u", "return import(u)") as (u: string) => Promise<any>)(url);

const KOKORO_URL = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm";
const TRANSFORMERS_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/+esm";

let ttsP: Promise<any> | null = null;
async function tts(): Promise<any> {
  if (!ttsP) {
    ttsP = (async () => {
      const { KokoroTTS } = await cdnImport(KOKORO_URL);
      return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: "q8",
      });
    })();
  }
  return ttsP;
}

let current: HTMLAudioElement | null = null;

// Speak text aloud with an open-source voice. Resolves when the audio ends.
export async function speak(text: string): Promise<void> {
  if (!text || typeof window === "undefined") return;
  try {
    const model = await tts();
    const audio = await model.generate(text, { voice: "af_heart" });
    const blob: Blob = audio.toBlob
      ? audio.toBlob()
      : new Blob([audio.toWav()], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    if (current) current.pause();
    const el = new Audio(url);
    current = el;
    await new Promise<void>((resolve) => {
      el.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      el.onerror = () => resolve();
      el.play().catch(() => resolve());
    });
  } catch {
    // no voice available — stay silent
  }
}

export function stopSpeaking(): void {
  if (current) {
    current.pause();
    current = null;
  }
}

// warm the models up (optional) after the first user gesture
export function primeVoice(): void {
  tts().catch(() => {});
  asr().catch(() => {});
}

let asrP: Promise<any> | null = null;
async function asr(): Promise<any> {
  if (!asrP) {
    asrP = (async () => {
      const { pipeline } = await cdnImport(TRANSFORMERS_URL);
      return pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
        dtype: "q8",
      });
    })();
  }
  return asrP;
}

export interface Recording {
  stop: () => Promise<string>;
  cancel: () => void;
}

// Record from the mic; stop() transcribes with Whisper and returns the text.
export async function startListening(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((res) => {
    rec.onstop = () => res();
  });
  rec.start();
  const cleanup = () => stream.getTracks().forEach((t) => t.stop());

  return {
    cancel: () => {
      try {
        rec.stop();
      } catch {}
      cleanup();
    },
    stop: async () => {
      try {
        rec.stop();
      } catch {}
      await stopped;
      cleanup();
      try {
        const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const model = await asr();
        const out = await model(url);
        URL.revokeObjectURL(url);
        return (typeof out?.text === "string" ? out.text : "").trim();
      } catch {
        return "";
      }
    },
  };
}
