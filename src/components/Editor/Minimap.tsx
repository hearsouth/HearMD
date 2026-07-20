import { useRef, useEffect, useCallback } from "react";

interface MinimapProps {
  content: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  onScrollTo: (ratio: number) => void;
}

export function Minimap({ content, scrollTop, scrollHeight, clientHeight, onScrollTo }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // ── Direct DOM update for smooth indicator ──
  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const ratio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    const viewRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1;
    indicator.style.top = `${ratio * 100}%`;
    indicator.style.height = `${Math.max(8, viewRatio * 100)}%`;
  }, [scrollTop, scrollHeight, clientHeight]);

  // ── Render minimap canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const lines = content.split("\n");
    const lineHeight = 2.5;
    const maxLines = Math.floor(h / lineHeight);
    const visibleLines = Math.min(lines.length, maxLines);

    for (let i = 0; i < visibleLines; i++) {
      const line = lines[i];
      const y = i * lineHeight;
      const trimmed = line.trimStart();

      if (trimmed.startsWith("# ")) {
        ctx.fillStyle = "#888"; ctx.globalAlpha = 0.8;
        ctx.fillRect(6, y, w - 12, lineHeight);
      } else if (trimmed.startsWith("## ")) {
        ctx.fillStyle = "#888"; ctx.globalAlpha = 0.6;
        ctx.fillRect(10, y, w - 20, lineHeight);
      } else if (trimmed.startsWith("### ")) {
        ctx.fillStyle = "#888"; ctx.globalAlpha = 0.45;
        ctx.fillRect(14, y, w - 28, lineHeight);
      } else if (trimmed.startsWith("```")) {
        ctx.fillStyle = "#666"; ctx.globalAlpha = 0.3;
        ctx.fillRect(6, y, w - 12, lineHeight);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("1.")) {
        ctx.fillStyle = "#777"; ctx.globalAlpha = 0.35;
        ctx.fillRect(12, y, Math.min(w - 24, (trimmed.length - 2) * 1.2), lineHeight);
      } else if (trimmed.startsWith("> ")) {
        ctx.fillStyle = "#666"; ctx.globalAlpha = 0.3;
        ctx.fillRect(8, y, Math.min(w - 16, trimmed.length * 1.0), lineHeight);
      } else if (trimmed === "---") {
        ctx.fillStyle = "#666"; ctx.globalAlpha = 0.25;
        ctx.fillRect(4, y, w - 8, 1);
      } else if (trimmed.length > 0) {
        ctx.fillStyle = "#777"; ctx.globalAlpha = 0.25;
        ctx.fillRect(6, y, Math.min(w - 12, trimmed.length * 1.1), lineHeight);
      }
    }
    ctx.globalAlpha = 1;
  }, [content]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    onScrollTo(Math.max(0, Math.min(1, ratio)));
    e.preventDefault();
  }, [onScrollTo]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    onScrollTo(Math.max(0, Math.min(1, ratio)));
  }, [onScrollTo]);

  useEffect(() => {
    const up = () => { isDragging.current = false; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  return (
    <div
      style={{
        width: "56px", height: "100%", position: "relative", cursor: "pointer",
        background: "var(--bg-tertiary)", borderLeft: "1px solid var(--border-secondary)",
        overflow: "hidden", flexShrink: 0,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", opacity: 0.7 }} />
      <div
        ref={indicatorRef}
        style={{
          position: "absolute",
          top: "0%", left: 0, right: 0,
          height: "100%", minHeight: "12px",
          background: "var(--color-accent)",
          opacity: 0.12,
          borderRadius: "2px",
          border: "1px solid var(--color-accent)",
          // GPU-accelerated, no layout thrashing
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      />
    </div>
  );
}
