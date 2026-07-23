import { spawn } from "node:child_process";

// The sidecar's connection to a real LLM. Three interchangeable providers so the
// same faculty runs in this container (the authenticated `claude` CLI) or in
// production (a user's own Anthropic / OpenAI-compatible key). Selected by env.

export interface LLMRequest {
  system: string;
  user: string;
  model?: string;
}

type Provider = "claude-cli" | "anthropic" | "openai";

function provider(): Provider {
  if (process.env.SIDECAR_PROVIDER) return process.env.SIDECAR_PROVIDER as Provider;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY || process.env.SIDECAR_OPENAI_BASE) return "openai";
  return "claude-cli";
}

const DEFAULT_MODEL = process.env.SIDECAR_MODEL || "claude-haiku-4-5-20251001";

export async function callLLM(req: LLMRequest): Promise<string> {
  switch (provider()) {
    case "anthropic":
      return callAnthropic(req);
    case "openai":
      return callOpenAI(req);
    default:
      return callClaudeCLI(req);
  }
}

// --- Provider: the local authenticated Claude Code CLI (this environment) ----
function callClaudeCLI(req: LLMRequest): Promise<string> {
  const model = req.model || DEFAULT_MODEL;
  // spawn with an args array — no shell, so the (possibly large) prompt needs no
  // escaping and cannot be re-interpreted.
  const args = [
    "-p",
    req.user,
    "--append-system-prompt",
    req.system,
    "--model",
    model,
    "--output-format",
    "text",
  ];
  return new Promise((resolve, reject) => {
    const cli = process.env.CLAUDE_CLI_PATH || "/opt/claude-code/bin/claude";
    const child = spawn(cli, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("claude cli timeout"));
    }, 90_000);
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else reject(new Error(`claude cli exited ${code}: ${err.slice(0, 200)}`));
    });
  });
}

// --- Provider: Anthropic Messages API (bring your own key) -------------------
async function callAnthropic(req: LLMRequest): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model || DEFAULT_MODEL,
      max_tokens: 512,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data: any = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

// --- Provider: any OpenAI-compatible chat endpoint ---------------------------
async function callOpenAI(req: LLMRequest): Promise<string> {
  const base = process.env.SIDECAR_OPENAI_BASE || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: req.model || process.env.SIDECAR_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data: any = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// LLMs love to wrap JSON in prose or code fences. Pull the first JSON value out.
export function extractJSON<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/);
  if (start === -1) throw new Error("no JSON in LLM output");
  // Walk to the matching close so trailing prose is ignored.
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === open) depth++;
    else if (body[i] === close) {
      depth--;
      if (depth === 0) return JSON.parse(body.slice(start, i + 1)) as T;
    }
  }
  throw new Error("unbalanced JSON in LLM output");
}
