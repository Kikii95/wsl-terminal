import { useEffect, createContext, useContext, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Terminal as TerminalIcon } from "lucide-react";
import { TitleBar } from "@/components/TitleBar";
import { TabBar } from "@/components/TabBar";
import { PaneContainer } from "@/components/PaneContainer";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { QuickCommands } from "@/components/QuickCommands";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { SSHSidebar } from "@/components/SSHSidebar";
import { ToastContainer } from "@/components/ToastContainer";
import { WorkspaceManager } from "@/components/WorkspaceManager";
import { ServicesDashboard } from "@/components/ServicesDashboard";
import { DetachedWindow } from "@/components/DetachedWindow";
import { GitPanel } from "@/components/GitPanel";
import { DockerPanel } from "@/components/DockerPanel";
import { useTerminalStore } from "@/stores/terminalStore";
import { useConfigStore } from "@/stores/configStore";
import { usePaneStore } from "@/stores/paneStore";
import { useWindowStore, initWindowListeners } from "@/stores/windowStore";
import { useQuakeMode } from "@/hooks/useQuakeMode";
import { useMcpHandler } from "@/hooks/useMcpHandler";
import { useSessionRestore } from "@/hooks/useSessionRestore";
import { getTheme, AppTheme } from "@/config/themes";
import type { Tab } from "@/types/terminal";

// Declare global window properties for detached windows
declare global {
  interface Window {
    __DETACHED_TAB_ID__?: string;
    __WINDOW_ID__?: string;
    __TAB_TITLE__?: string;
    __TAB_SHELL__?: string;
    __TAB_DISTRO__?: string | null;
  }
}

// Theme context for global access
export const ThemeContext = createContext<AppTheme | null>(null);
export const useTheme = () => {
  const theme = useContext(ThemeContext);
  // Return default theme if context not available yet
  if (!theme) {
    return getTheme("catppuccin-mocha");
  }
  return theme;
};

// Check if this is a detached window and get tab info
interface DetachedInfo {
  isDetached: boolean;
  tabId: string | null;
  windowId: string | null;
  title: string;
  shell: "wsl" | "powershell" | "cmd";
  distro?: string;
}

function isDetachedWindow(): DetachedInfo {
  const tabId = window.__DETACHED_TAB_ID__ || null;
  const windowId = window.__WINDOW_ID__ || null;
  const title = window.__TAB_TITLE__ || "Detached Terminal";
  const shell = (window.__TAB_SHELL__ as "wsl" | "powershell" | "cmd") || "wsl";
  const distro = window.__TAB_DISTRO__ || undefined;

  return {
    isDetached: Boolean(tabId && windowId),
    tabId,
    windowId,
    title,
    shell,
    distro,
  };
}

function App() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTerminalStore();
  const { appearance } = useConfigStore();
  const { panes, initTabPane, splitPane, closePane, removeTabPanes } = usePaneStore();
  const { setDetachedMode } = useWindowStore();
  const theme = getTheme(appearance.theme);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [showSSHSidebar, setShowSSHSidebar] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showServicesDashboard, setShowServicesDashboard] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showDockerPanel, setShowDockerPanel] = useState(false);

  // Récupérer le cwd du tab actif pour Git Panel
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeCwd = activeTab?.cwd;

  // Check for detached window mode on mount
  const detachedInfo = useMemo(() => isDetachedWindow(), []);

  // Initialize detached mode in store if applicable
  useEffect(() => {
    if (detachedInfo.isDetached && detachedInfo.tabId && detachedInfo.windowId) {
      setDetachedMode(detachedInfo.tabId, detachedInfo.windowId);
    }
  }, [detachedInfo, setDetachedMode]);

  // Initialize window listeners for main window
  useEffect(() => {
    if (!detachedInfo.isDetached) {
      initWindowListeners();
    }
  }, [detachedInfo.isDetached]);

  // Initialize quake mode
  useQuakeMode();

  // Initialize MCP handler for Claude integration
  useMcpHandler();

  // Initialize session restore
  useSessionRestore();

  // Sync CSS variables with current theme for shadcn/ui compatibility
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--background", theme.ui.background);
    root.style.setProperty("--foreground", theme.ui.text);
    root.style.setProperty("--card", theme.ui.surface);
    root.style.setProperty("--card-foreground", theme.ui.text);
    root.style.setProperty("--popover", theme.ui.surface);
    root.style.setProperty("--popover-foreground", theme.ui.text);
    root.style.setProperty("--primary", theme.ui.accent);
    root.style.setProperty("--primary-foreground", theme.ui.background);
    root.style.setProperty("--secondary", theme.ui.surfaceHover);
    root.style.setProperty("--secondary-foreground", theme.ui.text);
    root.style.setProperty("--muted", theme.ui.surfaceHover);
    root.style.setProperty("--muted-foreground", theme.ui.textMuted);
    root.style.setProperty("--accent", theme.ui.accent);
    root.style.setProperty("--accent-foreground", theme.ui.background);
    root.style.setProperty("--destructive", theme.red);
    root.style.setProperty("--destructive-foreground", theme.ui.background);
    root.style.setProperty("--border", theme.ui.border);
    root.style.setProperty("--input", theme.ui.border);
    root.style.setProperty("--ring", theme.ui.accent);
  }, [theme]);

  // Create initial tab on mount
  useEffect(() => {
    if (tabs.length === 0) {
      addTab("wsl");
    }
  }, []);

  // Initialize panes for new tabs
  useEffect(() => {
    tabs.forEach((tab) => {
      if (!panes[tab.id]) {
        initTabPane(tab.id, tab.shell, tab.distro, tab.cwd);
      }
    });
    // Clean up panes for removed tabs
    Object.keys(panes).forEach((tabId) => {
      if (!tabs.find((t) => t.id === tabId)) {
        removeTabPanes(tabId);
      }
    });
  }, [tabs, panes, initTabPane, removeTabPanes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+T: New tab
      if (e.ctrlKey && e.shiftKey && e.key === "T") {
        e.preventDefault();
        addTab();
      }

      // Ctrl+W: Close current tab
      if (e.ctrlKey && e.key === "w" && activeTabId) {
        e.preventDefault();
        removeTab(activeTabId);
      }

      // Ctrl+Tab: Next tab
      if (e.ctrlKey && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          setActiveTab(tabs[nextIndex].id);
        }
      }

      // Ctrl+Shift+Tab: Previous tab
      if (e.ctrlKey && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (tabs[prevIndex]) {
          setActiveTab(tabs[prevIndex].id);
        }
      }

      // Ctrl+1-9: Switch to tab by number
      if (e.ctrlKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex].id);
        }
      }

      // Ctrl+Shift+D: Split vertical
      if (e.ctrlKey && e.shiftKey && e.key === "D" && activeTabId) {
        e.preventDefault();
        const tabPane = panes[activeTabId];
        if (tabPane) {
          const activeTab = tabs.find((t) => t.id === activeTabId);
          splitPane(activeTabId, tabPane.activePaneId, "vertical", activeTab?.shell || "wsl", activeTab?.distro);
        }
      }

      // Ctrl+Shift+E: Split horizontal
      if (e.ctrlKey && e.shiftKey && e.key === "E" && activeTabId) {
        e.preventDefault();
        const tabPane = panes[activeTabId];
        if (tabPane) {
          const activeTab = tabs.find((t) => t.id === activeTabId);
          splitPane(activeTabId, tabPane.activePaneId, "horizontal", activeTab?.shell || "wsl", activeTab?.distro);
        }
      }

      // Ctrl+Shift+W: Close active pane
      if (e.ctrlKey && e.shiftKey && e.key === "W" && activeTabId) {
        e.preventDefault();
        const tabPane = panes[activeTabId];
        if (tabPane) {
          const shouldCloseTab = closePane(activeTabId, tabPane.activePaneId);
          if (shouldCloseTab) {
            removeTab(activeTabId);
          }
        }
      }

      // Ctrl+Shift+P: Command Palette
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setShowCommandPalette(true);
      }

      // Ctrl+Shift+K: Quick Commands
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setShowQuickCommands(true);
      }

      // Ctrl+Shift+O: Project Switcher
      if (e.ctrlKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        setShowProjectSwitcher(true);
      }

      // Ctrl+Shift+L: Workspace Manager
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        setShowWorkspaceManager(true);
      }

      // Ctrl+Shift+S: Services Dashboard
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        setShowServicesDashboard(true);
      }

      // Ctrl+Shift+G: Git Panel
      if (e.ctrlKey && e.shiftKey && e.key === "G") {
        e.preventDefault();
        setShowGitPanel(!showGitPanel);
        setShowDockerPanel(false);
      }

      // Ctrl+Shift+Y: Docker Panel
      if (e.ctrlKey && e.shiftKey && e.key === "Y") {
        e.preventDefault();
        setShowDockerPanel(!showDockerPanel);
        setShowGitPanel(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, addTab, removeTab, setActiveTab, panes, splitPane, closePane, showGitPanel, showDockerPanel]);

  // If this is a detached window, render the DetachedWindow component
  if (detachedInfo.isDetached && detachedInfo.tabId && detachedInfo.windowId) {
    // Create tab object from window properties
    const detachedTab: Tab = {
      id: detachedInfo.tabId,
      title: detachedInfo.title,
      shell: detachedInfo.shell,
      distro: detachedInfo.distro,
    };

    return (
      <ThemeContext.Provider value={theme}>
        <DetachedWindow tab={detachedTab} windowId={detachedInfo.windowId} />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      {/* Main App Container */}
      <div
        className="h-screen w-screen overflow-hidden flex flex-col"
        style={{ backgroundColor: theme.ui.background }}
      >
        {/* Header: TitleBar + TabBar */}
        <TitleBar
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onToggleSSHSidebar={() => setShowSSHSidebar(!showSSHSidebar)}
        />
        <TabBar />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Future: Left Sidebar for SSH Manager / Process Manager */}
          {/* <Sidebar /> */}

          {/* Terminal Container */}
          <div className="flex-1 overflow-hidden p-2">
            <div
              className="h-full w-full rounded-lg overflow-hidden relative"
              style={{
                backgroundColor: theme.background,
                boxShadow: `0 0 0 1px ${theme.ui.border}`,
              }}
            >
              <AnimatePresence mode="wait">
                {tabs.length > 0 ? (
                  tabs.map((tab) => {
                    const tabPane = panes[tab.id];
                    if (!tabPane) return null;
                    return (
                      <div
                        key={tab.id}
                        className={tab.id === activeTabId ? "h-full w-full" : "hidden"}
                      >
                        <PaneContainer
                          tabId={tab.id}
                          node={tabPane.root}
                          isTabActive={tab.id === activeTabId}
                        />
                      </div>
                    );
                  })
                ) : (
                  /* Empty State */
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                      style={{
                        background: `linear-gradient(135deg, ${theme.ui.accent}20, ${theme.magenta}20)`,
                      }}
                    >
                      <TerminalIcon
                        className="w-10 h-10"
                        style={{ color: theme.ui.accent }}
                      />
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xl font-semibold mb-2"
                      style={{ color: theme.ui.text }}
                    >
                      No terminals open
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm mb-8"
                      style={{ color: theme.ui.textMuted }}
                    >
                      Create a new terminal to get started
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-4"
                    >
                      <button
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:brightness-110"
                        style={{
                          backgroundColor: theme.ui.accent,
                          color: theme.ui.background,
                        }}
                        onClick={() => addTab()}
                      >
                        <Plus className="w-4 h-4" />
                        New Terminal
                      </button>

                      <div className="flex items-center gap-2 text-xs" style={{ color: theme.ui.textSubtle }}>
                        <span>or press</span>
                        <kbd
                          className="px-2 py-1 rounded font-mono text-xs"
                          style={{
                            backgroundColor: theme.ui.surface,
                            color: theme.ui.textMuted,
                            border: `1px solid ${theme.ui.border}`,
                          }}
                        >
                          Ctrl+Shift+T
                        </kbd>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Future: Right Panel for split terminals */}
          {/* <SplitPanel /> */}
        </div>

        {/* Footer: StatusBar */}
        <StatusBar />

        {/* Command Palette */}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />

        {/* Quick Commands */}
        <QuickCommands
          isOpen={showQuickCommands}
          onClose={() => setShowQuickCommands(false)}
        />

        {/* Project Switcher */}
        <ProjectSwitcher
          isOpen={showProjectSwitcher}
          onClose={() => setShowProjectSwitcher(false)}
        />

        {/* SSH Sidebar */}
        <SSHSidebar
          isOpen={showSSHSidebar}
          onClose={() => setShowSSHSidebar(false)}
        />

        {/* Workspace Manager */}
        <WorkspaceManager
          isOpen={showWorkspaceManager}
          onClose={() => setShowWorkspaceManager(false)}
        />

        {/* Services Dashboard */}
        <ServicesDashboard
          isOpen={showServicesDashboard}
          onClose={() => setShowServicesDashboard(false)}
        />

        {/* Git Panel */}
        <GitPanel
          isOpen={showGitPanel}
          onClose={() => setShowGitPanel(false)}
          cwd={activeCwd}
        />

        {/* Docker Panel */}
        <DockerPanel
          isOpen={showDockerPanel}
          onClose={() => setShowDockerPanel(false)}
        />

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
