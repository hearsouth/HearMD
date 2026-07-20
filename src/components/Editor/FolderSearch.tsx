import { useState, useCallback, useRef, useEffect } from "react";
import { useEditorStore, FolderSearchResult } from "@/stores/editor.store";
import { useI18nStore } from "@/stores/i18n.store";
import { useFileStore } from "@/stores/file.store";
import { readTextFile } from "@tauri-apps/plugin-fs";

type SearchMode = "content" | "filename";

export function FolderSearch() {
  const {
    folderSearchOpen, folderSearchQuery, folderSearchResults, folderSearchLoading,
    setFolderSearchQuery, setFolderSearchResults, setFolderSearchLoading, closeFolderSearch,
  } = useEditorStore();
  const addTab = useEditorStore((s) => s.addTab);
  const switchTab = useEditorStore((s) => s.switchTab);
  const tabs = useEditorStore((s) => s.tabs);
  const files = useFileStore((s) => s.files);
  const { t } = useI18nStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("content");

  useEffect(() => {
    if (folderSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [folderSearchOpen]);

  const getAllFilePaths = useCallback((entries: typeof files): { path: string; name: string }[] => {
    const result: { path: string; name: string }[] = [];
    for (const entry of entries) {
      if (entry.isDir && entry.children) {
        result.push(...getAllFilePaths(entry.children));
      } else if (!entry.isDir) {
        result.push({ path: entry.path, name: entry.name });
      }
    }
    return result;
  }, []);

  const performSearch = useCallback(async () => {
    const query = folderSearchQuery.trim();
    if (!query) {
      setFolderSearchResults([]);
      return;
    }

    setFolderSearchLoading(true);
    const allFiles = getAllFilePaths(files);
    const results: FolderSearchResult[] = [];

    try {
      if (searchMode === "filename") {
        // ── File name search ──
        const pattern = new RegExp(
          query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          caseSensitive ? "" : "i"
        );
        for (const f of allFiles) {
          if (pattern.test(f.name)) {
            results.push({
              filePath: f.path,
              fileName: f.name,
              line: 0,
              text: f.path,
              matchStart: f.name.toLowerCase().indexOf(query.toLowerCase()),
              matchEnd: f.name.toLowerCase().indexOf(query.toLowerCase()) + query.length,
            });
          }
        }
      } else {
        // ── File content search ──
        const pattern = new RegExp(
          query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          caseSensitive ? "g" : "gi"
        );
        for (const f of allFiles) {
          try {
            const text = await readTextFile(f.path);
            const lines = text.split("\n");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              pattern.lastIndex = 0;
              const match = pattern.exec(line);
              if (match) {
                results.push({
                  filePath: f.path,
                  fileName: f.name,
                  line: i + 1,
                  text: line.trim(),
                  matchStart: match.index,
                  matchEnd: match.index + match[0].length,
                });
              }
            }
          } catch {}
        }
      }
    } catch {}

    setFolderSearchResults(results);
    setFolderSearchLoading(false);
  }, [folderSearchQuery, caseSensitive, searchMode, files, getAllFilePaths]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeFolderSearch();
    } else if (e.key === "Enter") {
      performSearch();
    }
  }, [closeFolderSearch, performSearch]);

  const handleResultClick = useCallback(async (result: FolderSearchResult) => {
    const existing = tabs.find((t) => t.filePath === result.filePath);
    if (existing) {
      switchTab(existing.id);
      return;
    }
    try {
      const text = await readTextFile(result.filePath);
      const id = "tab_" + Date.now() + "_fs";
      addTab({ id, name: result.fileName, content: text, filePath: result.filePath, isModified: false });
      switchTab(id);
    } catch {}
  }, [tabs, addTab, switchTab]);

  if (!folderSearchOpen) return null;

  return (
    <div
      style={{
        position: "absolute", top: 0, right: "16px", zIndex: 200,
        background: "var(--bg-elevated)", border: "1px solid var(--border-primary)",
        borderRadius: "0 0 10px 10px", padding: "10px 12px",
        boxShadow: "var(--shadow-lg)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)", minWidth: "420px", maxHeight: "500px",
        display: "flex", flexDirection: "column",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "8px", padding: "2px", background: "var(--bg-tertiary)", borderRadius: "7px" }}>
        <button onClick={() => setSearchMode("content")} style={modeBtn(searchMode === "content")}>{t("search.modeContent")}</button>
        <button onClick={() => setSearchMode("filename")} style={modeBtn(searchMode === "filename")}>{t("search.modeFilename")}</button>
      </div>

      {/* Search input */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <button onClick={() => setCaseSensitive(!caseSensitive)} style={toggleBtn(caseSensitive)} title="Aa">Aa</button>
        <input
          ref={inputRef}
          value={folderSearchQuery}
          onChange={(e) => setFolderSearchQuery(e.target.value)}
          placeholder={searchMode === "content" ? t("search.folderPlaceholder") : t("search.filenamePlaceholder")}
          style={inputStyle}
        />
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)", minWidth: "48px", textAlign: "center" }}>
          {folderSearchResults.length > 0 ? `${folderSearchResults.length}` : ""}
        </span>
        <button onClick={performSearch} style={navBtn} title={t("search.search")}>⌕</button>
        <button onClick={closeFolderSearch} style={navBtn} title="Esc">✕</button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: "400px" }}>
        {folderSearchLoading && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
            {t("search.searching")}
          </div>
        )}

        {!folderSearchLoading && folderSearchResults.length === 0 && folderSearchQuery && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
            {t("search.noResults")}
          </div>
        )}

        {folderSearchResults.map((result, i) => (
          <button
            key={i}
            onClick={() => handleResultClick(result)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "6px 8px", borderRadius: "6px", border: "none",
              cursor: "pointer", background: "transparent",
              transition: "background 0.12s", marginBottom: "2px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ fontSize: "11px", color: "var(--color-accent)", marginBottom: "2px" }}>
              {result.fileName}
              {result.line > 0 && (
                <span style={{ color: "var(--text-tertiary)", marginLeft: "8px" }}>
                  {t("search.line")} {result.line}
                </span>
              )}
            </div>
            <div style={{
              fontSize: "12px", color: "var(--text-secondary)",
              fontFamily: searchMode === "content" ? "var(--font-mono)" : "inherit",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {result.text.slice(0, result.matchStart)}
              <span style={{ background: "var(--color-accent)", color: "white", borderRadius: "2px", padding: "0 2px" }}>
                {result.text.slice(result.matchStart, result.matchEnd)}
              </span>
              {result.text.slice(result.matchEnd)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, height: "26px", padding: "0 8px", fontSize: "12px",
  border: "1px solid var(--border-primary)", borderRadius: "6px",
  background: "var(--bg-tertiary)", color: "var(--text-primary)",
  outline: "none",
};

const toggleBtn = (active: boolean): React.CSSProperties => ({
  width: "26px", height: "26px", borderRadius: "6px", border: "none",
  cursor: "pointer", fontSize: "10px", fontWeight: 600,
  background: active ? "var(--color-accent)" : "var(--bg-tertiary)",
  color: active ? "white" : "var(--text-tertiary)",
  transition: "all 0.12s",
});

const navBtn: React.CSSProperties = {
  width: "26px", height: "26px", borderRadius: "6px", border: "none",
  cursor: "pointer", fontSize: "12px", background: "var(--bg-tertiary)",
  color: "var(--text-secondary)", transition: "all 0.12s",
};

const modeBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, height: "24px", borderRadius: "5px", border: "none",
  cursor: "pointer", fontSize: "11px", fontWeight: 500,
  background: active ? "var(--bg-elevated)" : "transparent",
  color: active ? "var(--text-primary)" : "var(--text-tertiary)",
  boxShadow: active ? "var(--shadow-sm)" : "none",
  transition: "all 0.15s",
});
