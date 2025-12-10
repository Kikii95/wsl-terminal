import { useEffect } from "react";
import { TitleBar } from "@/components/TitleBar";
import { TabBar } from "@/components/TabBar";
import { Terminal } from "@/components/Terminal";
import { useTerminalStore } from "@/stores/terminalStore";

function App() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } =
    useTerminalStore();

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
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleBar />
      <TabBar />
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <Terminal
            key={tab.id}
            tabId={tab.id}
            shell={tab.shell}
            isActive={tab.id === activeTabId}
          />
        ))}
        {tabs.length === 0 && (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <p className="mb-4">No terminals open</p>
              <button
                className="
                  px-4 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)]
                  hover:bg-[var(--accent-hover)] transition-colors
                "
                onClick={() => addTab()}
              >
                New Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
