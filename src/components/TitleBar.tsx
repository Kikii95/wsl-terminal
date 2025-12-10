import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { Search, Command, PanelLeft } from "lucide-react";
import { useTheme } from "@/App";

interface TrafficLightProps {
  color: "red" | "yellow" | "green";
  onClick: () => void;
  icon?: React.ReactNode;
}

function TrafficLight({ color, onClick, icon }: TrafficLightProps) {
  const colors = {
    red: { bg: "#ff5f57", hover: "#ff3b30" },
    yellow: { bg: "#febc2e", hover: "#f59e0b" },
    green: { bg: "#28c840", hover: "#22c55e" },
  };

  return (
    <button
      className="group w-3 h-3 rounded-full flex items-center justify-center transition-all hover:brightness-110"
      style={{ backgroundColor: colors[color].bg }}
      onClick={onClick}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-black/60 text-[8px] font-bold">
        {icon}
      </span>
    </button>
  );
}

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
      className="flex items-center h-11 px-4 select-none"
      style={{ backgroundColor: theme.ui.surface }}
    >
      {/* Left: Traffic Lights */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div className="flex items-center gap-1.5">
          <TrafficLight
            color="red"
            onClick={() => appWindow.close()}
            icon="✕"
          />
          <TrafficLight
            color="yellow"
            onClick={() => appWindow.minimize()}
            icon="−"
          />
          <TrafficLight
            color="green"
            onClick={() => appWindow.toggleMaximize()}
            icon={isMaximized ? "↙" : "↗"}
          />
        </div>
      </div>

      {/* Center: Title + Version */}
      <div
        className="flex-1 flex items-center justify-center gap-3"
        data-tauri-drag-region
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          {/* Logo */}
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
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
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">
            v0.2.0
          </span>
        </motion.div>
      </div>

      {/* Right: Quick Actions (future: search, command palette, sidebar toggle) */}
      <div className="flex items-center gap-1">
        {/* Search - future feature */}
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-colors opacity-50 cursor-not-allowed"
          title="Search (Coming soon)"
          disabled
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Command Palette - future feature */}
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-colors opacity-50 cursor-not-allowed"
          title="Command Palette (Coming soon)"
          disabled
        >
          <Command className="w-3.5 h-3.5" />
        </button>

        {/* Sidebar Toggle - future feature */}
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-colors opacity-50 cursor-not-allowed"
          title="Toggle Sidebar (Coming soon)"
          disabled
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
