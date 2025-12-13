import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  identityFile?: string;
  lastUsed?: number;
  hasPassword?: boolean; // Indicates if password is stored in keychain
  importedFrom?: "ssh-config"; // Track where connection came from
}

export interface SSHConfigHost {
  name: string;
  host: string;
  user: string | null;
  port: number;
  identity_file: string | null;
}

interface SSHState {
  connections: SSHConnection[];
  addConnection: (conn: Omit<SSHConnection, "id">) => string;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, conn: Partial<SSHConnection>) => void;
  markUsed: (id: string) => void;
  importFromConfig: () => Promise<number>;
  storePassword: (id: string, password: string) => Promise<void>;
  getPassword: (id: string) => Promise<string | null>;
  deletePassword: (id: string) => Promise<void>;
}

export const useSSHStore = create<SSHState>()(
  persist(
    (set, get) => ({
      connections: [],

      addConnection: (conn) => {
        const id = crypto.randomUUID();
        const newConn: SSHConnection = {
          ...conn,
          id,
        };
        set((state) => ({
          connections: [...state.connections, newConn],
        }));
        return id;
      },

      removeConnection: (id) => {
        // Also delete any stored password
        invoke("delete_ssh_credential", { connectionId: id }).catch(() => {});
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

      importFromConfig: async () => {
        try {
          const hosts = await invoke<SSHConfigHost[]>("parse_ssh_config");
          const existingHosts = new Set(get().connections.map(c => `${c.host}:${c.port}`));
          let imported = 0;

          for (const host of hosts) {
            // Skip if already exists
            if (existingHosts.has(`${host.host}:${host.port}`)) {
              continue;
            }

            const conn: Omit<SSHConnection, "id"> = {
              name: host.name,
              host: host.host,
              port: host.port,
              user: host.user || "root",
              identityFile: host.identity_file || undefined,
              importedFrom: "ssh-config",
            };

            get().addConnection(conn);
            imported++;
          }

          return imported;
        } catch (error) {
          console.error("Failed to import SSH config:", error);
          throw error;
        }
      },

      storePassword: async (id: string, password: string) => {
        await invoke("store_ssh_credential", { connectionId: id, password });
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, hasPassword: true } : c
          ),
        }));
      },

      getPassword: async (id: string) => {
        const result = await invoke<string | null>("get_ssh_credential", { connectionId: id });
        return result;
      },

      deletePassword: async (id: string) => {
        await invoke("delete_ssh_credential", { connectionId: id });
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, hasPassword: false } : c
          ),
        }));
      },
    }),
    {
      name: "wsl-terminal-ssh",
    }
  )
);
