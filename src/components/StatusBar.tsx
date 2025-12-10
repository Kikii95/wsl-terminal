import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, Palette, ChevronUp, Check, Clock } from "lucide-react";
import { useConfigStore } from "@/stores/configStore";
import { themes } from "@/config/themes";
import { useTheme } from "@/App";
import { cn } from "@/lib/utils";

interface KbdProps {
  children: React.ReactNode;
}

function Kbd({ children }: KbdProps) {
  return (
    <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-secondary text-foreground">
      {children}
    </kbd>
  );
}

export function StatusBar() {
  const { appearance, setTheme } = useConfigStore();
  const [time, setTime] = useState(new Date());
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const theme = useTheme();

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      className="flex items-center justify-between h-7 px-5 text-[10px] bg-card border-t border-border text-muted-foreground"
    >
      {/* Left: Shell info */}
      <div className="flex items-center gap-3">
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Circle
              className="w-2 h-2"
              fill={theme.green}
              stroke={theme.green}
            />
          </motion.div>
          <span className="text-foreground/80">Connected</span>
        </motion.div>

        <span className="text-border">|</span>

        <span className="text-primary/80 font-medium">WSL2</span>

        <span className="text-border">|</span>

        <span className="font-mono text-muted-foreground">bash</span>
      </div>

      {/* Center: Shortcuts hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-4 text-muted-foreground/60"
      >
        <span className="flex items-center gap-1">
          <Kbd>Ctrl+Shift+T</Kbd>
          <span>New tab</span>
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Ctrl+W</Kbd>
          <span>Close</span>
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Ctrl+,</Kbd>
          <span>Settings</span>
        </span>
      </motion.div>

      {/* Right: Theme selector + Clock */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-3"
      >
        {/* Theme Selector */}
        <div className="relative z-50">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
          >
            <Palette className="w-3 h-3" />
            <div
              className="w-3 h-3 rounded-sm ring-1 ring-border"
              style={{
                backgroundColor: themes[appearance.theme]?.background || theme.background,
              }}
            />
            <span className="max-w-[80px] truncate">
              {themes[appearance.theme]?.name || "Theme"}
            </span>
            <motion.div
              animate={{ rotate: showThemeMenu ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-3 h-3" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showThemeMenu && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowThemeMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-2 z-[101] w-52 py-1 rounded-lg shadow-2xl max-h-72 overflow-y-auto bg-popover border border-border"
                >
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 border-b border-border">
                    Select Theme
                  </div>
                  {themeList.map((t, index) => {
                    const isSelected = appearance.theme === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors",
                          isSelected ? "text-foreground bg-secondary/50" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                        onClick={() => {
                          setTheme(t.id);
                          setShowThemeMenu(false);
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center ring-1 ring-border"
                          style={{ backgroundColor: t.bg }}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", duration: 0.3 }}
                            >
                              <Check className="w-3 h-3" style={{ color: t.accent }} />
                            </motion.div>
                          )}
                        </div>
                        <span className="flex-1 text-left">{t.name}</span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: t.accent }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <span className="text-border">|</span>

        {/* Clock */}
        <motion.div
          className="flex items-center gap-1.5 font-mono tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Clock className="w-3 h-3 text-primary/60" />
          <span>
            {time.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
