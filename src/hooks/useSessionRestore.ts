import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTerminalStore } from "@/stores/terminalStore";
import { usePaneStore } from "@/stores/paneStore";
import { useSessionStore } from "@/stores/sessionStore";

export function useSessionRestore() {
  const { tabs, activeTabId, addTab, setActiveTab } = useTerminalStore();
  const { panes } = usePaneStore();
  const { enabled, lastSession, saveSession, clearSession } = useSessionStore();
  const hasRestored = useRef(false);
  const isInitialized = useRef(false);

  // Restore session on mount (only once)
  useEffect(() => {
    if (hasRestored.current || !enabled || !lastSession) {
      return;
    }

    // Check if session is not too old (max 7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - lastSession.savedAt > maxAge) {
      clearSession();
      return;
    }

    // Only restore if no tabs exist yet
    if (tabs.length > 0) {
      return;
    }

    hasRestored.current = true;

    // Restore tabs with cwd
    const restoredTabIds: string[] = [];
    lastSession.tabs.forEach((savedTab) => {
      const tabId = addTab(savedTab.shell, savedTab.distro, savedTab.cwd);
      restoredTabIds.push(tabId);
    });

    // Set active tab
    if (lastSession.activeTabIndex >= 0 && lastSession.activeTabIndex < restoredTabIds.length) {
      setTimeout(() => {
        setActiveTab(restoredTabIds[lastSession.activeTabIndex]);
      }, 100);
    }

    // Clear the session after restore
    clearSession();
  }, [enabled, lastSession, tabs.length, addTab, setActiveTab, clearSession]);

  // Mark as initialized after first tabs are created
  useEffect(() => {
    if (tabs.length > 0 && !isInitialized.current) {
      isInitialized.current = true;
    }
  }, [tabs.length]);

  // Save session on window close
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = () => {
      if (tabs.length > 0 && isInitialized.current) {
        saveSession(tabs, panes, activeTabId);
      }
    };

    // Listen for Tauri window close event
    const unlistenClose = listen("tauri://close-requested", () => {
      handleBeforeUnload();
    });

    // Also handle browser beforeunload (for dev mode)
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unlistenClose.then((fn) => fn());
    };
  }, [enabled, tabs, panes, activeTabId, saveSession]);

  // Auto-save every 30 seconds as backup
  useEffect(() => {
    if (!enabled || !isInitialized.current) {
      return;
    }

    const interval = setInterval(() => {
      if (tabs.length > 0) {
        saveSession(tabs, panes, activeTabId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, tabs, panes, activeTabId, saveSession]);
}
