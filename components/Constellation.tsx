"use client";

import { useEffect, useRef } from "react";
import type { MindState } from "@/lib/mind/types";

// The mind's world, made visible: everything it has been taught drifts around it
// as a slowly-turning constellation — things, feelings and qualities as stars,
// their connections as faint filaments. It grows denser as the mind learns. This
// is the accumulated relationship, not a scroll of messages.

const COLOR: Record<string, [number, number, number]> = {
  thing: [110, 168, 255], // luminous blue
  feeling: [183, 157, 255], // violet
  attribute: [127, 227, 214], // teal
};

function hash(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 100000) / 100000;
}

export default function Constellation({ mind }: { mind: MindState | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mindRef = useRef<MindState | null>(mind);
  mindRef.current = mind;
  const bornRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0;
    let H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const t = performance.now() / 1000;
      ctx.clearRect(0, 0, W, H);

      const m = mindRef.current;
      const concepts = m ? Object.values(m.concepts) : [];
      const cx = W / 2;
      const cy = H * 0.42;
      const rMax = Math.min(W, H) * 0.62;
      const rot = t * 0.016;

      // positions
      const pos = new Map<string, { x: number; y: number; a: number }>();
      for (const c of concepts) {
        const ang = hash(c.id, 7) * Math.PI * 2 + rot;
        const rad = 118 + hash(c.id, 13) * rMax;
        const bob = Math.sin(t * 0.4 + hash(c.id, 29) * 6.28) * 7;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad * 0.86 + bob;
        pos.set(c.id, { x, y, a: ang });
      }

      // filaments
      if (m) {
        ctx.lineWidth = 0.6;
        for (const e of m.edges) {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > rMax * 0.9) continue;
          const alpha = 0.055 * (1 - d / (rMax * 0.9));
          ctx.strokeStyle = `rgba(150,180,255,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // stars
      for (const c of concepts) {
        const p = pos.get(c.id)!;
        if (!bornRef.current.has(c.id)) bornRef.current.set(c.id, t);
        const age = t - (bornRef.current.get(c.id) as number);
        const ignite = Math.min(age / 1.2, 1); // fade + settle in
        const flash = age < 1.2 ? 1 + (1 - ignite) * 2.2 : 1;

        const [r, g, b] = COLOR[c.kind] || COLOR.thing;
        const vivid = Math.min(c.vividness, 6);
        const core = (1.1 + vivid * 0.28) * flash;
        const glow = core * 4.2;
        const baseA = (0.5 + vivid * 0.07) * ignite;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        grad.addColorStop(0, `rgba(${r},${g},${b},${0.5 * baseA})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${Math.min(r + 60, 255)},${Math.min(g + 50, 255)},255,${baseA})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, core, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="cosmos" aria-hidden />;
}
