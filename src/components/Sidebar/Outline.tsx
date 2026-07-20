import { useEditorStore } from "@/stores/editor.store";
import { useI18nStore } from "@/stores/i18n.store";
import { useMemo, useCallback } from "react";

interface OutlineItem {
  level: number;
  text: string;
  line: number;
}

export function Outline() {
  const activeTab = useEditorStore((s) => s.activeTab());
  const content = activeTab?.content ?? "";
  const setScrollToLine = useEditorStore((s) => s.setScrollToLine);
  const { t } = useI18nStore();

  const headings = useMemo(() => {
    const items: OutlineItem[] = [];
    content.split("\n").forEach((line, i) => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].replace(/[*_`\[\]]/g, ""),
          line: i,
        });
      }
    });
    return items;
  }, [content]);

  const handleClick = useCallback((line: number) => {
    setScrollToLine(line);
  }, [setScrollToLine]);

  if (headings.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{t("outline.empty")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 6px" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px", padding: "0 10px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {t("sidebar.outline")}
      </div>
      {headings.map((h, i) => (
        <button key={i} onClick={() => handleClick(h.line)} style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "4px 10px", fontSize: h.level <= 2 ? "13px" : "12px",
          lineHeight: "20px", borderRadius: "6px", border: "none",
          cursor: "pointer", color: "var(--text-primary)", background: "transparent",
          paddingLeft: `${(h.level - 1) * 12 + 10}px`,
          opacity: h.level > 3 ? 0.65 : 1, fontWeight: h.level === 1 ? 600 : 400,
          transition: "background 0.12s",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={h.text}
        >{h.text}</button>
      ))}
    </div>
  );
}
