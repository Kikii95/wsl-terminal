import { useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Settings, Terminal, MonitorDot, ChevronRight } from "lucide-react";
import { useTerminalStore } from "@/stores/terminalStore";
import { useTheme } from "@/App";
import { SettingsModal } from "./SettingsModal";
import { cn } from "@/lib/utils";

const TAB_COLORS = [
  { id: "red", color: "#f38ba8" },
  { id: "green", color: "#a6e3a1" },
  { id: "yellow", color: "#f9e2af" },
  { id: "blue", color: "#89b4fa" },
  { id: "purple", color: "#cba6f7" },
  { id: "teal", color: "#94e2d5" },
  { id: "peach", color: "#fab387" },
  { id: "pink", color: "#f5c2e7" },
];

const shellIcons: Record<string, ReactNode> = {
  wsl: <Terminal className="w-3.5 h-3.5" />,
  powershell: <MonitorDot className="w-3.5 h-3.5" />,
  cmd: <ChevronRight className="w-3.5 h-3.5" />,
};

interface TabProps {
  tab: {
    id: string;
    title: string;
    shell: string;
    color?: string;
  };
  index: number;
  isActive: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: () => void;
  onDoubleClick: () => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onColorPickerToggle: () => void;
  showColorPicker: boolean;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

function Tab({
  tab,
  index,
  isActive,
  isEditing,
  editValue,
  onSelect,
  onDoubleClick,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onColorPickerToggle,
  showColorPicker,
  onColorSelect,
  onClose,
}: TabProps) {
  const theme = useTheme();
  const tabColor = tab.color || theme.ui.accent;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, x: -20 }}
      transition={{ type: "spring", duration: 0.3 }}
      className={cn(
        "group relative flex items-center gap-2 px-4 h-full min-w-[140px] max-w-[220px] transition-colors duration-150 border-r border-border/50",
        isActive
          ? "bg-background text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer"
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute top-0 left-0 right-0 h-[2px] rounded-b"
          style={{ backgroundColor: tabColor }}
          transition={{ type: "spring", duration: 0.3 }}
        />
      )}

      {/* Tab number */}
      <span className="text-[10px] font-mono w-4 text-center flex-shrink-0 text-muted-foreground/60">
        {index + 1}
      </span>

      {/* Separator */}
      <div className="w-px h-4 flex-shrink-0 bg-border/30" />

      {/* Color dot */}
      <div className="relative">
        <button
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/10 hover:ring-white/30 hover:ring-2 transition-all"
          style={{ backgroundColor: tabColor }}
          onClick={(e) => {
            e.stopPropagation();
            onColorPickerToggle();
          }}
          title="Change color"
        />

        {/* Color picker dropdown - positioned BELOW to avoid titlebar clipping */}
        <AnimatePresence>
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-[200]"
                onClick={(e) => {
                  e.stopPropagation();
                  onColorPickerToggle();
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-2 z-[201] p-2 rounded-lg shadow-2xl bg-popover border border-border flex gap-1.5"
              >
                {TAB_COLORS.map((c) => (
                  <button
                    key={c.id}
                    className="w-5 h-5 rounded-full ring-1 ring-white/10 hover:ring-white/40 hover:ring-2 transition-all cursor-pointer"
                    style={{ backgroundColor: c.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorSelect(c.color);
                    }}
                  />
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Shell icon */}
      <span
        className="flex-shrink-0 transition-colors"
        style={{ color: isActive ? tabColor : "currentColor" }}
      >
        {shellIcons[tab.shell] || shellIcons.wsl}
      </span>

      {/* Tab title */}
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditSubmit();
            if (e.key === "Escape") onEditCancel();
          }}
          className="flex-1 text-sm px-1 rounded outline-none min-w-0 bg-secondary text-foreground"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-sm truncate flex-1 font-medium" title="Double-click to rename">
          {tab.title}
        </span>
      )}

      {/* Close button */}
      <button
        className={cn(
          "w-5 h-5 flex items-center justify-center rounded flex-shrink-0 transition-all duration-150",
          "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
          isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Close (Ctrl+W)"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export function TabBar() {
  const { tabs, activeTabId, wslDistros, addTab, removeTab, setActiveTab, updateTabTitle, updateTabColor, setWslDistros } = useTerminalStore();
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const theme = useTheme();

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

  return (
    <div className="flex items-center h-10 relative z-50 mx-3 mt-1 rounded-t-lg bg-card border-b border-border">
      {/* Tabs */}
      <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-none">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              tab={tab}
              index={index}
              isActive={tab.id === activeTabId}
              isEditing={editingTabId === tab.id}
              editValue={editValue}
              onSelect={() => setActiveTab(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
              onEditChange={setEditValue}
              onEditSubmit={() => handleRenameSubmit(tab.id)}
              onEditCancel={() => setEditingTabId(null)}
              onColorPickerToggle={() => setShowColorPicker(showColorPicker === tab.id ? null : tab.id)}
              showColorPicker={showColorPicker === tab.id}
              onColorSelect={(color) => {
                updateTabColor(tab.id, color);
                setShowColorPicker(null);
              }}
              onClose={() => removeTab(tab.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* New Tab Button */}
      <div className="relative z-50">
        <button
          className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => setShowNewTabMenu(!showNewTabMenu)}
          title="New Tab (Ctrl+Shift+T)"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showNewTabMenu && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setShowNewTabMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 z-[101] w-56 py-1 rounded-lg shadow-2xl max-h-80 overflow-y-auto bg-popover border border-border"
              >
                {/* WSL Distros */}
                {wslDistros.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      WSL Distributions
                    </div>
                    {wslDistros.map((distro, i) => (
                      <motion.button
                        key={distro}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                        onClick={() => {
                          addTab("wsl", distro);
                          setShowNewTabMenu(false);
                        }}
                      >
                        <span className="text-primary">{shellIcons.wsl}</span>
                        <span>{distro}</span>
                      </motion.button>
                    ))}
                    <div className="my-1 border-t border-border" />
                  </>
                )}

                {/* Other shells */}
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  Other Shells
                </div>
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  onClick={() => {
                    addTab("powershell");
                    setShowNewTabMenu(false);
                  }}
                >
                  <span style={{ color: theme.cyan }}>{shellIcons.powershell}</span>
                  <span>PowerShell</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  onClick={() => {
                    addTab("cmd");
                    setShowNewTabMenu(false);
                  }}
                >
                  <span className="text-muted-foreground">{shellIcons.cmd}</span>
                  <span>Command Prompt</span>
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Button */}
      <button
        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary border-l border-border transition-colors"
        onClick={() => setShowSettings(true)}
        title="Settings (Ctrl+,)"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
