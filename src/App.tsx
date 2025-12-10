import { useEffect, createContext, useContext } from "react";
import { TitleBar } from "@/components/TitleBar";
import { TabBar } from "@/components/TabBar";
import { Terminal } from "@/components/Terminal";
import { StatusBar } from "@/components/StatusBar";
import { useTerminalStore } from "@/stores/terminalStore";
import { useConfigStore } from "@/stores/configStore";
import { getTheme, AppTheme } from "@/config/themes";

// Theme context for global access
export const ThemeContext = createContext<AppTheme | null>(null);
export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used within ThemeContext");
  return theme;
};

function App() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTerminalStore();
  const { appearance } = useConfigStore();
  const theme = getTheme(appearance.theme);

  // Create initial tab on mount
  useEffect(() => {
    if (tabs.length === 0) {
      addTab("wsl");
    }
  }, []);

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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, addTab, removeTab, setActiveTab]);

  return (
    <ThemeContext.Provider value={theme}>
      {/* Outer container with rounded corners and border */}
      <div
        className="h-screen w-screen overflow-hidden rounded-xl"
        style={{
          backgroundColor: theme.ui.background,
          border: `1px solid ${theme.ui.border}`,
        }}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <TitleBar />
          <TabBar />

        {/* Terminal Area with padding on all sides */}
        <div className="flex-1 overflow-hidden relative px-3 pb-2">
          <div
            className="h-full w-full rounded-lg overflow-hidden"
            style={{
              border: `1px solid ${theme.ui.border}`,
              backgroundColor: theme.background,
            }}
          >
            {tabs.map((tab) => (
              <Terminal
                key={tab.id}
                tabId={tab.id}
                shell={tab.shell}
                distro={tab.distro}
                isActive={tab.id === activeTabId}
              />
            ))}

            {/* Empty State */}
            {tabs.length === 0 && (
              <div
                className="h-full flex flex-col items-center justify-center"
                style={{ color: theme.ui.textSubtle }}
              >
                <div
                  className="flex items-center justify-center w-16 h-16 mb-4 rounded-2xl"
                  style={{ backgroundColor: `${theme.ui.accent}20` }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.ui.accent}
                    strokeWidth="2"
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2" style={{ color: theme.ui.text }}>
                  No terminals open
                </p>
                <p className="text-sm mb-6">
                  Press{" "}
                  <kbd
                    className="px-2 py-1 rounded font-mono text-xs"
                    style={{
                      backgroundColor: theme.ui.surface,
                      color: theme.ui.text,
                    }}
                  >
                    Ctrl+Shift+T
                  </kbd>{" "}
                  to open a new terminal
                </p>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors duration-150"
                  style={{
                    backgroundColor: theme.ui.accent,
                    color: theme.ui.background,
                  }}
                  onClick={() => addTab()}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M8 2v12M2 8h12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  New Terminal
                </button>
              </div>
            )}
          </div>
        </div>

          <StatusBar />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
