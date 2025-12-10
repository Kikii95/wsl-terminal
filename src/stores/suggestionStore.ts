import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CommandSuggestion {
  id: string;
  command: string;
  description: string;
  category: "git" | "docker" | "npm" | "system" | "custom";
  usageCount: number;
  lastUsed?: number;
}

interface SuggestionState {
  enabled: boolean;
  suggestions: CommandSuggestion[];
  recentCommands: string[];
  maxRecentCommands: number;
  setEnabled: (enabled: boolean) => void;
  addRecentCommand: (command: string) => void;
  getSuggestions: (input: string) => CommandSuggestion[];
  incrementUsage: (id: string) => void;
}

const defaultSuggestions: CommandSuggestion[] = [
  // Git commands
  { id: "git-status", command: "git status", description: "Show working tree status", category: "git", usageCount: 0 },
  { id: "git-pull", command: "git pull", description: "Fetch and merge remote changes", category: "git", usageCount: 0 },
  { id: "git-push", command: "git push", description: "Push commits to remote", category: "git", usageCount: 0 },
  { id: "git-log", command: "git log --oneline -10", description: "Show last 10 commits", category: "git", usageCount: 0 },
  { id: "git-branch", command: "git branch -a", description: "List all branches", category: "git", usageCount: 0 },
  { id: "git-diff", command: "git diff", description: "Show unstaged changes", category: "git", usageCount: 0 },
  { id: "git-stash", command: "git stash", description: "Stash changes", category: "git", usageCount: 0 },

  // Docker commands
  { id: "docker-ps", command: "docker ps", description: "List running containers", category: "docker", usageCount: 0 },
  { id: "docker-ps-a", command: "docker ps -a", description: "List all containers", category: "docker", usageCount: 0 },
  { id: "docker-images", command: "docker images", description: "List images", category: "docker", usageCount: 0 },
  { id: "docker-compose-up", command: "docker compose up -d", description: "Start services in detached mode", category: "docker", usageCount: 0 },
  { id: "docker-compose-down", command: "docker compose down", description: "Stop services", category: "docker", usageCount: 0 },
  { id: "docker-logs", command: "docker logs -f", description: "Follow container logs", category: "docker", usageCount: 0 },

  // NPM/PNPM commands
  { id: "npm-install", command: "pnpm install", description: "Install dependencies", category: "npm", usageCount: 0 },
  { id: "npm-dev", command: "pnpm dev", description: "Start development server", category: "npm", usageCount: 0 },
  { id: "npm-build", command: "pnpm build", description: "Build for production", category: "npm", usageCount: 0 },
  { id: "npm-test", command: "pnpm test", description: "Run tests", category: "npm", usageCount: 0 },
  { id: "npm-lint", command: "pnpm lint", description: "Run linter", category: "npm", usageCount: 0 },

  // System commands
  { id: "sys-ls", command: "ls -la", description: "List files with details", category: "system", usageCount: 0 },
  { id: "sys-df", command: "df -h", description: "Disk usage", category: "system", usageCount: 0 },
  { id: "sys-top", command: "htop", description: "Process monitor", category: "system", usageCount: 0 },
  { id: "sys-netstat", command: "ss -tuln", description: "Network connections", category: "system", usageCount: 0 },
  { id: "sys-find", command: "find . -name", description: "Find files by name", category: "system", usageCount: 0 },
];

export const useSuggestionStore = create<SuggestionState>()(
  persist(
    (set, get) => ({
      enabled: true,
      suggestions: defaultSuggestions,
      recentCommands: [],
      maxRecentCommands: 50,

      setEnabled: (enabled: boolean) => set({ enabled }),

      addRecentCommand: (command: string) => {
        const trimmed = command.trim();
        if (!trimmed || trimmed.length < 2) return;

        set((state) => {
          const recent = [trimmed, ...state.recentCommands.filter((c) => c !== trimmed)];
          return {
            recentCommands: recent.slice(0, state.maxRecentCommands),
          };
        });
      },

      getSuggestions: (input: string) => {
        const state = get();
        if (!state.enabled || !input || input.length < 2) return [];

        const lower = input.toLowerCase();
        const matches = state.suggestions.filter(
          (s) =>
            s.command.toLowerCase().includes(lower) ||
            s.description.toLowerCase().includes(lower)
        );

        // Sort by usage count (most used first), then alphabetically
        return matches
          .sort((a, b) => {
            if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
            return a.command.localeCompare(b.command);
          })
          .slice(0, 5);
      },

      incrementUsage: (id: string) => {
        set((state) => ({
          suggestions: state.suggestions.map((s) =>
            s.id === id ? { ...s, usageCount: s.usageCount + 1, lastUsed: Date.now() } : s
          ),
        }));
      },
    }),
    {
      name: "wsl-terminal-suggestions",
    }
  )
);
