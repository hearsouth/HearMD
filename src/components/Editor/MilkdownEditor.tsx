import { useEffect, useRef, useState, useCallback } from "react";
import { Editor, rootCtx, defaultValueCtx, parserCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { math } from "@milkdown/plugin-math";
import { useEditorStore } from "@/stores/editor.store";
import { Minimap } from "./Minimap";

// KaTeX CSS
import "katex/dist/katex.min.css";

interface MilkdownEditorProps {
  tabId?: string;
  initialMarkdown?: string;
}

export function MilkdownEditor({ tabId, initialMarkdown }: MilkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const skipListener = useRef(true);
  const listenersRef = useRef<Array<() => void>>([]);

  const updateTab = useEditorStore((s) => s.updateTab);
  const minimapOpen = useEditorStore((s) => s.minimapOpen);
  const scrollToLine = useEditorStore((s) => s.scrollToLine);
  const setScrollToLine = useEditorStore((s) => s.setScrollToLine);
  const activeTab = useEditorStore((s) => s.activeTab());
  const content = activeTab?.content ?? "";

  const [scrollState, setScrollState] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
  const scrollRaf = useRef(0);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      setScrollState({ scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, tabId]);

  // ── Scroll to heading when outline item is clicked ──
  useEffect(() => {
    if (scrollToLine === null) return;
    const editorView = (editorRef.current as any)?.ctx?.get?.("editorView");
    if (!editorView?.state) return;

    const { state } = editorView;
    const content = state.doc.textContent;
    const lines = content.split("\n");

    // Calculate character position of the target line
    let charPos = 0;
    for (let i = 0; i < scrollToLine && i < lines.length; i++) {
      charPos += lines[i].length + 1; // +1 for newline
    }

    // Find the ProseMirror position (which accounts for node boundaries)
    let pmPos = 0;
    let charCount = 0;
    state.doc.descendants((node: any, pos: number) => {
      if (pmPos > 0) return false; // already found
      if (node.isText) {
        if (charCount + node.text.length >= charPos) {
          pmPos = pos + (charPos - charCount);
          return false;
        }
        charCount += node.text.length;
      } else if (node.isBlock && charCount < charPos) {
        // Block boundaries count as newlines
        charCount += 1;
      }
      return true;
    });

    if (pmPos > 0) {
      // Scroll the editor to the heading position
      const scrollArea = scrollRef.current;
      if (scrollArea) {
        // Find the DOM node at this position
        const dom = editorView.domAtPos(pmPos);
        if (dom.node) {
          const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    }

    // Reset after scrolling
    setScrollToLine(null);
  }, [scrollToLine, setScrollToLine]);

  const handleMinimapScrollTo = useCallback((ratio: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = ratio * el.scrollHeight;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !tabId) return;

    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }
    listenersRef.current.forEach((fn) => fn());
    listenersRef.current = [];

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const editorContent = initialMarkdown ?? "";
    skipListener.current = true;

    // ── Slash menu ──
    const slashMenu = document.createElement("div");
    slashMenu.className = "slash-menu";
    slashMenu.style.cssText = `
      display: none; position: absolute; z-index: 100;
      background: var(--bg-elevated); border: 1px solid var(--border-primary);
      border-radius: 10px; padding: 6px; min-width: 220px;
      box-shadow: var(--shadow-lg); backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      max-height: 280px; overflow-y: auto;
    `;

    const menuItems = [
      { label: "正文", desc: "普通段落", icon: "¶", action: "paragraph" },
      { label: "一级标题", desc: "大标题", icon: "H1", action: "heading1" },
      { label: "二级标题", desc: "中标题", icon: "H2", action: "heading2" },
      { label: "三级标题", desc: "小标题", icon: "H3", action: "heading3" },
      { label: "无序列表", desc: "项目符号列表", icon: "•", action: "bulletList" },
      { label: "有序列表", desc: "编号列表", icon: "1.", action: "orderedList" },
      { label: "引用", desc: "引用块", icon: "❝", action: "blockquote" },
      { label: "代码块", desc: "代码片段", icon: "</>", action: "codeBlock" },
      { label: "分割线", desc: "水平分割线", icon: "—", action: "hr" },
      { label: "数学公式", desc: "LaTeX 行内公式", icon: "∑", action: "mathInline" },
      { label: "公式块", desc: "LaTeX 块级公式", icon: "∫", action: "mathBlock" },
    ];

    let filteredItems = [...menuItems];
    let selectedIndex = 0;

    function renderMenu(filter: string) {
      filteredItems = menuItems.filter(
        (item) => item.label.includes(filter) || item.desc.includes(filter) || item.action.toLowerCase().includes(filter.toLowerCase())
      );
      if (filteredItems.length === 0) { slashMenu.style.display = "none"; return; }
      selectedIndex = 0;
      slashMenu.innerHTML = filteredItems.map((item, i) => `
        <div data-action="${item.action}" data-idx="${i}" style="
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 7px; cursor: pointer;
          background: ${i === selectedIndex ? "var(--bg-hover)" : "transparent"};
          transition: background 0.1s;
        ">
          <span style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
            background: var(--bg-tertiary); border-radius: 6px; font-size: 12px; font-weight: 600;
            color: var(--text-secondary); flex-shrink: 0;">${item.icon}</span>
          <div>
            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">${item.label}</div>
            <div style="font-size: 11px; color: var(--text-tertiary);">${item.desc}</div>
          </div>
        </div>
      `).join("");
      slashMenu.style.display = "block";
    }

    function updateSelection() {
      const items = slashMenu.querySelectorAll("[data-action]");
      items.forEach((item, i) => { (item as HTMLElement).style.background = i === selectedIndex ? "var(--bg-hover)" : "transparent"; });
      const selectedEl = items[selectedIndex] as HTMLElement | undefined;
      if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
    }

    function applyAction(action: string | undefined) {
      const editorView = (editorRef.current as any)?.ctx?.get?.("editorView");
      if (!editorView?.state) return;
      const { state, dispatch } = editorView;
      const { $head } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, $head.pos - 20), $head.pos);
      const slashIdx = textBefore.lastIndexOf("/");
      if (slashIdx < 0) return;
      const deleteFrom = $head.pos - (textBefore.length - slashIdx);
      const tr = state.tr.delete(deleteFrom, $head.pos);
      const nodeType = state.schema.nodes;
      const markType = state.schema.marks;
      let newNode;
      switch (action) {
        case "heading1": newNode = nodeType.heading.create({ level: 1 }); break;
        case "heading2": newNode = nodeType.heading.create({ level: 2 }); break;
        case "heading3": newNode = nodeType.heading.create({ level: 3 }); break;
        case "bulletList": newNode = nodeType.list_item.create(); newNode = nodeType.bullet_list.create(null, newNode); break;
        case "orderedList": newNode = nodeType.list_item.create(); newNode = nodeType.ordered_list.create(null, newNode); break;
        case "blockquote": newNode = nodeType.blockquote.create(); break;
        case "codeBlock": newNode = nodeType.code_block.create(); break;
        case "hr": newNode = nodeType.horizontal_rule.create(); break;
        case "mathInline":
          // Insert inline math placeholder
          if (nodeType.math_inline) {
            newNode = nodeType.math_inline.create();
          } else {
            const pos = tr.mapping.map(deleteFrom);
            tr.insertText("$  $", pos);
            dispatch(tr);
            slashMenu.style.display = "none";
            editorView.focus();
            return;
          }
          break;
        case "mathBlock":
          if (nodeType.math_block) {
            newNode = nodeType.math_block.create();
          } else {
            const pos = tr.mapping.map(deleteFrom);
            tr.insertText("$$\n\n$$", pos);
            dispatch(tr);
            slashMenu.style.display = "none";
            editorView.focus();
            return;
          }
          break;
        default: newNode = nodeType.paragraph.create();
      }
      if (newNode) { const pos = tr.mapping.map(deleteFrom); tr.replaceWith(pos, pos, newNode); dispatch(tr); }
      slashMenu.style.display = "none";
      editorView.focus();
    }

    const onClickMenu = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-action]") as HTMLElement;
      if (target) applyAction(target.dataset.action);
    };
    slashMenu.addEventListener("click", onClickMenu);

    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, container);
        ctx.set(defaultValueCtx, editorContent);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          if (skipListener.current) { skipListener.current = false; return; }
          updateTab(tabId, { content: markdown, isModified: true });
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(math)
      .create()
      .then((editor) => {
        editorRef.current = editor;
        // Expose editor view globally for search panel
        requestAnimationFrame(() => {
          const editorView = (editor as any)?.ctx?.get?.("editorView");
          if (editorView) {
            (window as any).__hearmd_editor_view = editorView;
          }
        });
        requestAnimationFrame(() => {
          const pm = container.querySelector(".ProseMirror") as HTMLElement;
          if (!pm) return;
          pm.focus();
          const scrollArea = container.closest(".editor-scroll-area");
          if (scrollArea) scrollArea.appendChild(slashMenu);

          // ── Paste handler ──
          const onPaste = (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData("text/plain");
            if (!text) return;
            const hasMarkdown = /^#+\s|^- |^\* |^\d+\. |```|^> |\*\*|^\| |\$\$|^\$[^$]/m.test(text);
            if (!hasMarkdown) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            const editorView = (editorRef.current as any)?.ctx?.get?.("editorView");
            if (!editorView?.state) return;
            const { state, dispatch } = editorView;
            try {
              const parser = (editorRef.current as any).ctx.get(parserCtx);
              if (parser) {
                const doc = parser(text);
                if (doc) {
                  dispatch(state.tr.replaceSelectionWith(doc));
                  // Sync content to store after paste
                  setTimeout(() => {
                    const ev = (editorRef.current as any)?.ctx?.get?.("editorView");
                    if (ev?.state) {
                      try {
                        const serializer = (editorRef.current as any)?.ctx?.get?.("serializer");
                        if (serializer && tabId) {
                          updateTab(tabId, { content: serializer(ev.state.doc), isModified: true });
                        }
                      } catch {}
                    }
                  }, 50);
                  return;
                }
              }
            } catch {}
            dispatch(state.tr.insertText(text));
          };
          pm.addEventListener("paste", onPaste, true);
          listenersRef.current.push(() => pm.removeEventListener("paste", onPaste, true));

          // ── Slash menu input ──
          const onInput = () => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const node = sel.anchorNode;
            if (!node) return;
            const text = node.textContent || "";
            const cursorPos = sel.anchorOffset;
            if (text[cursorPos - 1] === "/") {
              requestAnimationFrame(() => {
                const sel2 = window.getSelection();
                if (!sel2 || sel2.rangeCount === 0) return;
                const range = sel2.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const scrollRect = scrollArea?.getBoundingClientRect();
                if (scrollRect && rect.width > 0) {
                  slashMenu.style.left = `${rect.left - scrollRect.left}px`;
                  slashMenu.style.top = `${rect.bottom - scrollRect.top + 4}px`;
                }
                renderMenu("");
              });
            } else {
              const slashIndex = text.lastIndexOf("/");
              if (slashIndex >= 0 && slashIndex < cursorPos) renderMenu(text.slice(slashIndex + 1, cursorPos));
              else slashMenu.style.display = "none";
            }
          };
          pm.addEventListener("input", onInput);
          listenersRef.current.push(() => pm.removeEventListener("input", onInput));

          // ── Keyboard ──
          const onKeyDown = (e: KeyboardEvent) => {
            if (slashMenu.style.display !== "none") {
              if (e.key === "ArrowDown") { e.preventDefault(); selectedIndex = (selectedIndex + 1) % filteredItems.length; updateSelection(); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length; updateSelection(); return; }
              if (e.key === "Enter") { e.preventDefault(); if (filteredItems[selectedIndex]) applyAction(filteredItems[selectedIndex].action); return; }
              if (e.key === "Escape") { slashMenu.style.display = "none"; return; }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              const editorView = (editorRef.current as any)?.ctx?.get?.("editorView");
              if (!editorView) return;
              const { state, dispatch } = editorView;
              const { $head } = state.selection;
              let depth = $head.depth;
              while (depth > 0) {
                if ($head.node(depth).type.name === "heading") {
                  e.preventDefault(); e.stopPropagation();
                  const tr = state.tr.split($head.pos);
                  const $new = tr.doc.resolve($head.pos + 1);
                  if ($new.nodeAfter?.type.name === "heading") tr.setNodeMarkup($head.pos + 1, state.schema.nodes.paragraph);
                  dispatch(tr);
                  return;
                }
                depth--;
              }
            }
          };
          pm.addEventListener("keydown", onKeyDown, true);
          listenersRef.current.push(() => pm.removeEventListener("keydown", onKeyDown, true));
        });
      })
      .catch(console.error);

    return () => {
      listenersRef.current.forEach((fn) => fn());
      listenersRef.current = [];
      slashMenu.removeEventListener("click", onClickMenu);
      slashMenu.remove();
      if (editorRef.current) { editorRef.current.destroy(); editorRef.current = null; }
    };
  }, [tabId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div
        ref={scrollRef}
        className="editor-scroll-area"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", cursor: "text", position: "relative" }}
        onClick={() => {
          const pm = containerRef.current?.querySelector(".ProseMirror") as HTMLElement;
          if (pm) pm.focus();
        }}
      >
        <div ref={containerRef} className="editor-prose" />
      </div>
      {minimapOpen && (
        <Minimap content={content} scrollTop={scrollState.scrollTop} scrollHeight={scrollState.scrollHeight} clientHeight={scrollState.clientHeight} onScrollTo={handleMinimapScrollTo} />
      )}
    </div>
  );
}
