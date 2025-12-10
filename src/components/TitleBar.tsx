import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { Minus, Square, X, Layers } from "lucide-react";
import { useTheme } from "@/App";
import { cn } from "@/lib/utils";

interface WindowControlProps {
  onClick: () => void;
  title: string;
  variant?: "default" | "close";
  children: React.ReactNode;
}

function WindowControl({ onClick, title, variant = "default", children }: WindowControlProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "w-11 h-full flex items-center justify-center transition-colors duration-150",
        "text-muted-foreground hover:text-foreground",
        variant === "close" ? "hover:bg-red-500 hover:text-white" : "hover:bg-secondary"
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </motion.button>
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

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-10 select-none bg-card border-b border-border"
    >
      {/* Left: Logo + Title */}
      <div
        className="flex items-center gap-3 pl-5 pr-4"
        data-tauri-drag-region
      >
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
          className="flex items-center justify-center w-7 h-7 rounded-lg shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${theme.ui.accent}, ${theme.magenta})`,
          }}
        >
          <motion.div
            whileHover={{ rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="text-sm font-semibold text-foreground">
            WSL Terminal
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary"
          >
            v0.2.0
          </motion.span>
        </motion.div>
      </div>

      {/* Right: Window Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex h-full"
      >
        <WindowControl onClick={handleMinimize} title="Minimize">
          <Minus className="w-4 h-4" strokeWidth={1.5} />
        </WindowControl>

        <WindowControl onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? (
            <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
          ) : (
            <Square className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
        </WindowControl>

        <WindowControl onClick={handleClose} title="Close" variant="close">
          <X className="w-4 h-4" strokeWidth={1.5} />
        </WindowControl>
      </motion.div>
    </div>
  );
}
