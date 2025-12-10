import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tab } from "@/types/terminal";

export interface SavedWorkspace {
  id: string;
  name: string;
  savedAt: number;
  tabs: {
    title: string;
    shell: string;
    distro?: string;
    cwd?: string;
    color?: string;
  }[];
}

interface WorkspaceState {
  workspaces: SavedWorkspace[];
  saveWorkspace: (name: string, tabs: Tab[]) => string;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  getWorkspace: (id: string) => SavedWorkspace | undefined;
}

const generateId = () => crypto.randomUUID();

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],

      saveWorkspace: (name: string, tabs: Tab[]) => {
        const id = generateId();
        const workspace: SavedWorkspace = {
          id,
          name,
          savedAt: Date.now(),
          tabs: tabs.map((tab) => ({
            title: tab.title,
            shell: tab.shell,
            distro: tab.distro,
            cwd: tab.cwd,
            color: tab.color,
          })),
        };

        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        }));

        return id;
      },

      deleteWorkspace: (id: string) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
        }));
      },

      renameWorkspace: (id: string, name: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w
          ),
        }));
      },

      getWorkspace: (id: string) => {
        return get().workspaces.find((w) => w.id === id);
      },
    }),
    {
      name: "wsl-terminal-workspaces",
    }
  )
);
