import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Snippet {
  id: string;
  name: string;
  command: string;
  category: string;
  description?: string;
  hotkey?: string;
}

interface SnippetState {
  snippets: Snippet[];
  addSnippet: (snippet: Omit<Snippet, "id">) => void;
  removeSnippet: (id: string) => void;
  updateSnippet: (id: string, updates: Partial<Snippet>) => void;
  reorderSnippets: (fromIndex: number, toIndex: number) => void;
}

const defaultSnippets: Snippet[] = [
  // Git
  { id: "git-status", name: "Git Status", command: "git status", category: "Git" },
  { id: "git-pull", name: "Git Pull", command: "git pull", category: "Git" },
  { id: "git-push", name: "Git Push", command: "git push", category: "Git" },
  { id: "git-diff", name: "Git Diff", command: "git diff", category: "Git" },
  { id: "git-log", name: "Git Log", command: "git log --oneline -10", category: "Git" },
  { id: "git-branch", name: "Git Branch", command: "git branch -a", category: "Git" },

  // Docker
  { id: "docker-ps", name: "Docker PS", command: "docker ps", category: "Docker", description: "List running containers" },
  { id: "docker-up", name: "Docker Up", command: "cd ~/tools/docker && docker compose up -d", category: "Docker" },
  { id: "docker-down", name: "Docker Down", command: "cd ~/tools/docker && docker compose down", category: "Docker" },
  { id: "docker-logs", name: "Docker Logs", command: "docker compose logs -f", category: "Docker" },

  // Dev
  { id: "pnpm-dev", name: "pnpm dev", command: "pnpm dev", category: "Dev" },
  { id: "pnpm-build", name: "pnpm build", command: "pnpm build", category: "Dev" },
  { id: "pnpm-test", name: "pnpm test", command: "pnpm test", category: "Dev" },
  { id: "pnpm-install", name: "pnpm install", command: "pnpm install", category: "Dev" },

  // System
  { id: "list-files", name: "List Files", command: "ls -la", category: "System" },
  { id: "disk-usage", name: "Disk Usage", command: "df -h", category: "System" },
  { id: "process-list", name: "Process List", command: "htop", category: "System" },

  // Navigation
  { id: "home", name: "Home", command: "cd ~", category: "Navigation" },
  { id: "projects", name: "Projects", command: "cd ~/projects", category: "Navigation" },
  { id: "perso", name: "Perso Projects", command: "cd ~/projects/perso", category: "Navigation" },
  { id: "ecole", name: "Ecole Projects", command: "cd ~/projects/ecole", category: "Navigation" },
];

const generateId = () => crypto.randomUUID();

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set) => ({
      snippets: defaultSnippets,

      addSnippet: (snippet) =>
        set((state) => ({
          snippets: [
            ...state.snippets,
            { ...snippet, id: generateId() },
          ],
        })),

      removeSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),

      updateSnippet: (id, updates) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      reorderSnippets: (fromIndex, toIndex) =>
        set((state) => {
          const newSnippets = [...state.snippets];
          const [removed] = newSnippets.splice(fromIndex, 1);
          newSnippets.splice(toIndex, 0, removed);
          return { snippets: newSnippets };
        }),
    }),
    {
      name: "wsl-terminal-snippets",
      version: 1,
    }
  )
);
