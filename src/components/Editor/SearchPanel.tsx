import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/stores/editor.store";
import { useI18nStore } from "@/stores/i18n.store";

export function SearchPanel() {
  const {
    searchOpen, searchQuery, replaceQuery, searchCaseSensitive, searchRegex, searchWholeWord,
    searchMatches, searchCurrentIndex,
    setSearchQuery, setReplaceQuery, setSearchCaseSensitive, setSearchRegex, setSearchWholeWord,
    setSearchMatches, setSearchCurrentIndex, searchNext, searchPrev, closeSearch,
  } = useEditorStore();
  const { t } = useI18nStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [searchOpen]);

  // Search when query changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchMatches([]);
      setSearchCurrentIndex(-1);
      clearHighlights();
      return;
    }
    performSearch();
  }, [searchQuery, searchCaseSensitive, searchRegex, searchWholeWord]);

  const clearHighlights = useCallback(() => {
    const pm = document.querySelector(".ProseMirror");
    if (!pm) return;
    pm.querySelectorAll(".search-highlight").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });
  }, []);

  const performSearch = useCallback(() => {
    const editorView = (window as any).__hearmd_editor_view;
    if (!editorView?.state) return;

    const { state } = editorView;
    const doc = state.doc;
    const text = doc.textContent;
    const query = searchQuery;

    if (!query) {
      setSearchMatches([]);
      setSearchCurrentIndex(-1);
      return;
    }

    const matches: { from: number; to: number }[] = [];
    let pattern: RegExp;

    try {
      const flags = searchCaseSensitive ? "g" : "gi";
      if (searchRegex) {
        pattern = new RegExp(query, flags);
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordBoundary = searchWholeWord ? `\\b${escaped}\\b` : escaped;
        pattern = new RegExp(wordBoundary, flags);
      }

      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({ from: match.index, to: match.index + match[0].length });
        if (match[0].length === 0) pattern.lastIndex++;
      }
    } catch {
      return;
    }

    setSearchMatches(matches);
    setSearchCurrentIndex(matches.length > 0 ? 0 : -1);

    // Scroll to first match
    if (matches.length > 0) {
      scrollToMatch(matches[0]);
    }
  }, [searchQuery, searchCaseSensitive, searchRegex, searchWholeWord]);

  const scrollToMatch = useCallback((match: { from: number; to: number }) => {
    const editorView = (window as any).__hearmd_editor_view;
    if (!editorView?.state) return;

    const { state } = editorView;
    // Convert text offset to ProseMirror position
    let pos = 0;
    let charCount = 0;
    state.doc.descendants((node: any, nodePos: number) => {
      if (pos > 0) return false;
      if (node.isText) {
        if (charCount + node.text.length >= match.from) {
          pos = nodePos + (match.from - charCount);
          return false;
        }
        charCount += node.text.length;
      }
      return true;
    });

    if (pos > 0) {
      try {
        const dom = editorView.domAtPos(pos);
        if (dom.node) {
          const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement;
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {}
    }
  }, []);

  const handleNext = useCallback(() => {
    searchNext();
    const { searchMatches, searchCurrentIndex } = useEditorStore.getState();
    const nextIdx = (searchCurrentIndex + 1) % searchMatches.length;
    if (searchMatches[nextIdx]) scrollToMatch(searchMatches[nextIdx]);
  }, [searchNext]);

  const handlePrev = useCallback(() => {
    searchPrev();
    const { searchMatches, searchCurrentIndex } = useEditorStore.getState();
    const prevIdx = (searchCurrentIndex - 1 + searchMatches.length) % searchMatches.length;
    if (searchMatches[prevIdx]) scrollToMatch(searchMatches[prevIdx]);
  }, [searchPrev]);

  const handleReplace = useCallback(() => {
    const editorView = (window as any).__hearmd_editor_view;
    if (!editorView?.state) return;

    const { state, dispatch } = editorView;
    const { searchMatches, searchCurrentIndex, replaceQuery } = useEditorStore.getState();
    if (searchCurrentIndex < 0 || searchCurrentIndex >= searchMatches.length) return;

    const match = searchMatches[searchCurrentIndex];
    // Convert text positions to ProseMirror positions
    let from = 0, to = 0;
    let charCount = 0;
    state.doc.descendants((node: any, nodePos: number) => {
      if (from > 0 && to > 0) return false;
      if (node.isText) {
        if (charCount + node.text.length > match.from && from === 0) {
          from = nodePos + (match.from - charCount);
        }
        if (charCount + node.text.length >= match.to && to === 0) {
          to = nodePos + (match.to - charCount);
          return false;
        }
        charCount += node.text.length;
      }
      return true;
    });

    if (from > 0 && to > 0) {
      dispatch(state.tr.insertText(replaceQuery, from, to));
      // Re-search after replace
      setTimeout(() => performSearch(), 50);
    }
  }, [performSearch]);

  const handleReplaceAll = useCallback(() => {
    const editorView = (window as any).__hearmd_editor_view;
    if (!editorView?.state) return;

    const { state, dispatch } = editorView;
    const { searchMatches, replaceQuery } = useEditorStore.getState();
    if (searchMatches.length === 0) return;

    let tr = state.tr;
    // Replace from end to start to maintain position validity
    for (let i = searchMatches.length - 1; i >= 0; i--) {
      const match = searchMatches[i];
      let from = 0, to = 0;
      let charCount = 0;
      state.doc.descendants((node: any, nodePos: number) => {
        if (from > 0 && to > 0) return false;
        if (node.isText) {
          if (charCount + node.text.length > match.from && from === 0) {
            from = nodePos + (match.from - charCount);
          }
          if (charCount + node.text.length >= match.to && to === 0) {
            to = nodePos + (match.to - charCount);
            return false;
          }
          charCount += node.text.length;
        }
        return true;
      });
      if (from > 0 && to > 0) {
        tr = tr.insertText(replaceQuery, from, to);
      }
    }
    dispatch(tr);
    setTimeout(() => performSearch(), 50);
  }, [performSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeSearch();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  }, [closeSearch, handleNext, handlePrev]);

  if (!searchOpen) return null;

  const matchText = searchMatches.length > 0
    ? `${searchCurrentIndex + 1}/${searchMatches.length}`
    : searchQuery ? "0/0" : "";

  return (
    <div
      style={{
        position: "absolute", top: 0, right: "16px", zIndex: 200,
        background: "var(--bg-elevated)", border: "1px solid var(--border-primary)",
        borderRadius: "0 0 10px 10px", padding: "10px 12px",
        boxShadow: "var(--shadow-lg)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)", minWidth: "340px",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Search row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        {/* Toggle buttons */}
        <button onClick={() => setSearchCaseSensitive(!searchCaseSensitive)} style={toggleBtn(searchCaseSensitive)} title="Aa">Aa</button>
        <button onClick={() => setSearchRegex(!searchRegex)} style={toggleBtn(searchRegex)} title=".*">.*</button>
        <button onClick={() => setSearchWholeWord(!searchWholeWord)} style={toggleBtn(searchWholeWord)} title="Ab|">Ab</button>

        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          style={inputStyle}
        />

        <span style={{ fontSize: "11px", color: "var(--text-tertiary)", minWidth: "48px", textAlign: "center" }}>
          {matchText}
        </span>

        <button onClick={handlePrev} style={navBtn} title="↑">↑</button>
        <button onClick={handleNext} style={navBtn} title="↓">↓</button>
        <button onClick={closeSearch} style={navBtn} title="Esc">✕</button>
      </div>

      {/* Replace row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "54px" }} /> {/* spacer for toggle buttons */}
        <input
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          placeholder={t("search.replacePlaceholder")}
          style={inputStyle}
        />
        <button onClick={handleReplace} style={actionBtn} title={t("search.replace")}>{t("search.replace")}</button>
        <button onClick={handleReplaceAll} style={actionBtn} title={t("search.replaceAll")}>{t("search.replaceAll")}</button>
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

const actionBtn: React.CSSProperties = {
  height: "26px", padding: "0 10px", borderRadius: "6px", border: "none",
  cursor: "pointer", fontSize: "11px", fontWeight: 500,
  background: "var(--bg-tertiary)", color: "var(--text-secondary)",
  transition: "all 0.12s", whiteSpace: "nowrap",
};
