import { useState } from "react";
import { useConfigStore } from "@/stores/configStore";
import { themes } from "@/config/themes";
import { useTheme } from "@/App";

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
];

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

  const [activeTab, setActiveTab] = useState<"appearance" | "terminal" | "keybindings">("appearance");

  if (!isOpen) return null;

  const themeList = Object.entries(themes).map(([id, t]) => ({
    id,
    name: t.name,
    bg: t.background,
    accent: t.ui.accent,
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[201] flex items-center justify-center p-8"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.ui.background,
            border: `1px solid ${theme.ui.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: `1px solid ${theme.ui.border}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.ui.accent + "20" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.ui.accent}
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold" style={{ color: theme.ui.text }}>
                Settings
              </h2>
            </div>
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: theme.ui.textMuted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                e.currentTarget.style.color = theme.ui.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = theme.ui.textMuted;
              }}
              onClick={onClose}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  d="M2 2L14 14M14 2L2 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex px-6 py-2"
            style={{ borderBottom: `1px solid ${theme.ui.border}` }}
          >
            {[
              { id: "appearance", label: "Appearance", icon: "🎨" },
              { id: "terminal", label: "Terminal", icon: "💻" },
              { id: "keybindings", label: "Keybindings", icon: "⌨️" },
            ].map((tab) => (
              <button
                key={tab.id}
                className="px-4 py-2 text-sm font-medium rounded-lg mr-2 transition-colors"
                style={{
                  backgroundColor:
                    activeTab === tab.id ? theme.ui.surfaceHover : "transparent",
                  color: activeTab === tab.id ? theme.ui.text : theme.ui.textMuted,
                }}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "appearance" && (
              <div className="space-y-6">
                {/* Theme Selection */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: theme.ui.text }}
                  >
                    Theme
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {themeList.map((t) => (
                      <button
                        key={t.id}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                        style={{
                          backgroundColor:
                            appearance.theme === t.id
                              ? theme.ui.surfaceHover
                              : "transparent",
                          border:
                            appearance.theme === t.id
                              ? `2px solid ${t.accent}`
                              : `1px solid ${theme.ui.border}`,
                        }}
                        onClick={() => setTheme(t.id)}
                      >
                        <div
                          className="w-8 h-8 rounded-md"
                          style={{
                            backgroundColor: t.bg,
                            boxShadow: `inset 0 -8px 0 ${t.accent}`,
                          }}
                        />
                        <span
                          className="text-[10px] truncate w-full text-center"
                          style={{
                            color:
                              appearance.theme === t.id
                                ? theme.ui.text
                                : theme.ui.textMuted,
                          }}
                        >
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: theme.ui.text }}
                  >
                    Font Family
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_OPTIONS.map((font) => (
                      <button
                        key={font.id}
                        className="px-3 py-2 rounded-lg text-sm transition-all"
                        style={{
                          fontFamily: font.value,
                          backgroundColor: appearance.fontFamily.includes(font.name)
                            ? theme.ui.surfaceHover
                            : "transparent",
                          border: appearance.fontFamily.includes(font.name)
                            ? `2px solid ${theme.ui.accent}`
                            : `1px solid ${theme.ui.border}`,
                          color: appearance.fontFamily.includes(font.name)
                            ? theme.ui.text
                            : theme.ui.textMuted,
                        }}
                        onClick={() => setFontFamily(font.value)}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: theme.ui.text }}
                  >
                    Font Size: {appearance.fontSize}px
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={appearance.fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        backgroundColor: theme.ui.surfaceHover,
                        accentColor: theme.ui.accent,
                      }}
                    />
                    <span
                      className="text-sm font-mono w-12 text-right"
                      style={{ color: theme.ui.textMuted }}
                    >
                      {appearance.fontSize}px
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "terminal" && (
              <div className="space-y-6">
                {/* Cursor Style */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: theme.ui.text }}
                  >
                    Cursor Style
                  </label>
                  <div className="flex gap-2">
                    {CURSOR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        className="flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all"
                        style={{
                          backgroundColor:
                            appearance.cursorStyle === style.id
                              ? theme.ui.surfaceHover
                              : "transparent",
                          border:
                            appearance.cursorStyle === style.id
                              ? `2px solid ${theme.ui.accent}`
                              : `1px solid ${theme.ui.border}`,
                          color:
                            appearance.cursorStyle === style.id
                              ? theme.ui.text
                              : theme.ui.textMuted,
                        }}
                        onClick={() =>
                          setCursorStyle(style.id as "block" | "underline" | "bar")
                        }
                      >
                        <span className="text-2xl font-mono">{style.icon}</span>
                        <span className="text-xs">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cursor Blink */}
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    backgroundColor: theme.ui.surface,
                    border: `1px solid ${theme.ui.border}`,
                  }}
                >
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: theme.ui.text }}>
                      Cursor Blink
                    </h4>
                    <p className="text-xs mt-1" style={{ color: theme.ui.textMuted }}>
                      Enable cursor blinking animation
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 rounded-full p-1 transition-colors"
                    style={{
                      backgroundColor: appearance.cursorBlink
                        ? theme.ui.accent
                        : theme.ui.surfaceHover,
                    }}
                    onClick={() => setCursorBlink(!appearance.cursorBlink)}
                  >
                    <div
                      className="w-4 h-4 rounded-full transition-transform"
                      style={{
                        backgroundColor: "white",
                        transform: appearance.cursorBlink
                          ? "translateX(24px)"
                          : "translateX(0)",
                      }}
                    />
                  </button>
                </div>

                {/* Preview */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: theme.ui.text }}
                  >
                    Preview
                  </label>
                  <div
                    className="p-4 rounded-lg font-mono"
                    style={{
                      backgroundColor: theme.background,
                      fontFamily: appearance.fontFamily,
                      fontSize: appearance.fontSize,
                      color: theme.foreground,
                    }}
                  >
                    <div>
                      <span style={{ color: theme.green }}>user@wsl</span>
                      <span style={{ color: theme.ui.textMuted }}>:</span>
                      <span style={{ color: theme.blue }}>~/projects</span>
                      <span style={{ color: theme.ui.textMuted }}>$</span>
                      <span> ls -la</span>
                      <span
                        className={appearance.cursorBlink ? "animate-pulse" : ""}
                        style={{
                          backgroundColor: theme.foreground,
                          marginLeft: "2px",
                          display: "inline-block",
                          width:
                            appearance.cursorStyle === "bar"
                              ? "2px"
                              : appearance.cursorStyle === "underline"
                                ? "8px"
                                : "8px",
                          height:
                            appearance.cursorStyle === "underline"
                              ? "2px"
                              : "1em",
                          verticalAlign:
                            appearance.cursorStyle === "underline"
                              ? "bottom"
                              : "text-bottom",
                        }}
                      />
                    </div>
                    <div style={{ color: theme.cyan }}>drwxr-xr-x 5 user user 4096</div>
                    <div style={{ color: theme.yellow }}>-rw-r--r-- 1 user user 1234</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "keybindings" && (
              <div className="space-y-4">
                {[
                  { action: "New Tab", key: "Ctrl+Shift+T" },
                  { action: "Close Tab", key: "Ctrl+W" },
                  { action: "Next Tab", key: "Ctrl+Tab" },
                  { action: "Previous Tab", key: "Ctrl+Shift+Tab" },
                  { action: "Copy", key: "Ctrl+Shift+C" },
                  { action: "Paste", key: "Ctrl+Shift+V" },
                  { action: "Clear Terminal", key: "Ctrl+L" },
                  { action: "Search", key: "Ctrl+Shift+F" },
                ].map((binding) => (
                  <div
                    key={binding.action}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      backgroundColor: theme.ui.surface,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                  >
                    <span className="text-sm" style={{ color: theme.ui.text }}>
                      {binding.action}
                    </span>
                    <kbd
                      className="px-3 py-1 rounded text-xs font-mono"
                      style={{
                        backgroundColor: theme.ui.surfaceHover,
                        color: theme.ui.textMuted,
                        border: `1px solid ${theme.ui.border}`,
                      }}
                    >
                      {binding.key}
                    </kbd>
                  </div>
                ))}
                <p
                  className="text-xs mt-4 text-center"
                  style={{ color: theme.ui.textSubtle }}
                >
                  Custom keybindings coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
