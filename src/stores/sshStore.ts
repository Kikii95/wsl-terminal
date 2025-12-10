import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  identityFile?: string;
  lastUsed?: number;
}

interface SSHState {
  connections: SSHConnection[];
  addConnection: (conn: Omit<SSHConnection, "id">) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, conn: Partial<SSHConnection>) => void;
  markUsed: (id: string) => void;
}

export const useSSHStore = create<SSHState>()(
  persist(
    (set) => ({
      connections: [],

      addConnection: (conn) => {
        const newConn: SSHConnection = {
          ...conn,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          connections: [...state.connections, newConn],
        }));
      },

      removeConnection: (id) => {
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
        }));
      },

      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      markUsed: (id) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, lastUsed: Date.now() } : c
          ),
        }));
      },
    }),
    {
      name: "wsl-terminal-ssh",
    }
  )
);
