import { useCallback, useEffect } from "react";
import { useThemeStore, Theme } from "@/stores/theme.store";
import { useEditorStore } from "@/stores/editor.store";
import { useI18nStore, Lang } from "@/stores/i18n.store";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, setTheme } = useThemeStore();
  const { sidebarWidth, setSidebarWidth } = useEditorStore();
  const { lang, setLang, t } = useI18nStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const themes: { key: Theme; label: string }[] = [
    { key: "light", label: t("theme.light") },
    { key: "dark", label: t("theme.dark") },
    { key: "midnight", label: t("theme.midnight") },
  ];

  const langs: { key: Lang; label: string }[] = [
    { key: "en", label: "English" },
    { key: "zh", label: "中文" },
  ];

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid var(--border-secondary)",
  };

  const closeBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: "var(--text-tertiary)",
    transition: "all 0.12s",
  };

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-panel">
        {/* Header */}
        <div className="settings-header">
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("settings.title")}
          </span>
          <button
            onClick={onClose}
            style={closeBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">
          {/* Theme */}
          <div style={row}>
            <div>
              <div className="settings-label">{t("settings.appearance")}</div>
              <div className="settings-desc">{t("settings.appearanceDesc")}</div>
            </div>
            <div style={{ display: "flex", gap: "1px", padding: "2px", background: "var(--bg-tertiary)", borderRadius: "8px" }}>
              {themes.map((th) => (
                <button
                  key={th.key}
                  onClick={() => setTheme(th.key)}
                  style={{
                    padding: "5px 14px", fontSize: "12px", fontWeight: 500,
                    borderRadius: "6px", border: "none", cursor: "pointer",
                    transition: "all 0.15s var(--ease-standard)",
                    background: theme === th.key ? "var(--bg-elevated)" : "transparent",
                    color: theme === th.key ? "var(--text-primary)" : "var(--text-tertiary)",
                    boxShadow: theme === th.key ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div style={row}>
            <div>
              <div className="settings-label">{t("settings.language")}</div>
              <div className="settings-desc">{t("settings.languageDesc")}</div>
            </div>
            <div style={{ display: "flex", gap: "1px", padding: "2px", background: "var(--bg-tertiary)", borderRadius: "8px" }}>
              {langs.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLang(l.key)}
                  style={{
                    padding: "5px 14px", fontSize: "12px", fontWeight: 500,
                    borderRadius: "6px", border: "none", cursor: "pointer",
                    transition: "all 0.15s var(--ease-standard)",
                    background: lang === l.key ? "var(--bg-elevated)" : "transparent",
                    color: lang === l.key ? "var(--text-primary)" : "var(--text-tertiary)",
                    boxShadow: lang === l.key ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Width */}
          <div style={row}>
            <div>
              <div className="settings-label">{t("settings.sidebarWidth")}</div>
              <div className="settings-desc">{sidebarWidth}{t("settings.sidebarWidthDesc")}</div>
            </div>
            <input
              type="range"
              min={180}
              max={400}
              value={sidebarWidth}
              onChange={(e) => setSidebarWidth(Number(e.target.value))}
              style={{ width: "120px", accentColor: "var(--color-accent)", height: "4px" }}
            />
          </div>

          {/* Minimap Toggle */}
          <div style={row}>
            <div>
              <div className="settings-label">{t("settings.minimap")}</div>
              <div className="settings-desc">{t("settings.minimapDesc")}</div>
            </div>
            <button
              onClick={() => useEditorStore.getState().toggleMinimap()}
              style={{
                padding: "5px 14px", fontSize: "12px", fontWeight: 500,
                borderRadius: "6px", border: "none", cursor: "pointer",
                transition: "all 0.15s var(--ease-standard)",
                background: useEditorStore.getState().minimapOpen ? "var(--color-accent)" : "var(--bg-tertiary)",
                color: useEditorStore.getState().minimapOpen ? "white" : "var(--text-tertiary)",
              }}
            >
              {useEditorStore.getState().minimapOpen ? t("settings.on") : t("settings.off")}
            </button>
          </div>

          {/* Shortcuts */}
          <div style={{ ...row, borderBottom: "none" }}>
            <div style={{ width: "100%" }}>
              <div className="settings-label" style={{ marginBottom: "8px" }}>{t("settings.shortcuts")}</div>
              {[
                [t("settings.save"), "⌘ S"],
                [t("settings.toggleSidebar"), "⌘ B"],
                [t("settings.settings"), "⌘ ,"],
              ].map(([label, key]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span>{label}</span>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px", background: "var(--bg-tertiary)", padding: "1px 6px", borderRadius: "4px" }}>{key}</code>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px 0 4px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "var(--text-tertiary)", opacity: 0.5 }}>HearMD {t("settings.version")} 0.1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
