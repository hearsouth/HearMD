import { useEditorStore } from "@/stores/editor.store";
import { useI18nStore } from "@/stores/i18n.store";

const modeKeys: Record<string, "mode.wysiwyg" | "mode.source" | "mode.split"> = {
  wysiwyg: "mode.wysiwyg",
  source: "mode.source",
  split: "mode.split",
};

export function StatusBar() {
  const { mode, activeTab, wordCount, charCount } = useEditorStore();
  const { t } = useI18nStore();
  const tab = activeTab();

  return (
    <div style={{
      flexShrink: 0, height: "24px", display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 14px",
      fontSize: "11px", fontWeight: 450, lineHeight: "24px",
      background: "var(--bg-secondary)", borderTop: "1px solid var(--border-secondary)",
      color: "var(--text-tertiary)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      letterSpacing: "0.01em",
      contain: "layout style",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span>{tab?.name ?? "—"}</span>
        {tab?.isModified && (
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
        )}
      </span>
      <span style={{ display: "flex", gap: "16px" }}>
        <span>{wordCount()} {t("status.words")}</span>
        <span>{charCount()} {t("status.chars")}</span>
        <span>{t(modeKeys[mode] || "mode.wysiwyg")}</span>
      </span>
    </div>
  );
}
