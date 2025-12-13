import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Tab } from "@/types/terminal";

interface DetachedWindow {
  windowId: string;
  tabId: string;
  tab: Tab;
  alwaysOnTop: boolean;
}

interface WindowState {
  detachedWindows: DetachedWindow[];
  isDetachedWindow: boolean;
  detachedTabId: string | null;
  currentWindowId: string | null;

  // Actions
  detachTab: (tab: Tab) => Promise<string>;
  attachTab: (windowId: string, tabId: string) => Promise<void>;
  closeDetachedWindow: (windowId: string) => Promise<void>;
  setAlwaysOnTop: (windowId: string, alwaysOnTop: boolean) => Promise<void>;
  setDetachedMode: (tabId: string, windowId: string) => void;
  addDetachedWindow: (window: DetachedWindow) => void;
  removeDetachedWindow: (windowId: string) => void;
}

export const useWindowStore = create<WindowState>((set) => ({
  detachedWindows: [],
  isDetachedWindow: false,
  detachedTabId: null,
  currentWindowId: null,

  detachTab: async (tab: Tab) => {
    try {
      const windowId = await invoke<string>("create_detached_window", {
        tabId: tab.id,
        title: tab.title,
        shell: tab.shell,
        distro: tab.distro || null,
      });

      const detachedWindow: DetachedWindow = {
        windowId,
        tabId: tab.id,
        tab,
        alwaysOnTop: false,
      };

      set((state) => ({
        detachedWindows: [...state.detachedWindows, detachedWindow],
      }));

      return windowId;
    } catch (error) {
      console.error("Failed to detach tab:", error);
      throw error;
    }
  },

  attachTab: async (windowId: string, tabId: string) => {
    try {
      await invoke("attach_window_to_main", { windowId, tabId });
      set((state) => ({
        detachedWindows: state.detachedWindows.filter((w) => w.windowId !== windowId),
      }));
    } catch (error) {
      console.error("Failed to attach tab:", error);
      throw error;
    }
  },

  closeDetachedWindow: async (windowId: string) => {
    try {
      await invoke("close_detached_window", { windowId });
      set((state) => ({
        detachedWindows: state.detachedWindows.filter((w) => w.windowId !== windowId),
      }));
    } catch (error) {
      console.error("Failed to close detached window:", error);
    }
  },

  setAlwaysOnTop: async (windowId: string, alwaysOnTop: boolean) => {
    try {
      await invoke("set_always_on_top", { alwaysOnTop });
      set((state) => ({
        detachedWindows: state.detachedWindows.map((w) =>
          w.windowId === windowId ? { ...w, alwaysOnTop } : w
        ),
      }));
    } catch (error) {
      console.error("Failed to set always on top:", error);
    }
  },

  setDetachedMode: (tabId: string, windowId: string) => {
    set({
      isDetachedWindow: true,
      detachedTabId: tabId,
      currentWindowId: windowId,
    });
  },

  addDetachedWindow: (window: DetachedWindow) => {
    set((state) => ({
      detachedWindows: [...state.detachedWindows, window],
    }));
  },

  removeDetachedWindow: (windowId: string) => {
    set((state) => ({
      detachedWindows: state.detachedWindows.filter((w) => w.windowId !== windowId),
    }));
  },
}));

// Initialize listener for attach events from detached windows
export function initWindowListeners() {
  listen<{ tabId: string; fromWindow: string }>("attach-tab", (event) => {
    const { fromWindow } = event.payload;
    const windowStore = useWindowStore.getState();

    // Find the detached window info to get tab details
    const detachedWindow = windowStore.detachedWindows.find(w => w.windowId === fromWindow);

    // Remove from detached windows list
    windowStore.removeDetachedWindow(fromWindow);

    // Re-add the tab to the main terminal store
    if (detachedWindow?.tab) {
      // Import dynamically to avoid circular dependency
      import("./terminalStore").then(({ useTerminalStore }) => {
        const terminalStore = useTerminalStore.getState();
        // The tab already exists with its PTY process running, just add it back to the store
        terminalStore.restoreTab(detachedWindow.tab);
      });
    }
  });
}
