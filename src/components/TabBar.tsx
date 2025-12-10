import { useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "@/stores/terminalStore";

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
    <div className="flex items-center h-10 bg-[#11111b] border-b border-[#313244]">
      {/* Tabs */}
      <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-none">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const tabColor = tab.color || "#89b4fa";

          return (
            <div
              key={tab.id}
              className={`
                group relative flex items-center gap-2 px-4 h-full cursor-pointer
                min-w-[140px] max-w-[220px] transition-all duration-150
                ${isActive
                  ? "bg-[#1e1e2e] text-[#cdd6f4]"
                  : "bg-transparent text-[#6c7086] hover:bg-[#181825] hover:text-[#a6adc8]"
                }
              `}
              onClick={() => setActiveTab(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] rounded-b"
                  style={{ backgroundColor: tabColor }}
                />
              )}

              {/* Tab number */}
              <span className="text-[10px] font-mono text-[#45475a] w-4">
                {index + 1}
              </span>

              {/* Color dot (click to change) */}
              <div className="relative">
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

                {/* Color picker dropdown - positioned above */}
                {showColorPicker === tab.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker(null);
                      }}
                    />
                    <div className="absolute left-0 bottom-full mb-2 z-50 p-2 bg-[#1e1e2e] border border-[#313244] rounded-lg shadow-2xl flex gap-1.5">
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
                  className="flex-1 bg-[#313244] text-[#cdd6f4] text-sm px-1 rounded outline-none min-w-0"
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
                    ? "opacity-60 hover:opacity-100 hover:bg-[#313244]"
                    : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-[#313244]"
                  }
                  hover:text-[#f38ba8]
                `}
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
      <div className="relative">
        <button
          className="w-10 h-10 flex items-center justify-center text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#181825] transition-all duration-150"
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
            <div className="fixed inset-0 z-40" onClick={() => setShowNewTabMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-56 py-1 bg-[#1e1e2e] border border-[#313244] rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {/* WSL Distros */}
              {wslDistros.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#6c7086]">WSL Distributions</div>
                  {wslDistros.map((distro) => (
                    <button
                      key={distro}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cdd6f4] hover:bg-[#313244] transition-colors duration-150"
                      onClick={() => {
                        addTab("wsl", distro);
                        setShowNewTabMenu(false);
                      }}
                    >
                      <span className="text-[#f9e2af]">{shellIcons.wsl}</span>
                      <span>{distro}</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-[#313244]" />
                </>
              )}

              {/* Other shells */}
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#6c7086]">Other Shells</div>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cdd6f4] hover:bg-[#313244] transition-colors duration-150"
                onClick={() => {
                  addTab("powershell");
                  setShowNewTabMenu(false);
                }}
              >
                <span className="text-[#89b4fa]">{shellIcons.powershell}</span>
                <span>PowerShell</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#cdd6f4] hover:bg-[#313244] transition-colors duration-150"
                onClick={() => {
                  addTab("cmd");
                  setShowNewTabMenu(false);
                }}
              >
                <span className="text-[#a6adc8]">{shellIcons.cmd}</span>
                <span>Command Prompt</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Settings Button */}
      <button
        className="w-10 h-10 flex items-center justify-center text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#181825] transition-all duration-150 border-l border-[#313244]"
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
