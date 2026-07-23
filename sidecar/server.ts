import { createServer } from "node:http";
import { spawn } from "node:child_process";
import type { MindState } from "../lib/mind/types";
import { childMessage, integrateLLM } from "./faculty-llm";

const POLL_BASE = process.env.POLLINATIONS_BASE || "https://image.pollinations.ai";

// Fetch an image via curl, which honours the environment's HTTPS_PROXY. Lets the
// sidecar reach the image model even where only the proxy has external egress; a
// browser on a normal network can also call the model directly (see pollinations.ts).
function fetchImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("curl", ["-s", "-L", "--max-time", "120", url], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (d: Buffer) => chunks.push(d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`curl ${code}`))
    );
  });
}

// The sidecar: a small companion service that runs alongside the (static) app and
// gives its Mind a real LLM faculty, while keeping any API key server-side. The
// app talks to it only when NEXT_PUBLIC_SIDECAR_URL is set; otherwise it uses the
// built-in local faculty. Nothing about the core app changes.

const PORT = Number(process.env.PORT || 8787);

const CORS = {
  "access-control-allow-origin": process.env.SIDECAR_ALLOW_ORIGIN || "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function send(res: any, code: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json", ...CORS });
  res.end(json);
}

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c: Buffer) => (data += c.toString()));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, provider: process.env.SIDECAR_PROVIDER || "claude-cli" });
    }

    // Image proxy: browser hits localhost, the sidecar reaches the model.
    if (req.method === "GET" && req.url && req.url.startsWith("/image")) {
      const u = new URL(req.url, "http://localhost");
      const prompt = u.searchParams.get("prompt") || "";
      const seed = u.searchParams.get("seed") || "0";
      const w = u.searchParams.get("w") || "768";
      const h = u.searchParams.get("h") || "768";
      const target =
        `${POLL_BASE}/prompt/${encodeURIComponent(prompt)}` +
        `?width=${w}&height=${h}&nologo=true&seed=${seed}&model=flux`;
      const buf = await fetchImage(target);
      res.writeHead(200, {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=86400",
        ...CORS,
      });
      return res.end(buf);
    }

    // The child's opening message (no learning yet).
    if (req.method === "POST" && req.url === "/open") {
      const { mind } = (await readBody(req)) as { mind: MindState };
      const message = await childMessage(mind, null);
      return send(res, 200, { mind, message });
    }

    // The parent replied: learn from it, then speak again.
    if (req.method === "POST" && req.url === "/reply") {
      const { mind, text } = (await readBody(req)) as { mind: MindState; text: string };
      await integrateLLM(mind, text || "");
      const message = await childMessage(mind, text || "");
      return send(res, 200, { mind, message });
    }

    send(res, 404, { error: "not found" });
  } catch (err: any) {
    console.error("sidecar error:", err?.message || err);
    send(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`Machinera sidecar listening on :${PORT}`);
});
