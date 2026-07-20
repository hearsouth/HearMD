import { create } from "zustand";

export type EditorMode = "wysiwyg" | "source" | "split";

export interface Tab {
  id: string;
  name: string;
  content: string;
  filePath: string | null;
  isModified: boolean;
}

export interface SearchMatch {
  from: number;
  to: number;
}

export interface FolderSearchResult {
  filePath: string;
  fileName: string;
  line: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

interface EditorState {
  mode: EditorMode;
  tabs: Tab[];
  activeTabId: string | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  outlineOpen: boolean;
  minimapOpen: boolean;
  scrollToLine: number | null;

  // Search state
  searchOpen: boolean;
  searchQuery: string;
  replaceQuery: string;
  searchCaseSensitive: boolean;
  searchRegex: boolean;
  searchWholeWord: boolean;
  searchMatches: SearchMatch[];
  searchCurrentIndex: number;
  folderSearchOpen: boolean;
  folderSearchQuery: string;
  folderSearchResults: FolderSearchResult[];
  folderSearchLoading: boolean;

  setMode: (mode: EditorMode) => void;
  addTab: (tab: Tab) => void;
  switchTab: (id: string) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, update: Partial<Tab>) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleOutline: () => void;
  toggleMinimap: () => void;
  setScrollToLine: (line: number | null) => void;

  // Search actions
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  setReplaceQuery: (q: string) => void;
  setSearchCaseSensitive: (v: boolean) => void;
  setSearchRegex: (v: boolean) => void;
  setSearchWholeWord: (v: boolean) => void;
  setSearchMatches: (matches: SearchMatch[]) => void;
  setSearchCurrentIndex: (i: number) => void;
  searchNext: () => void;
  searchPrev: () => void;
  openFolderSearch: () => void;
  closeFolderSearch: () => void;
  setFolderSearchQuery: (q: string) => void;
  setFolderSearchResults: (results: FolderSearchResult[]) => void;
  setFolderSearchLoading: (v: boolean) => void;

  // Computed helpers
  activeTab: () => Tab | null;
  wordCount: () => number;
  charCount: () => number;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  mode: "wysiwyg",
  tabs: [],
  activeTabId: null,
  sidebarOpen: true,
  sidebarWidth: 260,
  outlineOpen: false,
  minimapOpen: false,
  scrollToLine: null,

  // Search defaults
  searchOpen: false,
  searchQuery: "",
  replaceQuery: "",
  searchCaseSensitive: false,
  searchRegex: false,
  searchWholeWord: false,
  searchMatches: [],
  searchCurrentIndex: -1,
  folderSearchOpen: false,
  folderSearchQuery: "",
  folderSearchResults: [],
  folderSearchLoading: false,

  setMode: (mode) => set({ mode }),

  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
    })),

  switchTab: (id) =>
    set((s) => {
      if (s.tabs.find((t) => t.id === id)) {
        return { activeTabId: id };
      }
      return {};
    }),

  closeTab: (id) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const nextTabs = s.tabs.filter((t) => t.id !== id);
      if (nextTabs.length === 0) return { tabs: [], activeTabId: null };
      if (s.activeTabId === id) {
        const next = nextTabs[Math.min(idx, nextTabs.length - 1)];
        return { tabs: nextTabs, activeTabId: next.id };
      }
      return { tabs: nextTabs };
    }),

  updateTab: (id, update) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...update } : t)),
    })),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(400, width)) }),
  toggleOutline: () => set((s) => ({ outlineOpen: !s.outlineOpen })),
  toggleMinimap: () => set((s) => ({ minimapOpen: !s.minimapOpen })),
  setScrollToLine: (line) => set({ scrollToLine: line }),

  // Search actions
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: "", replaceQuery: "", searchMatches: [], searchCurrentIndex: -1 }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setReplaceQuery: (q) => set({ replaceQuery: q }),
  setSearchCaseSensitive: (v) => set({ searchCaseSensitive: v }),
  setSearchRegex: (v) => set({ searchRegex: v }),
  setSearchWholeWord: (v) => set({ searchWholeWord: v }),
  setSearchMatches: (matches) => set({ searchMatches: matches }),
  setSearchCurrentIndex: (i) => set({ searchCurrentIndex: i }),
  searchNext: () => set((s) => {
    if (s.searchMatches.length === 0) return {};
    return { searchCurrentIndex: (s.searchCurrentIndex + 1) % s.searchMatches.length };
  }),
  searchPrev: () => set((s) => {
    if (s.searchMatches.length === 0) return {};
    return { searchCurrentIndex: (s.searchCurrentIndex - 1 + s.searchMatches.length) % s.searchMatches.length };
  }),
  openFolderSearch: () => set({ folderSearchOpen: true }),
  closeFolderSearch: () => set({ folderSearchOpen: false, folderSearchQuery: "", folderSearchResults: [] }),
  setFolderSearchQuery: (q) => set({ folderSearchQuery: q }),
  setFolderSearchResults: (results) => set({ folderSearchResults: results }),
  setFolderSearchLoading: (v) => set({ folderSearchLoading: v }),

  activeTab: () => {
    const s = get();
    return s.tabs.find((t) => t.id === s.activeTabId) ?? null;
  },
  wordCount: () => {
    const tab = get().activeTab();
    if (!tab) return 0;
    const text = tab.content.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  },
  charCount: () => {
    const tab = get().activeTab();
    if (!tab) return 0;
    return tab.content.length;
  },
}));
