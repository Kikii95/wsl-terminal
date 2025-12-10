import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Palette, Terminal as TerminalIcon, Keyboard, X, Check } from "lucide-react";
import { useConfigStore } from "@/stores/configStore";
import { useSessionStore } from "@/stores/sessionStore";
import { themes } from "@/config/themes";
import { useTheme } from "@/App";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_OPTIONS = [
  { id: "jetbrains", name: "JetBrains Mono", value: '"JetBrains Mono", monospace' },
  { id: "fira", name: "Fira Code", value: '"Fira Code", monospace' },
  { id: "cascadia", name: "Cascadia Code", value: '"Cascadia Code", monospace' },
  { id: "consolas", name: "Consolas", value: '"Consolas", monospace' },
  { id: "ubuntu", name: "Ubuntu Mono", value: '"Ubuntu Mono", monospace' },
  { id: "source", name: "Source Code Pro", value: '"Source Code Pro", monospace' },
];

const CURSOR_STYLES = [
  { id: "block", name: "Block", icon: "█" },
  { id: "underline", name: "Underline", icon: "_" },
  { id: "bar", name: "Bar", icon: "|" },
] as const;

const TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "terminal", label: "Terminal", icon: TerminalIcon },
  { id: "keybindings", label: "Keybindings", icon: Keyboard },
] as const;

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const theme = useTheme();
  const {
    appearance,
    setTheme,
    setFontSize,
    setFontFamily,
    setCursorStyle,
    setCursorBlink,
  } = useConfigStore();
  const { enabled: sessionRestoreEnabled, setEnabled: setSessionRestoreEnabled } = useSessionStore();

  const [activeTab, setActiveTab] = useState<"appearance" | "terminal" | "keybindings">("appearance");

  const themeList = Object.entries(themes).map(([id, t]) => ({
    id,
    name: t.name,
    bg: t.background,
    accent: t.ui.accent,
    surface: t.ui.surface,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col bg-card border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ rotate: -90 }}
                    animate={{ rotate: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10"
                  >
                    <Settings className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Settings</h2>
                    <p className="text-xs text-muted-foreground">Customize your terminal experience</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Tabs */}
              <div className="flex px-6 py-3 gap-1 border-b border-border bg-muted/30">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-background rounded-lg shadow-sm"
                          transition={{ type: "spring", duration: 0.3 }}
                        />
                      )}
                      <Icon className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-6">
                <AnimatePresence mode="wait">
                  {activeTab === "appearance" && (
                    <motion.div
                      key="appearance"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Theme Selection */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-foreground">
                          Theme
                        </label>
                        <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto p-1">
                          {themeList.map((t, index) => (
                            <motion.button
                              key={t.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.02 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              className={cn(
                                "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all relative group",
                                appearance.theme === t.id
                                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                  : "hover:bg-secondary"
                              )}
                              onClick={() => setTheme(t.id)}
                            >
                              <div
                                className="w-10 h-10 rounded-lg shadow-md relative overflow-hidden"
                                style={{ backgroundColor: t.bg }}
                              >
                                {/* Mini terminal preview */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-3"
                                  style={{ backgroundColor: t.surface }}
                                />
                                <div
                                  className="absolute top-1 left-1 w-2 h-0.5 rounded-full"
                                  style={{ backgroundColor: t.accent }}
                                />
                                {appearance.theme === t.id && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                                  >
                                    <Check className="w-4 h-4 text-white" />
                                  </motion.div>
                                )}
                              </div>
                              <span className="text-[10px] truncate w-full text-center text-muted-foreground group-hover:text-foreground">
                                {t.name}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Font Family */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-foreground">
                          Font Family
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {FONT_OPTIONS.map((font) => {
                            const isSelected = appearance.fontFamily.includes(font.name);
                            return (
                              <motion.button
                                key={font.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  "px-3 py-2.5 rounded-lg text-sm transition-all border",
                                  isSelected
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                )}
                                style={{ fontFamily: font.value }}
                                onClick={() => setFontFamily(font.value)}
                              >
                                {font.name}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Font Size */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-foreground">
                            Font Size
                          </label>
                          <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {appearance.fontSize}px
                          </span>
                        </div>
                        <Slider
                          value={[appearance.fontSize]}
                          onValueChange={([value]) => setFontSize(value)}
                          min={10}
                          max={24}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>10px</span>
                          <span>24px</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "terminal" && (
                    <motion.div
                      key="terminal"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Cursor Style */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-foreground">
                          Cursor Style
                        </label>
                        <div className="flex gap-2">
                          {CURSOR_STYLES.map((style) => {
                            const isSelected = appearance.cursorStyle === style.id;
                            return (
                              <motion.button
                                key={style.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className={cn(
                                  "flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                )}
                                onClick={() => setCursorStyle(style.id)}
                              >
                                <span className="text-3xl font-mono text-primary">{style.icon}</span>
                                <span className={cn(
                                  "text-xs font-medium",
                                  isSelected ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {style.name}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cursor Blink */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
                        <div>
                          <h4 className="text-sm font-medium text-foreground">Cursor Blink</h4>
                          <p className="text-xs mt-0.5 text-muted-foreground">
                            Enable cursor blinking animation
                          </p>
                        </div>
                        <Switch
                          checked={appearance.cursorBlink}
                          onCheckedChange={setCursorBlink}
                        />
                      </div>

                      {/* Session Restore */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
                        <div>
                          <h4 className="text-sm font-medium text-foreground">Session Restore</h4>
                          <p className="text-xs mt-0.5 text-muted-foreground">
                            Restore tabs and working directory on startup
                          </p>
                        </div>
                        <Switch
                          checked={sessionRestoreEnabled}
                          onCheckedChange={setSessionRestoreEnabled}
                        />
                      </div>

                      {/* Preview */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-foreground">
                          Preview
                        </label>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl font-mono border border-border overflow-hidden"
                          style={{
                            backgroundColor: theme.background,
                            fontFamily: appearance.fontFamily,
                            fontSize: appearance.fontSize,
                            color: theme.foreground,
                          }}
                        >
                          <div className="flex items-center">
                            <span style={{ color: theme.green }}>user@wsl</span>
                            <span style={{ color: theme.ui.textMuted }}>:</span>
                            <span style={{ color: theme.blue }}>~/projects</span>
                            <span style={{ color: theme.ui.textMuted }}>$</span>
                            <span className="ml-1">ls -la</span>
                            <motion.span
                              animate={appearance.cursorBlink ? { opacity: [1, 0, 1] } : {}}
                              transition={{ duration: 1, repeat: Infinity }}
                              style={{
                                backgroundColor: theme.foreground,
                                marginLeft: "2px",
                                display: "inline-block",
                                width: appearance.cursorStyle === "bar" ? "2px" : "8px",
                                height: appearance.cursorStyle === "underline" ? "2px" : "1em",
                                verticalAlign: appearance.cursorStyle === "underline" ? "bottom" : "text-bottom",
                              }}
                            />
                          </div>
                          <div style={{ color: theme.cyan }}>drwxr-xr-x 5 user user 4096</div>
                          <div style={{ color: theme.yellow }}>-rw-r--r-- 1 user user 1234</div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "keybindings" && (
                    <motion.div
                      key="keybindings"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {[
                        { action: "New Tab", key: "Ctrl+Shift+T" },
                        { action: "Close Tab", key: "Ctrl+W" },
                        { action: "Next Tab", key: "Ctrl+Tab" },
                        { action: "Previous Tab", key: "Ctrl+Shift+Tab" },
                        { action: "Copy", key: "Ctrl+Shift+C" },
                        { action: "Paste", key: "Ctrl+Shift+V" },
                        { action: "Clear Terminal", key: "Ctrl+L" },
                        { action: "Search", key: "Ctrl+Shift+F" },
                        { action: "Settings", key: "Ctrl+," },
                      ].map((binding, index) => (
                        <motion.div
                          key={binding.action}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <span className="text-sm text-foreground">{binding.action}</span>
                          <kbd className="px-2.5 py-1 rounded-md text-xs font-mono bg-background text-muted-foreground border border-border">
                            {binding.key}
                          </kbd>
                        </motion.div>
                      ))}
                      <p className="text-xs text-muted-foreground text-center pt-4">
                        Custom keybindings coming soon
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
