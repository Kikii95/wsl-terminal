import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MouseEvent } from "react";
import { X, Minus, Square, Copy, Pin, PinOff, CornerDownLeft } from "lucide-react";
import { Terminal } from "./Terminal";
import { useTheme } from "@/App";
import type { Tab } from "@/types/terminal";

interface DetachedWindowProps {
  tab: Tab;
  windowId: string;
}

export function DetachedWindow({ tab, windowId }: DetachedWindowProps) {
  const theme = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const win = getCurrentWindow();
      setIsMaximized(await win.isMaximized());
    };
    checkMaximized();
  }, []);

  const handleClose = async () => {
    try {
      // Kill the shell first
      await invoke("kill_shell", { tabId: tab.id });
      // Close the window
      await invoke("close_detached_window", { windowId });
    } catch (e) {
      console.error("Failed to close window:", e);
    }
  };

  const handleMinimize = async () => {
    const win = getCurrentWindow();
    await win.minimize();
  };

  const handleMaximize = async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

  const handleToggleAlwaysOnTop = async () => {
    try {
      const newValue = !alwaysOnTop;
      await invoke("set_always_on_top", { alwaysOnTop: newValue });
      setAlwaysOnTop(newValue);
    } catch (e) {
      console.error("Failed to toggle always on top:", e);
    }
  };

  const handleAttachBack = async () => {
    try {
      await invoke("attach_window_to_main", { windowId, tabId: tab.id });
    } catch (e) {
      console.error("Failed to attach back:", e);
    }
  };

  // Handle window drag manually (data-tauri-drag-region doesn't work well with child elements)
  const handleDragStart = useCallback(async (e: MouseEvent<HTMLDivElement>) => {
    // Only start drag on left click, and only if not clicking on a button
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    try {
      const win = getCurrentWindow();
      await win.startDragging();
    } catch (err) {
      console.error("Failed to start dragging:", err);
    }
  }, []);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: theme.ui.background,
        borderRadius: "12px",
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between h-10 px-3 select-none cursor-default"
        onMouseDown={handleDragStart}
        style={{
          backgroundColor: theme.ui.surface,
          borderBottom: `1px solid ${theme.ui.border}`,
        }}
      >
        {/* Left: Title */}
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: theme.ui.text }}
          >
            {tab.title}
          </span>
          {alwaysOnTop && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${theme.ui.accent}30`,
                color: theme.ui.accent,
              }}
            >
              Pinned
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* Attach back to main */}
          <button
            onClick={handleAttachBack}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary/50 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Attach back to main window"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>

          {/* Always on Top */}
          <button
            onClick={handleToggleAlwaysOnTop}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary/50 transition-colors"
            style={{ color: alwaysOnTop ? theme.ui.accent : theme.ui.textMuted }}
            title={alwaysOnTop ? "Unpin window" : "Pin window on top"}
          >
            {alwaysOnTop ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>

          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary/50 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary/50 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/20 transition-colors"
            style={{ color: theme.red }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <Terminal
          tabId={tab.id}
          shell={tab.shell}
          distro={tab.distro}
          isActive={true}
          skipSpawn={true}
        />
      </div>
    </div>
  );
}
