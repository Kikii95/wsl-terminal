import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ServiceStatus = "running" | "stopped" | "starting" | "stopping" | "crashed" | "restarting";

export interface ServiceTemplate {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  icon: string;
  category: "dev" | "database" | "container" | "custom";
}

export interface Service {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  status: ServiceStatus;
  pid?: number;
  startedAt?: number;
  restartCount: number;
  autoRestart: boolean;
  maxRestarts: number;
  lastOutput?: string;
  icon?: string;
  category: "dev" | "database" | "container" | "custom";
  cpu?: number;
  memory?: number;
}

interface ServiceState {
  services: Service[];
  templates: ServiceTemplate[];
  autoRestartEnabled: boolean;

  // CRUD
  addService: (service: Omit<Service, "id" | "status" | "restartCount">) => string;
  removeService: (id: string) => void;
  updateService: (id: string, updates: Partial<Service>) => void;

  // Status
  setServiceStatus: (id: string, status: ServiceStatus, pid?: number) => void;
  incrementRestartCount: (id: string) => void;
  resetRestartCount: (id: string) => void;

  // Resource monitoring
  updateResourceUsage: (id: string, cpu: number, memory: number) => void;

  // Templates
  addFromTemplate: (templateId: string, overrides?: Partial<Service>) => string | null;

  // Settings
  setAutoRestartEnabled: (enabled: boolean) => void;

  // Helpers
  getServiceById: (id: string) => Service | undefined;
  getRunningServices: () => Service[];
  getServicesByCategory: (category: Service["category"]) => Service[];
}

const defaultTemplates: ServiceTemplate[] = [
  {
    id: "vite-dev",
    name: "Vite Dev Server",
    command: "pnpm dev",
    icon: "⚡",
    category: "dev",
  },
  {
    id: "next-dev",
    name: "Next.js Dev",
    command: "pnpm dev",
    icon: "▲",
    category: "dev",
  },
  {
    id: "expo-start",
    name: "Expo Start",
    command: "pnpm start",
    icon: "📱",
    category: "dev",
  },
  {
    id: "python-server",
    name: "Python HTTP",
    command: "python -m http.server 8000",
    icon: "🐍",
    category: "dev",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    command: "docker compose up postgres",
    icon: "🐘",
    category: "database",
  },
  {
    id: "redis",
    name: "Redis",
    command: "docker compose up redis",
    icon: "🔴",
    category: "database",
  },
  {
    id: "docker-compose",
    name: "Docker Compose",
    command: "docker compose up",
    icon: "🐳",
    category: "container",
  },
  {
    id: "docker-dev",
    name: "Docker Dev Stack",
    command: "docker compose -f docker-compose.dev.yml up",
    icon: "🐋",
    category: "container",
  },
];

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      services: [],
      templates: defaultTemplates,
      autoRestartEnabled: true,

      addService: (serviceData) => {
        const id = crypto.randomUUID();
        const newService: Service = {
          ...serviceData,
          id,
          status: "stopped",
          restartCount: 0,
        };
        set((state) => ({ services: [...state.services, newService] }));
        return id;
      },

      removeService: (id) => {
        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        }));
      },

      updateService: (id, updates) => {
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      setServiceStatus: (id, status, pid) => {
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status,
                  pid: pid ?? s.pid,
                  startedAt: status === "running" ? Date.now() : s.startedAt,
                }
              : s
          ),
        }));
      },

      incrementRestartCount: (id) => {
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, restartCount: s.restartCount + 1 } : s
          ),
        }));
      },

      resetRestartCount: (id) => {
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, restartCount: 0 } : s
          ),
        }));
      },

      updateResourceUsage: (id, cpu, memory) => {
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, cpu, memory } : s
          ),
        }));
      },

      addFromTemplate: (templateId, overrides = {}) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return null;

        return get().addService({
          name: template.name,
          command: template.command,
          cwd: template.cwd,
          icon: template.icon,
          category: template.category,
          autoRestart: true,
          maxRestarts: 3,
          ...overrides,
        });
      },

      setAutoRestartEnabled: (enabled) => {
        set({ autoRestartEnabled: enabled });
      },

      getServiceById: (id) => {
        return get().services.find((s) => s.id === id);
      },

      getRunningServices: () => {
        return get().services.filter((s) => s.status === "running");
      },

      getServicesByCategory: (category) => {
        return get().services.filter((s) => s.category === category);
      },
    }),
    {
      name: "wsl-terminal-services",
    }
  )
);
