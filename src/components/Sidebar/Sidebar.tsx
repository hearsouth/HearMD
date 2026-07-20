import { useState, useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "@/stores/editor.store";
import { useFileStore, FileEntry } from "@/stores/file.store";
import { useI18nStore } from "@/stores/i18n.store";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, readDir } from "@tauri-apps/plugin-fs";
import { Outline } from "./Outline";

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "26px", height: "26px", borderRadius: "6px",
  border: "none", background: "transparent", cursor: "pointer",
  color: "var(--text-secondary)", transition: "all 0.15s", flexShrink: 0,
};

interface SidebarProps {
  onNewFile?: () => void;
  onOpenFile?: (path: string, name: string, content: string) => void;
}

export function Sidebar({ onNewFile, onOpenFile }: SidebarProps) {
  const { sidebarOpen, sidebarWidth, setSidebarWidth, outlineOpen, toggleOutline } = useEditorStore();
  const { files, setWorkspacePath, setFiles, recentFiles } = useFileStore();
  const { t } = useI18nStore();

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => setSidebarWidth(e.clientX);
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, setSidebarWidth]);

  const readDirRecursive = useCallback(async (dirPath: string): Promise<FileEntry[]> => {
    try {
      const entries = await readDir(dirPath);
      const result: FileEntry[] = [];
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = dirPath + "/" + entry.name;
        if (entry.isDirectory) {
          const children = await readDirRecursive(fullPath);
          result.push({ name: entry.name, path: fullPath, isDir: true, children });
        } else if (entry.name.endsWith(".md") || entry.name.endsWith(".markdown") || entry.name.endsWith(".txt")) {
          result.push({ name: entry.name, path: fullPath, isDir: false });
        }
      }
      result.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return result;
    } catch (err) {
      console.error("Failed to read directory:", err);
      return [];
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;
    setWorkspacePath(selected);
    const fileList = await readDirRecursive(selected);
    setFiles(fileList);
  }, [setWorkspacePath, setFiles, readDirRecursive]);

  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (!selected || typeof selected !== "string") return;
    try {
      const text = await readTextFile(selected);
      const name = selected.split("/").pop() || "Untitled";
      onOpenFile?.(selected, name, text);
      useFileStore.getState().addRecentFile(selected);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [onOpenFile]);

  const handleClickRecent = useCallback(async (path: string) => {
    try {
      const text = await readTextFile(path);
      const name = path.split("/").pop() || "Untitled";
      onOpenFile?.(path, name, text);
    } catch {}
  }, [onOpenFile]);

  const handleClickFile = useCallback(async (file: FileEntry) => {
    if (file.isDir) return;
    try {
      const text = await readTextFile(file.path);
      onOpenFile?.(file.path, file.name, text);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [onOpenFile]);

  // ── Collapsed: nothing rendered (toolbar toggle handles expand) ──
  if (!sidebarOpen) return null;

  // ── Expanded sidebar ──
  return (
    <div ref={sidebarRef} style={{
      width: sidebarWidth, height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg-secondary)", borderRight: "1px solid var(--border-secondary)",
      backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
      flexShrink: 0, position: "relative",
      transition: isResizing ? "none" : "width 0.25s cubic-bezier(0.2, 0, 0, 1)",
      overflow: "hidden",
      // Prevent flicker during window drag
      willChange: "auto",
      contain: "layout style",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "2px",
        padding: "0 8px", height: "38px", flexShrink: 0,
        borderBottom: "1px solid var(--border-secondary)",
        contain: "layout style",
      }}>
        <button onClick={() => onNewFile?.()} style={iconBtn} title={t("sidebar.new")}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button onClick={handleOpenFile} style={iconBtn} title={t("sidebar.open")}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
        <button onClick={handleOpenFolder} style={iconBtn} title={t("sidebar.folder")}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={toggleOutline} style={{
          ...iconBtn, width: "auto", padding: "0 8px", fontSize: "11px", fontWeight: 500,
          color: outlineOpen ? "var(--color-accent)" : "var(--text-tertiary)",
          background: outlineOpen ? "var(--color-accent-soft)" : "transparent",
        }} title={t("sidebar.outline")}
          onMouseEnter={(e) => { if (!outlineOpen) e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = outlineOpen ? "var(--color-accent-soft)" : "transparent"; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          {t("sidebar.outline")}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
        {outlineOpen ? <Outline /> : (
          <>
            {files.length > 0 && (
              <div style={{ padding: "0 6px", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", padding: "0 6px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("sidebar.files")}
                </div>
                {files.map((f) => (
                  <FileTreeItem key={f.path} file={f} depth={0} onClick={handleClickFile} />
                ))}
              </div>
            )}

            {recentFiles.length > 0 && (
              <div style={{ padding: "0 6px", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", padding: "0 6px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("sidebar.recent")}
                </div>
                {recentFiles.map((path) => {
                  const name = path.split("/").pop() || path;
                  return (
                    <button key={path} onClick={() => handleClickRecent(path)} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      width: "100%", textAlign: "left", padding: "5px 8px",
                      fontSize: "13px", lineHeight: "20px", borderRadius: "7px",
                      border: "none", cursor: "pointer", color: "var(--text-primary)",
                      background: "transparent", transition: "background 0.12s",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {files.length === 0 && recentFiles.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.3 }}>📝</div>
                <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: "1.5" }}>{t("sidebar.empty")}</p>
                <p style={{ fontSize: "12px", color: "var(--text-tertiary)", opacity: 0.6, marginTop: "4px" }}>{t("sidebar.emptyHint")}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resize handle */}
      {sidebarOpen && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: "3px", height: "100%",
          cursor: "col-resize", background: isResizing ? "var(--color-accent)" : "transparent",
          opacity: isResizing ? 0.6 : 0, transition: "opacity 0.15s",
        }} onMouseDown={handleMouseDown}
          onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.opacity = "0.3"; }}
          onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.opacity = "0"; }}
        />
      )}
    </div>
  );
}

function FileTreeItem({ file, depth, onClick }: { file: FileEntry; depth: number; onClick: (f: FileEntry) => void }) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (file.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            width: "100%", textAlign: "left", padding: "4px 6px",
            fontSize: "13px", lineHeight: "20px", borderRadius: "6px",
            border: "none", cursor: "pointer", color: "var(--text-primary)",
            background: "transparent", transition: "background 0.12s",
            paddingLeft: `${depth * 14 + 6}px`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize: "10px", opacity: 0.5, transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
        </button>
        {expanded && file.children?.map((child) => (
          <FileTreeItem key={child.path} file={child} depth={depth + 1} onClick={onClick} />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onClick(file)}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        width: "100%", textAlign: "left", padding: "4px 6px",
        fontSize: "13px", lineHeight: "20px", borderRadius: "6px",
        border: "none", cursor: "pointer", color: "var(--text-primary)",
        background: "transparent", transition: "background 0.12s",
        paddingLeft: `${depth * 14 + 22}px`,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
    </button>
  );
}
