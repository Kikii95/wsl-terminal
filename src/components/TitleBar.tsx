import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { Minus, Square, X, Maximize2, Search, Command, PanelLeft } from "lucide-react";
import { useTheme } from "@/App";

export function TitleBar() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const checkMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };
    checkMaximized();

    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-10 select-none"
      style={{ backgroundColor: theme.ui.surface }}
    >
      {/* Left: Logo + Title */}
      <div
        className="flex items-center gap-3"
        style={{ paddingLeft: 16 }}
        data-tauri-drag-region
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          {/* Logo */}
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.ui.accent}, ${theme.magenta})`,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <polyline points="4 17 10 11 4 5" />
            </svg>
          </div>
          <span className="text-xs font-medium text-foreground/80">
            WSL Terminal
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary/70">
            v0.2.5
          </span>
        </motion.div>
      </div>

      {/* Center: Future actions (search, command palette, sidebar) */}
      <div
        className="flex-1 flex items-center justify-center gap-1"
        data-tauri-drag-region
      >
        {/* Placeholders for future features - disabled for now */}
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
          title="Search (Coming soon)"
          disabled
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
          title="Command Palette (Coming soon)"
          disabled
        >
          <Command className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
          title="Toggle Sidebar (Coming soon)"
          disabled
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Window Controls - Windows Style */}
      <div className="flex h-full">
        <button
          className="w-12 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => appWindow.minimize()}
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          className="w-12 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => appWindow.toggleMaximize()}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Maximize2 className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          className="w-12 h-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-red-500 transition-colors"
          onClick={() => appWindow.close()}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
