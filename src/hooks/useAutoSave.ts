import { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editor.store";

export function useAutoSave(saveFn: () => Promise<void>) {
  const activeTab = useEditorStore((s) => s.activeTab());
  const isModified = activeTab?.isModified ?? false;
  const filePath = activeTab?.filePath ?? null;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!isModified || !filePath) return;

    timerRef.current = setTimeout(() => {
      saveFn();
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isModified, filePath, saveFn]);
}
