import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, ChevronRight, Plus, X, Zap } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "@/App";
import { useSnippetStore, Snippet } from "@/stores/snippetStore";
import { useTerminalStore } from "@/stores/terminalStore";

interface QuickCommandsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCommands({ isOpen, onClose }: QuickCommandsProps) {
  const theme = useTheme();
  const { snippets, addSnippet, removeSnippet } = useSnippetStore();
  const { activeTabId } = useTerminalStore();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // New snippet form
  const [newName, setNewName] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newCategory, setNewCategory] = useState("Custom");

  // Filter and group snippets
  const filteredSnippets = useMemo(() => {
    if (!search) return snippets;
    const lower = search.toLowerCase();
    return snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.command.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower)
    );
  }, [snippets, search]);

  // Group by category
  const groupedSnippets = useMemo(() => {
    const groups: Record<string, Snippet[]> = {};
    filteredSnippets.forEach((s) => {
      if (!groups[s.category]) {
        groups[s.category] = [];
      }
      groups[s.category].push(s);
    });
    return groups;
  }, [filteredSnippets]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => filteredSnippets, [filteredSnippets]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
      setSelectedIndex(0);
      setShowAddForm(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddForm) {
          setShowAddForm(false);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatList[selectedIndex]) {
        e.preventDefault();
        executeSnippet(flatList[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatList, selectedIndex, showAddForm, onClose]);

  const executeSnippet = async (snippet: Snippet) => {
    if (!activeTabId) {
      console.warn("No active tab to execute command");
      return;
    }

    try {
      await invoke("write_to_shell", {
        tabId: activeTabId,
        data: snippet.command + "\n",
      });
      onClose();
    } catch (error) {
      console.error("Failed to execute snippet:", error);
    }
  };

  const handleAddSnippet = () => {
    if (newName && newCommand) {
      addSnippet({
        name: newName,
        command: newCommand,
        category: newCategory,
      });
      setNewName("");
      setNewCommand("");
      setNewCategory("Custom");
      setShowAddForm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-[560px] max-h-[70vh] z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: theme.ui.surface,
              border: `1px solid ${theme.ui.border}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: theme.ui.border }}
            >
              <Zap className="w-4 h-4" style={{ color: theme.yellow }} />
              <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                Quick Commands
              </span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.ui.surfaceHover, color: theme.ui.textMuted }}>
                Ctrl+Shift+K
              </span>
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: theme.ui.border }}
            >
              <Search className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search commands..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: theme.ui.text }}
              />
              <button
                onClick={() => setShowAddForm(true)}
                className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
                title="Add custom command"
              >
                <Plus className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-3 border-b"
                style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.surfaceHover }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded text-sm bg-transparent"
                    style={{
                      color: theme.ui.text,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                  />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="px-2 py-1.5 rounded text-sm"
                    style={{
                      backgroundColor: theme.ui.surface,
                      color: theme.ui.text,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                  >
                    <option value="Custom">Custom</option>
                    <option value="Git">Git</option>
                    <option value="Docker">Docker</option>
                    <option value="Dev">Dev</option>
                    <option value="System">System</option>
                    <option value="Navigation">Navigation</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Command"
                    value={newCommand}
                    onChange={(e) => setNewCommand(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded text-sm font-mono bg-transparent"
                    style={{
                      color: theme.ui.text,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                  />
                  <button
                    onClick={handleAddSnippet}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: theme.ui.accent,
                      color: theme.ui.background,
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
                  >
                    <X className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Commands List */}
            <div className="overflow-y-auto max-h-[400px] p-2">
              {Object.entries(groupedSnippets).map(([category, items]) => (
                <div key={category} className="mb-3">
                  <div
                    className="px-3 py-1 text-xs font-medium uppercase tracking-wider"
                    style={{ color: theme.ui.textMuted }}
                  >
                    {category}
                  </div>
                  {items.map((snippet) => {
                    const index = flatList.indexOf(snippet);
                    const isSelected = index === selectedIndex;
                    return (
                      <motion.button
                        key={snippet.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          executeSnippet(snippet);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group"
                        style={{
                          backgroundColor: isSelected ? theme.ui.surfaceHover : "transparent",
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Command
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: isSelected ? theme.ui.accent : theme.ui.textMuted }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: theme.ui.text }}
                          >
                            {snippet.name}
                          </div>
                          <div
                            className="text-xs font-mono truncate"
                            style={{ color: theme.ui.textMuted }}
                          >
                            {snippet.command}
                          </div>
                        </div>
                        {isSelected && (
                          <ChevronRight
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: theme.ui.accent }}
                          />
                        )}
                        {!snippet.id.includes("-") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSnippet(snippet.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                          >
                            <X className="w-3 h-3" style={{ color: theme.red }} />
                          </button>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}

              {filteredSnippets.length === 0 && (
                <div
                  className="text-center py-8 text-sm"
                  style={{ color: theme.ui.textMuted }}
                >
                  No commands found
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2 border-t text-xs"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMuted }}
            >
              <span>{filteredSnippets.length} commands</span>
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Execute</span>
                <span>Esc Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
