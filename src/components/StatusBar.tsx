import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, Palette, Check, Clock, Zap, Bell, GitBranch } from "lucide-react";
import { useConfigStore } from "@/stores/configStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { themes } from "@/config/themes";
import { useTheme } from "@/App";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { appearance, setTheme } = useConfigStore();
  const { tabs, activeTabId } = useTerminalStore();
  const [time, setTime] = useState(new Date());
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const theme = useTheme();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const themeList = Object.entries(themes).map(([id, t]) => ({
    id,
    name: t.name,
    bg: t.background,
    accent: t.ui.accent,
  }));

  const currentTheme = themes[appearance.theme];

  return (
    <div className="flex items-center justify-between h-6 px-3 text-[10px] bg-card/80 border-t border-border">
      {/* Left: Connection Status + Shell Info */}
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Circle className="w-1.5 h-1.5 fill-green-500 text-green-500" />
          </motion.div>
          <span className="text-muted-foreground">Ready</span>
        </div>

        <span className="text-border">•</span>

        {/* Active shell */}
        {activeTab && (
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary/60" />
            <span className="text-foreground/70 font-medium">
              {activeTab.shell === "wsl" ? activeTab.distro || "WSL" : activeTab.shell.toUpperCase()}
            </span>
          </div>
        )}

        <span className="text-border">•</span>

        {/* Git branch placeholder - future feature */}
        <div className="flex items-center gap-1.5 text-muted-foreground/50">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>
      </div>

      {/* Center: Keyboard shortcuts hint */}
      <div className="hidden md:flex items-center gap-4 text-muted-foreground/40">
        <span>
          <kbd className="px-1 py-0.5 rounded text-[8px] bg-secondary/50 text-muted-foreground">⌘T</kbd> new
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded text-[8px] bg-secondary/50 text-muted-foreground">⌘W</kbd> close
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded text-[8px] bg-secondary/50 text-muted-foreground">⌘,</kbd> settings
        </span>
      </div>

      {/* Right: Theme + Notifications + Clock */}
      <div className="flex items-center gap-2">
        {/* Notifications placeholder - future feature */}
        <button
          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
          title="Notifications (Coming soon)"
          disabled
        >
          <Bell className="w-3 h-3" />
        </button>

        {/* Theme Quick Switcher */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-secondary/50 transition-colors"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Change theme"
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: currentTheme?.background || theme.background }}
            />
            <Palette className="w-3 h-3 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {showThemeMenu && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowThemeMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full right-0 mb-2 z-[101] w-56 py-1 rounded-lg shadow-xl bg-popover border border-border max-h-64 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium sticky top-0 bg-popover">
                    Theme
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {themeList.map((t) => {
                      const isSelected = appearance.theme === t.id;
                      return (
                        <button
                          key={t.id}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] transition-colors text-left",
                            isSelected
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => {
                            setTheme(t.id);
                            setShowThemeMenu(false);
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: t.bg }}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" style={{ color: t.accent }} />}
                          </div>
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <span className="text-border">•</span>

        {/* Clock */}
        <div className="flex items-center gap-1 text-muted-foreground font-mono">
          <Clock className="w-3 h-3 text-primary/40" />
          <span>
            {time.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
