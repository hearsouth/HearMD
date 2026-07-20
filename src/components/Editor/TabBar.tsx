import { Tab } from "@/stores/editor.store";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSwitch, onClose }: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "34px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-secondary)",
        contain: "layout style",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "auto", gap: "1px" }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSwitch(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 12px",
                height: "34px",
                minWidth: "100px",
                maxWidth: "200px",
                cursor: "pointer",
                background: isActive ? "var(--bg-elevated)" : "transparent",
                borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                transition: "all 0.12s",
                fontSize: "12px",
                color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {tab.name}
                {tab.isModified ? " •" : ""}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  fontSize: "14px",
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
