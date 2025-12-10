import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "@/stores/terminalStore";
import { useConfigStore } from "@/stores/configStore";
import { usePaneStore } from "@/stores/paneStore";
import { useSSHStore } from "@/stores/sshStore";
import { useToastStore } from "@/stores/toastStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useSuggestionStore } from "@/stores/suggestionStore";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface McpActionPayload {
  action: string;
  payload: Record<string, unknown>;
}

export function useMcpHandler() {
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    updateTabTitle,
    reorderTabs,
  } = useTerminalStore();
  const { appearance, setTheme } = useConfigStore();
  const { addToast } = useToastStore();
  const { panes, splitPane } = usePaneStore();
  const { connections, addConnection, removeConnection } = useSSHStore();
  const { workspaces, saveWorkspace, deleteWorkspace, getWorkspace } = useWorkspaceStore();
  const { enabled: suggestionsEnabled, getSuggestions, recentCommands } = useSuggestionStore();

  const handleMcpAction = useCallback(
    async (event: McpActionPayload) => {
      const { action, payload } = event;
      let response: Record<string, unknown> = {};

      try {
        switch (action) {
          case "open_tab": {
            const shell = (payload.shell as string) || "wsl";
            const distro = payload.distro as string | undefined;
            const title = payload.title as string | undefined;
            const tabId = addTab(shell, distro);
            if (title && tabId) {
              updateTabTitle(tabId, title);
            }
            response = { tab_id: tabId, success: true };
            break;
          }

          case "close_tab": {
            const tabId = payload.tab_id as string;
            if (tabId && tabs.find((t) => t.id === tabId)) {
              removeTab(tabId);
              response = { success: true };
            } else {
              response = { success: false, error: "Tab not found" };
            }
            break;
          }

          case "focus_tab": {
            const tabId = payload.tab_id as string;
            if (tabId && tabs.find((t) => t.id === tabId)) {
              setActiveTab(tabId);
              response = { success: true };
            } else {
              response = { success: false, error: "Tab not found" };
            }
            break;
          }

          case "get_tabs": {
            response = {
              tabs: tabs.map((tab) => ({
                id: tab.id,
                title: tab.title,
                shell: tab.shell,
                distro: tab.distro,
                active: tab.id === activeTabId,
              })),
            };
            break;
          }

          case "run_command": {
            const tabId = payload.tab_id as string;
            const command = payload.command as string;
            if (tabId && command) {
              await invoke("write_to_shell", {
                tabId,
                data: command + "\n",
              });
              response = { success: true };
            } else {
              response = { success: false, error: "Invalid parameters" };
            }
            break;
          }

          case "get_output": {
            response = {
              output: "Output capture not yet implemented",
              note: "Use run_command with wait_for_output in future version",
            };
            break;
          }

          case "set_theme": {
            const theme = payload.theme as string;
            if (theme) {
              setTheme(theme);
              response = { success: true, theme };
            } else {
              response = { success: false, error: "Theme not specified" };
            }
            break;
          }

          case "get_themes": {
            response = {
              themes: [
                "catppuccin-mocha", "dracula", "nord", "one-dark", "gruvbox-dark",
                "tokyo-night", "solarized-dark", "vs-code-dark", "monokai", "github-dark",
                "cyberpunk", "matrix", "synthwave", "vaporwave", "neon-tokyo",
                "hacker", "inferno", "toxic", "ultraviolet", "bloodmoon", "abyss",
                "rose-pine", "everforest", "kanagawa", "palenight", "material-ocean",
                "horizon", "andromeda", "moonlight", "night-owl", "poimandres", "vitesse-dark"
              ],
              current: appearance.theme,
            };
            break;
          }

          case "add_ssh": {
            const name = payload.name as string;
            const host = payload.host as string;
            const port = (payload.port as number) || 22;
            const user = payload.user as string;
            if (name && host && user) {
              addConnection({ name, host, port, user });
              const newId = connections[connections.length - 1]?.id || "unknown";
              response = { success: true, id: newId };
            } else {
              response = { success: false, error: "Missing required fields" };
            }
            break;
          }

          case "remove_ssh": {
            const id = payload.id as string;
            if (id) {
              removeConnection(id);
              response = { success: true };
            } else {
              response = { success: false, error: "ID not specified" };
            }
            break;
          }

          case "list_ssh": {
            response = {
              connections: connections.map((c) => ({
                id: c.id,
                name: c.name,
                host: c.host,
                port: c.port,
                user: c.user,
              })),
            };
            break;
          }

          case "connect_ssh": {
            const id = payload.id as string;
            const conn = connections.find((c) => c.id === id);
            if (conn) {
              const tabId = addTab("wsl");
              setTimeout(async () => {
                await invoke("write_to_shell", {
                  tabId,
                  data: `ssh ${conn.user}@${conn.host} -p ${conn.port}\n`,
                });
              }, 500);
              response = { success: true, tab_id: tabId };
            } else {
              response = { success: false, error: "SSH connection not found" };
            }
            break;
          }

          case "get_state": {
            response = {
              tabs: tabs.map((tab) => ({
                id: tab.id,
                title: tab.title,
                shell: tab.shell,
                distro: tab.distro,
                active: tab.id === activeTabId,
              })),
              theme: appearance.theme,
              ssh_connections: connections.length,
              panes_count: Object.keys(panes).length,
            };
            break;
          }

          case "show_window": {
            const window = getCurrentWindow();
            await window.show();
            await window.setFocus();
            response = { success: true };
            break;
          }

          case "hide_window": {
            const window = getCurrentWindow();
            await window.hide();
            response = { success: true };
            break;
          }

          case "split_pane": {
            const tabId = (payload.tab_id as string) || activeTabId;
            const direction = payload.direction as "horizontal" | "vertical";
            const shell = (payload.shell as string) || "wsl";

            if (tabId && direction && panes[tabId]) {
              splitPane(tabId, panes[tabId].activePaneId, direction, shell);
              response = { success: true, pane_id: panes[tabId].activePaneId };
            } else {
              response = { success: false, error: "Invalid parameters or tab not found" };
            }
            break;
          }

          case "reorder_tabs": {
            const fromIndex = payload.from_index as number;
            const toIndex = payload.to_index as number;
            if (typeof fromIndex === "number" && typeof toIndex === "number") {
              reorderTabs(fromIndex, toIndex);
              response = { success: true };
            } else {
              response = { success: false, error: "Invalid indices" };
            }
            break;
          }

          case "show_toast": {
            const message = payload.message as string;
            const type = (payload.type as "success" | "error" | "info" | "warning") || "info";
            const duration = (payload.duration as number) || 3000;
            if (message) {
              addToast(message, type, duration);
              response = { success: true };
            } else {
              response = { success: false, error: "Message required" };
            }
            break;
          }

          case "save_workspace": {
            const name = payload.name as string;
            if (name && tabs.length > 0) {
              const id = saveWorkspace(name, tabs);
              response = { success: true, id, tabs_count: tabs.length };
            } else if (!name) {
              response = { success: false, error: "Workspace name required" };
            } else {
              response = { success: false, error: "No tabs to save" };
            }
            break;
          }

          case "load_workspace": {
            const id = payload.id as string;
            const workspace = getWorkspace(id);
            if (workspace) {
              // Close all current tabs
              tabs.forEach((tab) => removeTab(tab.id));
              // Open tabs from workspace
              workspace.tabs.forEach((savedTab) => {
                addTab(savedTab.shell, savedTab.distro, savedTab.cwd);
              });
              response = { success: true, loaded_tabs: workspace.tabs.length };
            } else {
              response = { success: false, error: "Workspace not found" };
            }
            break;
          }

          case "list_workspaces": {
            response = {
              workspaces: workspaces.map((w) => ({
                id: w.id,
                name: w.name,
                tabs_count: w.tabs.length,
                saved_at: new Date(w.savedAt).toISOString(),
              })),
            };
            break;
          }

          case "delete_workspace": {
            const id = payload.id as string;
            if (id && getWorkspace(id)) {
              deleteWorkspace(id);
              response = { success: true };
            } else {
              response = { success: false, error: "Workspace not found" };
            }
            break;
          }

          case "suggest_command": {
            const input = payload.input as string;
            if (input) {
              const suggestions = getSuggestions(input);
              response = {
                suggestions: suggestions.map((s) => ({
                  id: s.id,
                  command: s.command,
                  description: s.description,
                  category: s.category,
                })),
                enabled: suggestionsEnabled,
              };
            } else {
              response = { success: false, error: "Input required" };
            }
            break;
          }

          case "get_recent_commands": {
            response = {
              recent_commands: recentCommands.slice(0, 20),
            };
            break;
          }

          default:
            response = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        response = { error: String(error) };
      }

      await invoke("ipc_response", { response });
    },
    [
      tabs,
      activeTabId,
      addTab,
      removeTab,
      setActiveTab,
      updateTabTitle,
      appearance,
      setTheme,
      connections,
      addConnection,
      removeConnection,
      panes,
      splitPane,
      reorderTabs,
      addToast,
      workspaces,
      saveWorkspace,
      deleteWorkspace,
      getWorkspace,
      suggestionsEnabled,
      getSuggestions,
      recentCommands,
    ]
  );

  useEffect(() => {
    const unlisten = listen<McpActionPayload>("mcp-action", (event) => {
      handleMcpAction(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleMcpAction]);
}
