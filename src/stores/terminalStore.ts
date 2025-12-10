import { create } from "zustand";
import type { Tab } from "@/types/terminal";

interface TerminalState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (shell?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
}

const generateId = () => crypto.randomUUID();

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (shell = "wsl") => {
    const newTab: Tab = {
      id: generateId(),
      title: shell === "wsl" ? "WSL" : shell,
      shell,
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
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
}));
