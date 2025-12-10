import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Settings, Terminal, Cpu, Hash, ChevronDown } from "lucide-react";
import { useTerminalStore } from "@/stores/terminalStore";
import { SettingsModal } from "./SettingsModal";
import { cn } from "@/lib/utils";

const TAB_COLORS = [
  { id: "default", color: "transparent", label: "Default" },
  { id: "red", color: "#f38ba8", label: "Red" },
  { id: "green", color: "#a6e3a1", label: "Green" },
  { id: "yellow", color: "#f9e2af", label: "Yellow" },
  { id: "blue", color: "#89b4fa", label: "Blue" },
  { id: "purple", color: "#cba6f7", label: "Purple" },
  { id: "teal", color: "#94e2d5", label: "Teal" },
  { id: "peach", color: "#fab387", label: "Peach" },
];

const shellConfig: Record<string, { icon: typeof Terminal; label: string; color: string }> = {
  wsl: { icon: Terminal, label: "WSL", color: "#f97316" },
  powershell: { icon: Cpu, label: "PS", color: "#3b82f6" },
  cmd: { icon: Hash, label: "CMD", color: "#6b7280" },
};

export function TabBar() {
  const {
    tabs,
    activeTabId,
    wslDistros,
    addTab,
    removeTab,
    setActiveTab,
    updateTabTitle,
    updateTabColor,
    setWslDistros,
    reorderTabs,
  } = useTerminalStore();

  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchDistros = async () => {
      try {
        const distros = await invoke<string[]>("get_wsl_distros");
        setWslDistros(distros);
      } catch (e) {
        console.error("Failed to get WSL distros:", e);
      }
    };
    fetchDistros();
  }, [setWslDistros]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  const handleDoubleClick = (tabId: string, currentTitle: string) => {
    setEditingTabId(tabId);
    setEditValue(currentTitle);
  };

  const handleRenameSubmit = (tabId: string) => {
    if (editValue.trim()) {
      updateTabTitle(tabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderTabs(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <>
      <div className="flex items-center h-10 bg-card/50 border-b border-border px-2">
        {/* Tabs Container */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          <AnimatePresence mode="popLayout">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTabId;
              const config = shellConfig[tab.shell] || shellConfig.wsl;
              const ShellIcon = config.icon;
              const tabColor = tab.color || "transparent";
              const isDragging = draggedIndex === index;
              const isDropTarget = dropTargetIndex === index;

              return (
                <motion.div
                  key={tab.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: isDragging ? 0.5 : 1,
                    scale: isDragging ? 0.95 : 1
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, index)}
                  onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e as unknown as React.DragEvent, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group relative flex items-center gap-2 h-8 rounded-lg cursor-pointer transition-all",
                    "min-w-[120px] max-w-[180px]",
                    isActive
                      ? "bg-background shadow-sm"
                      : "hover:bg-secondary/50",
                    isDropTarget && "ring-2 ring-primary/50 ring-offset-1 ring-offset-card"
                  )}
                  style={{
                    paddingLeft: tabColor !== "transparent" ? 16 : 12,
                    paddingRight: 12,
                  }}
                  onClick={() => setActiveTab(tab.id)}
                  onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
                  onContextMenu={(e) => handleContextMenu(e, tab.id)}
                  onMouseDown={(e) => {
                    // Middle-click to close tab
                    if (e.button === 1) {
                      e.preventDefault();
                      removeTab(tab.id);
                    }
                  }}
                >
                  {/* Color indicator - more visible */}
                  {tabColor !== "transparent" && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-sm"
                      style={{ backgroundColor: tabColor, boxShadow: `0 0 6px ${tabColor}` }}
                    />
                  )}

                  {/* Shell icon */}
                  <ShellIcon
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: isActive ? config.color : "currentColor" }}
                  />

                  {/* Title */}
                  {editingTabId === tab.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(tab.id);
                        if (e.key === "Escape") setEditingTabId(null);
                      }}
                      className="flex-1 text-xs bg-transparent outline-none min-w-0 text-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex-1 text-xs truncate transition-colors",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {tab.title}
                    </span>
                  )}

                  {/* Close button */}
                  <button
                    className={cn(
                      "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all",
                      "text-muted-foreground/50 hover:text-foreground hover:bg-secondary",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(tab.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-border/50 ml-2">
          {/* New Tab */}
          <div className="relative">
            <button
              className="h-7 px-2 rounded-md flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setShowNewTabMenu(!showNewTabMenu)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showNewTabMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setShowNewTabMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-1 z-[101] w-52 py-1 rounded-lg shadow-xl bg-popover border border-border overflow-hidden"
                  >
                    {wslDistros.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                          WSL Distributions
                        </div>
                        {wslDistros.map((distro) => (
                          <button
                            key={distro}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            onClick={() => {
                              addTab("wsl", distro);
                              setShowNewTabMenu(false);
                            }}
                          >
                            <Terminal className="w-4 h-4" style={{ color: shellConfig.wsl.color }} />
                            <span>{distro}</span>
                          </button>
                        ))}
                        <div className="my-1 border-t border-border" />
                      </>
                    )}
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                      Windows Shells
                    </div>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                      onClick={() => {
                        addTab("powershell");
                        setShowNewTabMenu(false);
                      }}
                    >
                      <Cpu className="w-4 h-4" style={{ color: shellConfig.powershell.color }} />
                      <span>PowerShell</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                      onClick={() => {
                        addTab("cmd");
                        setShowNewTabMenu(false);
                      }}
                    >
                      <Hash className="w-4 h-4" style={{ color: shellConfig.cmd.color }} />
                      <span>Command Prompt</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Settings */}
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[200] w-48 py-1 rounded-lg shadow-xl bg-popover border border-border"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
              Tab Color
            </div>
            <div className="px-2 py-1 flex flex-wrap gap-1">
              {TAB_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={cn(
                    "w-6 h-6 rounded-md transition-all hover:scale-110",
                    c.color === "transparent"
                      ? "bg-secondary border-2 border-dashed border-border"
                      : ""
                  )}
                  style={c.color !== "transparent" ? { backgroundColor: c.color } : undefined}
                  onClick={() => {
                    updateTabColor(contextMenu.tabId, c.color === "transparent" ? "" : c.color);
                    setContextMenu(null);
                  }}
                  title={c.label}
                />
              ))}
            </div>
            <div className="my-1 border-t border-border" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => {
                removeTab(contextMenu.tabId);
                setContextMenu(null);
              }}
            >
              <X className="w-4 h-4" />
              <span>Close Tab</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
