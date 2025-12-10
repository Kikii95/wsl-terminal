import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tab, PaneNode } from "@/types/terminal";

interface SavedTab {
  title: string;
  shell: string;
  distro?: string;
  color?: string;
}

interface SavedPane {
  tabIndex: number;
  root: PaneNode;
}

interface Session {
  tabs: SavedTab[];
  panes: SavedPane[];
  activeTabIndex: number;
  savedAt: number;
}

interface SessionState {
  enabled: boolean;
  lastSession: Session | null;

  setEnabled: (enabled: boolean) => void;
  saveSession: (tabs: Tab[], panes: Record<string, { root: PaneNode }>, activeTabId: string | null) => void;
  clearSession: () => void;
  getLastSession: () => Session | null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      enabled: true,
      lastSession: null,

      setEnabled: (enabled) => set({ enabled }),

      saveSession: (tabs, panes, activeTabId) => {
        if (!get().enabled || tabs.length === 0) {
          return;
        }

        const savedTabs: SavedTab[] = tabs.map((tab) => ({
          title: tab.title,
          shell: tab.shell,
          distro: tab.distro,
          color: tab.color,
        }));

        const savedPanes: SavedPane[] = tabs
          .map((tab, index) => {
            const pane = panes[tab.id];
            if (pane) {
              return {
                tabIndex: index,
                root: pane.root,
              };
            }
            return null;
          })
          .filter((p): p is SavedPane => p !== null);

        const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId);

        set({
          lastSession: {
            tabs: savedTabs,
            panes: savedPanes,
            activeTabIndex: activeTabIndex >= 0 ? activeTabIndex : 0,
            savedAt: Date.now(),
          },
        });
      },

      clearSession: () => set({ lastSession: null }),

      getLastSession: () => get().lastSession,
    }),
    {
      name: "wsl-terminal-session",
      version: 1,
    }
  )
);
