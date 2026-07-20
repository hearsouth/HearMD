import { create } from "zustand";

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
}

interface FileState {
  workspacePath: string | null;
  files: FileEntry[];
  recentFiles: string[];

  setWorkspacePath: (path: string | null) => void;
  setFiles: (files: FileEntry[]) => void;
  addRecentFile: (path: string) => void;
}

export const useFileStore = create<FileState>((set) => ({
  workspacePath: null,
  files: [],
  recentFiles: JSON.parse(localStorage.getItem("hearmd-recent") || "[]"),

  setWorkspacePath: (workspacePath) => set({ workspacePath }),
  setFiles: (files) => set({ files }),

  addRecentFile: (path) =>
    set((state) => {
      const recent = [path, ...state.recentFiles.filter((p) => p !== path)].slice(0, 10);
      localStorage.setItem("hearmd-recent", JSON.stringify(recent));
      return { recentFiles: recent };
    }),
}));
