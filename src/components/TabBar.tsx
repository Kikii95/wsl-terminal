import { useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "@/stores/terminalStore";
import { useTheme } from "@/App";
import { SettingsModal } from "./SettingsModal";

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
  wsl: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  powershell: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8l4 4-4 4" />
      <line x1="12" y1="16" x2="18" y2="16" />
    </svg>
  ),
  cmd: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8l4 4-4 4" />
    </svg>
  ),
};

export function TabBar() {
  const { tabs, activeTabId, wslDistros, addTab, removeTab, setActiveTab, updateTabTitle, updateTabColor, setWslDistros } = useTerminalStore();
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const theme = useTheme();

  // Fetch WSL distros on mount
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
    <div
      className="flex items-center h-10 relative z-50 mx-3 mt-1 rounded-t-lg"
      style={{
        backgroundColor: theme.ui.surface,
        borderBottom: `1px solid ${theme.ui.border}`,
      }}
    >
      {/* Tabs */}
      <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-none">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const tabColor = tab.color || theme.ui.accent;

          return (
            <div
              key={tab.id}
              className="group relative flex items-center gap-2 px-4 h-full cursor-pointer min-w-[140px] max-w-[220px] transition-all duration-150"
              style={{
                backgroundColor: isActive ? theme.ui.background : "transparent",
                color: isActive ? theme.ui.text : theme.ui.textMuted,
                borderRight: `1px solid ${theme.ui.borderSubtle}`,
              }}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                  e.currentTarget.style.color = theme.ui.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.ui.textMuted;
                }
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] rounded-b"
                  style={{ backgroundColor: tabColor }}
                />
              )}

              {/* Tab number with better spacing */}
              <span
                className="text-[10px] font-mono w-5 text-center flex-shrink-0"
                style={{ color: theme.ui.textSubtle }}
              >
                {index + 1}
              </span>

              {/* Subtle separator after number */}
              <div
                className="w-px h-4 flex-shrink-0"
                style={{ backgroundColor: theme.ui.borderSubtle }}
              />

              {/* Color dot (click to change) */}
              <div className="relative z-50">
                <button
                  className="w-3 h-3 rounded-full flex-shrink-0 hover:ring-2 hover:ring-white/20 transition-all hover:scale-125"
                  style={{ backgroundColor: tabColor }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowColorPicker(showColorPicker === tab.id ? null : tab.id);
                  }}
                  title="Change color"
                />

                {/* Color picker dropdown - positioned above with high z-index */}
                {showColorPicker === tab.id && (
                  <>
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker(null);
                      }}
                    />
                    <div
                      className="absolute left-0 bottom-full mb-2 z-[101] p-2 rounded-lg shadow-2xl flex gap-1.5"
                      style={{
                        backgroundColor: theme.ui.surface,
                        border: `1px solid ${theme.ui.border}`,
                      }}
                    >
                      {TAB_COLORS.map((c) => (
                        <button
                          key={c.id}
                          className="w-6 h-6 rounded-full hover:ring-2 hover:ring-white/40 transition-all hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: c.color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            updateTabColor(tab.id, c.color);
                            setShowColorPicker(null);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Shell icon */}
              <span style={{ color: isActive ? tabColor : "currentColor" }} className="flex-shrink-0">
                {shellIcons[tab.shell] || shellIcons.wsl}
              </span>

              {/* Tab title (editable) */}
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
                  className="flex-1 text-sm px-1 rounded outline-none min-w-0"
                  style={{
                    backgroundColor: theme.ui.surfaceHover,
                    color: theme.ui.text,
                  }}
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
                className={`
                  w-5 h-5 flex items-center justify-center rounded flex-shrink-0
                  transition-all duration-150
                  ${isActive
                    ? "opacity-60 hover:opacity-100"
                    : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                  }
                `}
                style={{
                  color: theme.ui.textMuted,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                  e.currentTarget.style.color = TAB_COLORS[0].color; // red
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.ui.textMuted;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                title="Close (Ctrl+W)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* New Tab Button */}
      <div className="relative z-50">
        <button
          className="w-10 h-10 flex items-center justify-center transition-all duration-150"
          style={{ color: theme.ui.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
            e.currentTarget.style.color = theme.ui.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.ui.textMuted;
          }}
          onClick={() => setShowNewTabMenu(!showNewTabMenu)}
          title="New Tab (Ctrl+Shift+T)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showNewTabMenu && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setShowNewTabMenu(false)} />
            <div
              className="absolute right-0 top-full mt-1 z-[101] w-56 py-1 rounded-lg shadow-xl max-h-80 overflow-y-auto"
              style={{
                backgroundColor: theme.ui.surface,
                border: `1px solid ${theme.ui.border}`,
              }}
            >
              {/* WSL Distros */}
              {wslDistros.length > 0 && (
                <>
                  <div
                    className="px-3 py-1 text-[10px] uppercase tracking-wider"
                    style={{ color: theme.ui.textSubtle }}
                  >
                    WSL Distributions
                  </div>
                  {wslDistros.map((distro) => (
                    <button
                      key={distro}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150"
                      style={{ color: theme.ui.text }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={() => {
                        addTab("wsl", distro);
                        setShowNewTabMenu(false);
                      }}
                    >
                      <span style={{ color: theme.ui.accent }}>{shellIcons.wsl}</span>
                      <span>{distro}</span>
                    </button>
                  ))}
                  <div
                    className="my-1"
                    style={{ borderTop: `1px solid ${theme.ui.border}` }}
                  />
                </>
              )}

              {/* Other shells */}
              <div
                className="px-3 py-1 text-[10px] uppercase tracking-wider"
                style={{ color: theme.ui.textSubtle }}
              >
                Other Shells
              </div>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150"
                style={{ color: theme.ui.text }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => {
                  addTab("powershell");
                  setShowNewTabMenu(false);
                }}
              >
                <span style={{ color: theme.cyan }}>{shellIcons.powershell}</span>
                <span>PowerShell</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150"
                style={{ color: theme.ui.text }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => {
                  addTab("cmd");
                  setShowNewTabMenu(false);
                }}
              >
                <span style={{ color: theme.ui.textMuted }}>{shellIcons.cmd}</span>
                <span>Command Prompt</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Settings Button */}
      <button
        className="w-10 h-10 flex items-center justify-center transition-all duration-150"
        style={{
          color: theme.ui.textMuted,
          borderLeft: `1px solid ${theme.ui.border}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
          e.currentTarget.style.color = theme.ui.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = theme.ui.textMuted;
        }}
        onClick={() => setShowSettings(true)}
        title="Settings (Ctrl+,)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
