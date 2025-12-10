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
  ChevronRight,
  ChevronDown,
  Check,
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Tabs", "Panes", "Window"]));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const { tabs, activeTabId, addTab, removeTab } = useTerminalStore();
  const { panes, splitPane } = usePaneStore();
  const { appearance, setTheme: setAppTheme, window: windowConfig, setQuakeMode } = useConfigStore();

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Define all commands
  const commands: CommandItem[] = useMemo(() => [
    // Tab commands
    {
      id: "new-tab",
      label: "New Terminal Tab",
      description: "Open a new WSL terminal",
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

    // Theme commands - collapsed into "Themes" category
    ...Object.entries(themes).map(([id, t]) => ({
      id: `theme-${id}`,
      label: t.name,
      description: appearance.theme === id ? "Current theme" : undefined,
      icon: appearance.theme === id ? <Check className="w-4 h-4" /> : <Palette className="w-4 h-4" />,
      action: () => { setAppTheme(id); onClose(); },
      category: "Themes",
    })),
  ], [activeTabId, addTab, removeTab, tabs, panes, splitPane, setAppTheme, onClose, windowConfig, setQuakeMode, appearance.theme]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lowerQuery = query.toLowerCase();
    // When searching, expand all categories
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
    const categoryOrder = ["Tabs", "Panes", "Window", "Themes"];

    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });

    // Sort by category order
    const sortedGroups: Record<string, CommandItem[]> = {};
    categoryOrder.forEach(cat => {
      if (groups[cat]) {
        sortedGroups[cat] = groups[cat];
      }
    });
    // Add any remaining categories
    Object.keys(groups).forEach(cat => {
      if (!sortedGroups[cat]) {
        sortedGroups[cat] = groups[cat];
      }
    });

    return sortedGroups;
  }, [filteredCommands]);

  // Get flat list of visible commands for keyboard navigation
  const visibleCommands = useMemo(() => {
    const result: CommandItem[] = [];
    const isSearching = query.trim().length > 0;

    Object.entries(groupedCommands).forEach(([category, cmds]) => {
      if (isSearching || expandedCategories.has(category)) {
        result.push(...cmds);
      }
    });

    return result;
  }, [groupedCommands, expandedCategories, query]);

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
    const selectedEl = listRef.current?.querySelector(`[data-selected="true"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, visibleCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          visibleCommands[selectedIndex]?.action();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, visibleCommands, onClose]);

  if (!isOpen) return null;

  const isSearching = query.trim().length > 0;
  let currentVisibleIndex = 0;

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
              Object.entries(groupedCommands).map(([category, cmds]) => {
                const isExpanded = isSearching || expandedCategories.has(category);
                const categoryItemCount = cmds.length;

                return (
                  <div key={category}>
                    {/* Category header - clickable to expand/collapse */}
                    <button
                      className="w-full px-4 py-2 text-[11px] uppercase tracking-wider font-medium sticky top-0 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                      style={{
                        color: theme.ui.textMuted,
                        backgroundColor: theme.ui.surface,
                      }}
                      onClick={() => toggleCategory(category)}
                    >
                      <span className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {category}
                      </span>
                      <span className="text-[10px] opacity-60">
                        {categoryItemCount}
                      </span>
                    </button>

                    {/* Commands in category */}
                    {isExpanded && cmds.map((cmd) => {
                      const isSelected = currentVisibleIndex === selectedIndex;
                      currentVisibleIndex++;

                      return (
                        <button
                          key={cmd.id}
                          data-selected={isSelected}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                          style={{
                            backgroundColor: isSelected ? theme.ui.surfaceHover : "transparent",
                            color: theme.ui.text,
                          }}
                          onClick={cmd.action}
                          onMouseEnter={() => {
                            // Find the actual index in visibleCommands
                            const idx = visibleCommands.findIndex(c => c.id === cmd.id);
                            if (idx !== -1) setSelectedIndex(idx);
                          }}
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
                );
              })
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
