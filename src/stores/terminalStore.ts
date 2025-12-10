import { create } from "zustand";
import type { Tab } from "@/types/terminal";

interface TerminalState {
  tabs: Tab[];
  activeTabId: string | null;
  wslDistros: string[];

  // Actions
  addTab: (shell?: string, distro?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabColor: (id: string, color: string) => void;
  setWslDistros: (distros: string[]) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  setTabs: (tabs: Tab[]) => void;
}

const generateId = () => crypto.randomUUID();

const TAB_COLORS = [
  "#f38ba8", // red
  "#a6e3a1", // green
  "#f9e2af", // yellow
  "#89b4fa", // blue
  "#cba6f7", // purple
  "#94e2d5", // teal
  "#fab387", // peach
  "#f5c2e7", // pink
];

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  wslDistros: [],

  addTab: (shell = "wsl", distro?: string) => {
    const { tabs } = get();
    let title = "Terminal";

    if (shell === "wsl") {
      title = distro || "WSL";
    } else if (shell === "powershell") {
      title = "PowerShell";
    } else if (shell === "cmd") {
      title = "CMD";
    }

    const newTab: Tab = {
      id: generateId(),
      title,
      shell,
      distro,
      color: TAB_COLORS[tabs.length % TAB_COLORS.length],
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));

    return newTab.id;
  },

  removeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter((tab) => tab.id !== id);

    let newActiveId = activeTabId;
    if (activeTabId === id) {
      const removedIndex = tabs.findIndex((tab) => tab.id === id);
      if (newTabs.length > 0) {
        newActiveId = newTabs[Math.min(removedIndex, newTabs.length - 1)].id;
      } else {
        newActiveId = null;
      }
    }

    set({
      tabs: newTabs,
      activeTabId: newActiveId,
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateTabTitle: (id: string, title: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, title } : tab
      ),
    }));
  },

  updateTabColor: (id: string, color: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, color } : tab
      ),
    }));
  },

  setWslDistros: (distros: string[]) => {
    set({ wslDistros: distros });
  },

  reorderTabs: (fromIndex: number, toIndex: number) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.tabs.length ||
        toIndex >= state.tabs.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);

      return { tabs: newTabs };
    });
  },

  setTabs: (tabs: Tab[]) => {
    set({ tabs });
  },
}));
