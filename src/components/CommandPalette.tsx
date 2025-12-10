import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  SplitSquareVertical,
  SplitSquareHorizontal,
  Palette,
  Terminal,
  Command,
  Maximize,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useTheme } from "@/App";
import { useTerminalStore } from "@/stores/terminalStore";
import { usePaneStore } from "@/stores/paneStore";
import { useConfigStore } from "@/stores/configStore";
import { themes } from "@/config/themes";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const { tabs, activeTabId, addTab, removeTab } = useTerminalStore();
  const { panes, splitPane } = usePaneStore();
  const { setTheme, window: windowConfig, setQuakeMode } = useConfigStore();

  // Define all commands
  const commands: CommandItem[] = useMemo(() => [
    // Tab commands
    {
      id: "new-tab",
      label: "New Terminal Tab",
      description: "Open a new terminal tab",
      icon: <Plus className="w-4 h-4" />,
      shortcut: "Ctrl+Shift+T",
      action: () => { addTab("wsl"); onClose(); },
      category: "Tabs",
    },
    {
      id: "new-powershell",
      label: "New PowerShell Tab",
      description: "Open a PowerShell terminal",
      icon: <Terminal className="w-4 h-4" />,
      action: () => { addTab("powershell"); onClose(); },
      category: "Tabs",
    },
    {
      id: "new-cmd",
      label: "New CMD Tab",
      description: "Open a Command Prompt terminal",
      icon: <Terminal className="w-4 h-4" />,
      action: () => { addTab("cmd"); onClose(); },
      category: "Tabs",
    },
    {
      id: "close-tab",
      label: "Close Current Tab",
      description: "Close the active terminal tab",
      icon: <X className="w-4 h-4" />,
      shortcut: "Ctrl+W",
      action: () => { if (activeTabId) removeTab(activeTabId); onClose(); },
      category: "Tabs",
    },

    // Split commands
    {
      id: "split-vertical",
      label: "Split Vertical",
      description: "Split the terminal vertically",
      icon: <SplitSquareVertical className="w-4 h-4" />,
      shortcut: "Ctrl+Shift+D",
      action: () => {
        if (activeTabId && panes[activeTabId]) {
          const activeTab = tabs.find((t) => t.id === activeTabId);
          splitPane(activeTabId, panes[activeTabId].activePaneId, "vertical", activeTab?.shell || "wsl", activeTab?.distro);
        }
        onClose();
      },
      category: "Panes",
    },
    {
      id: "split-horizontal",
      label: "Split Horizontal",
      description: "Split the terminal horizontally",
      icon: <SplitSquareHorizontal className="w-4 h-4" />,
      shortcut: "Ctrl+Shift+E",
      action: () => {
        if (activeTabId && panes[activeTabId]) {
          const activeTab = tabs.find((t) => t.id === activeTabId);
          splitPane(activeTabId, panes[activeTabId].activePaneId, "horizontal", activeTab?.shell || "wsl", activeTab?.distro);
        }
        onClose();
      },
      category: "Panes",
    },

    // Theme commands
    ...Object.entries(themes).map(([id, t]) => ({
      id: `theme-${id}`,
      label: `Theme: ${t.name}`,
      description: "Change the terminal theme",
      icon: <Palette className="w-4 h-4" />,
      action: () => { setTheme(id); onClose(); },
      category: "Appearance",
    })),

    // Window commands
    {
      id: "toggle-fullscreen",
      label: "Toggle Fullscreen",
      description: "Enter or exit fullscreen mode",
      icon: <Maximize className="w-4 h-4" />,
      shortcut: "F11",
      action: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        onClose();
      },
      category: "Window",
    },
    {
      id: "toggle-quake-mode",
      label: windowConfig.quakeMode ? "Disable Quake Mode" : "Enable Quake Mode",
      description: `Dropdown terminal with ${windowConfig.quakeHotkey}`,
      icon: windowConfig.quakeMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />,
      action: () => { setQuakeMode(!windowConfig.quakeMode); onClose(); },
      category: "Window",
    },
  ], [activeTabId, addTab, removeTab, tabs, panes, splitPane, setTheme, onClose, windowConfig, setQuakeMode]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          filteredCommands[selectedIndex]?.action();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: theme.ui.surface,
            border: `1px solid ${theme.ui.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: theme.ui.border }}
          >
            <Command className="w-5 h-5" style={{ color: theme.ui.accent }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: theme.ui.text }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded hover:bg-secondary/50"
                style={{ color: theme.ui.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Command list */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto py-2"
          >
            {filteredCommands.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-sm"
                style={{ color: theme.ui.textMuted }}
              >
                No commands found
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  {/* Category header */}
                  <div
                    className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-medium sticky top-0"
                    style={{
                      color: theme.ui.textMuted,
                      backgroundColor: theme.ui.surface,
                    }}
                  >
                    {category}
                  </div>

                  {/* Commands in category */}
                  {cmds.map((cmd) => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-index={currentIndex}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                        style={{
                          backgroundColor: isSelected ? theme.ui.surfaceHover : "transparent",
                          color: theme.ui.text,
                        }}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        <span style={{ color: isSelected ? theme.ui.accent : theme.ui.textMuted }}>
                          {cmd.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{cmd.label}</div>
                          {cmd.description && (
                            <div
                              className="text-xs truncate"
                              style={{ color: theme.ui.textMuted }}
                            >
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                            style={{
                              backgroundColor: theme.ui.background,
                              color: theme.ui.textMuted,
                              border: `1px solid ${theme.ui.border}`,
                            }}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div
            className="px-4 py-2 text-[10px] border-t flex items-center gap-4"
            style={{
              borderColor: theme.ui.border,
              color: theme.ui.textSubtle,
            }}
          >
            <span>
              <kbd className="px-1 rounded bg-secondary/50">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1 rounded bg-secondary/50">Enter</kbd> select
            </span>
            <span>
              <kbd className="px-1 rounded bg-secondary/50">Esc</kbd> close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
