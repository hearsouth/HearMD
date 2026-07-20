import { useCallback, useEffect, useMemo, useState } from "react";
import { MilkdownEditor } from "@/components/Editor/MilkdownEditor";
import { Toolbar } from "@/components/Editor/Toolbar";
import { StatusBar } from "@/components/Editor/StatusBar";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { TabBar } from "@/components/Editor/TabBar";
import { SettingsModal } from "@/components/Settings/SettingsModal";
import { SearchPanel } from "@/components/Editor/SearchPanel";
import { FolderSearch } from "@/components/Editor/FolderSearch";
import { useEditorStore, Tab } from "@/stores/editor.store";
import { useI18nStore } from "@/stores/i18n.store";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useAutoSave } from "@/hooks/useAutoSave";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";

let tabCounter = 0;
function makeTabId() {
  return "tab_" + Date.now() + "_" + ++tabCounter;
}

export default function App() {
  const store = useEditorStore();
  const { tabs, activeTabId, addTab, switchTab, closeTab, updateTab } = store;
  const toggleSidebar = store.toggleSidebar;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useI18nStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // ── File drop handler ──
  const openFileByPath = useCallback(
    async (filePath: string) => {
      const ext = filePath.split(".").pop()?.toLowerCase();
      if (!ext || !["md", "markdown", "txt"].includes(ext)) return;

      // Check if already open
      const existing = tabs.find((t) => t.filePath === filePath);
      if (existing) {
        switchTab(existing.id);
        return;
      }

      try {
        const text = await readTextFile(filePath);
        const name = filePath.split("/").pop() || "Untitled";
        const id = makeTabId();
        addTab({ id, name, content: text, filePath, isModified: false });
        switchTab(id);
      } catch (err) {
        console.error("Failed to open dropped file:", err);
      }
    },
    [tabs, addTab, switchTab]
  );

  // ── Listen for drag-drop events ──
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow()
      .onDragDropEvent((event) => {
        const type = event.payload.type;
        if (type === "enter" || type === "over") {
          setIsDragging(true);
        } else if (type === "leave") {
          setIsDragging(false);
        } else if (type === "drop") {
          setIsDragging(false);
          const paths = event.payload.paths;
          for (const p of paths) {
            openFileByPath(p);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, [openFileByPath]);

  const handleNewFile = useCallback(() => {
    const id = makeTabId();
    addTab({ id, name: t("untitled"), content: "", filePath: null, isModified: false });
    switchTab(id);
  }, [addTab, switchTab, t]);

  const handleOpenFile = useCallback(
    async (path: string, name: string, text: string) => {
      const existing = tabs.find((t) => t.filePath === path);
      if (existing) {
        switchTab(existing.id);
        return;
      }
      const id = makeTabId();
      addTab({ id, name, content: text, filePath: path, isModified: false });
      switchTab(id);
    },
    [tabs, addTab, switchTab]
  );

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.filePath) {
      try {
        await writeTextFile(activeTab.filePath, activeTab.content);
        updateTab(activeTab.id, { isModified: false });
      } catch (err) {
        console.error("Save failed:", err);
      }
    } else {
      const defaultName = activeTab.name || "Untitled.md";
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (path) {
        try {
          await writeTextFile(path, activeTab.content);
          updateTab(activeTab.id, {
            filePath: path,
            name: path.split("/").pop() || "Untitled",
            isModified: false,
          });
        } catch (err) {
          console.error("Save failed:", err);
        }
      }
    }
  }, [activeTab, updateTab]);

  useAutoSave(handleSave);

  const shortcuts = useMemo(
    () => ({
      "Mod+s": handleSave,
      "Mod+b": toggleSidebar,
      "Mod+,": () => setSettingsOpen(true),
      "Mod+f": () => useEditorStore.getState().openSearch(),
      "Mod+Shift+f": () => useEditorStore.getState().openFolderSearch(),
    }),
    [handleSave, toggleSidebar]
  );
  useKeyboard(shortcuts);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        userSelect: "none",
        background: "transparent",
        position: "relative",
      }}
    >
      <Toolbar onSettings={() => setSettingsOpen(true)} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar onNewFile={handleNewFile} onOpenFile={handleOpenFile} />
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "var(--editor-bg)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {tabs.length > 0 && (
            <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={switchTab} onClose={closeTab} />
          )}

          {activeTab ? (
            <MilkdownEditor tabId={activeTab.id} initialMarkdown={activeTab.content} />
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                <p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
                  {t("empty.hint")}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* ── Search panels ── */}
      <SearchPanel />
      <FolderSearch />

      {/* ── Drag-drop overlay ── */}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(99, 102, 241, 0.08)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: "32px 48px",
              borderRadius: "16px",
              border: "2px dashed var(--color-accent)",
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-lg)",
              textAlign: "center",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: "12px" }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              {t("drop.title")}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
              {t("drop.hint")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
