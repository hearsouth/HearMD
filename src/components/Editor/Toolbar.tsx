import { useCallback } from "react";
import { useEditorStore, EditorMode } from "@/stores/editor.store";
import { useI18nStore } from "@/stores/i18n.store";
import { getCurrentWindow } from "@tauri-apps/api/window";

const MODE_ICONS: Record<EditorMode, { path: string; viewBox: string }> = {
  wysiwyg: { viewBox: "0 0 24 24", path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
  source: { viewBox: "0 0 24 24", path: "M16 18l6-6-6-6 M8 6l-6 6 6 6" },
  split: { viewBox: "0 0 24 24", path: "M3 3h18v18H3z M12 3v18" },
};

interface ToolbarProps {
  onSettings: () => void;
}

export function Toolbar({ onSettings }: ToolbarProps) {
  const { mode, setMode, sidebarOpen } = useEditorStore();
  const { t } = useI18nStore();

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    try { await getCurrentWindow().startDragging(); } catch {}
  }, []);

  const iconBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "28px", height: "28px", borderRadius: "6px",
    border: "none", cursor: "pointer", background: "transparent",
    color: "var(--text-tertiary)", transition: "all 0.15s", flexShrink: 0,
  };
  const hover = (e: React.MouseEvent, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = enter ? "var(--bg-hover)" : "transparent";
    el.style.color = enter ? "var(--text-primary)" : "var(--text-tertiary)";
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      style={{
        flexShrink: 0, height: "44px", display: "flex", alignItems: "center",
        background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        contain: "layout style",
      }}
    >
      {/* Left: sidebar toggle only */}
      <div style={{ display: "flex", alignItems: "center", height: "100%", paddingLeft: "72px", flexShrink: 0 }}>
        <button onClick={() => useEditorStore.getState().toggleSidebar()} style={iconBtn}
          title={sidebarOpen ? t("sidebar.collapse") : t("sidebar.expand")}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      </div>

      {/* Center: title */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {t("app.title")}
        </span>
      </div>

      {/* Right: mode + settings */}
      <div style={{ display: "flex", alignItems: "center", height: "100%", paddingRight: "12px", gap: "6px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "1px", padding: "2px", background: "var(--bg-tertiary)", borderRadius: "7px" }}>
          {(Object.keys(MODE_ICONS) as EditorMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              ...iconBtn, width: "26px", height: "26px", borderRadius: "5px",
              background: mode === m ? "var(--bg-elevated)" : "transparent",
              color: mode === m ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: mode === m ? "var(--shadow-sm)" : "none",
            }} title={t(`mode.${m}`)}>
              <svg width="13" height="13" viewBox={MODE_ICONS[m].viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={MODE_ICONS[m].path} /></svg>
            </button>
          ))}
        </div>
        <div style={{ width: "1px", height: "16px", background: "var(--border-primary)" }} />
        <button onClick={onSettings} style={iconBtn} title={t("settings.title") + " (⌘,)"}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
