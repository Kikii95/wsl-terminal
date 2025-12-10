import { useState, useEffect } from "react";
import { useConfigStore } from "@/stores/configStore";
import { themes } from "@/config/themes";
import { useTheme } from "@/App";

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
    <div
      className="flex items-center justify-between h-6 text-[10px]"
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        backgroundColor: theme.ui.surface,
        borderTop: `1px solid ${theme.ui.border}`,
        color: theme.ui.textMuted,
      }}
    >
      {/* Left: Shell info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: theme.green }}
          />
          <span>Connected</span>
        </div>
        <span style={{ color: theme.ui.textSubtle }}>|</span>
        <span>WSL2</span>
        <span style={{ color: theme.ui.textSubtle }}>|</span>
        <span className="font-mono">bash</span>
      </div>

      {/* Center: Shortcuts hint */}
      <div className="flex items-center gap-3" style={{ color: theme.ui.textSubtle }}>
        <span>
          <kbd
            className="px-1 py-0.5 rounded"
            style={{ backgroundColor: theme.ui.surfaceHover, color: theme.ui.text }}
          >
            Ctrl+Shift+T
          </kbd>{" "}
          New tab
        </span>
        <span>
          <kbd
            className="px-1 py-0.5 rounded"
            style={{ backgroundColor: theme.ui.surfaceHover, color: theme.ui.text }}
          >
            Ctrl+W
          </kbd>{" "}
          Close
        </span>
      </div>

      {/* Right: Theme selector + Clock */}
      <div className="flex items-center gap-4">
        {/* Theme Selector */}
        <div className="relative z-50">
          <button
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: theme.ui.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.ui.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.ui.textMuted;
            }}
            onClick={() => setShowThemeMenu(!showThemeMenu)}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: themes[appearance.theme]?.background || theme.background,
                border: `1px solid ${theme.ui.border}`,
              }}
            />
            <span>{themes[appearance.theme]?.name || "Theme"}</span>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
              <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </button>

          {showThemeMenu && (
            <>
              <div
                className="fixed inset-0 z-[100]"
                onClick={() => setShowThemeMenu(false)}
              />
              <div
                className="absolute bottom-full right-0 mb-1 z-[101] w-48 py-1 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                style={{
                  backgroundColor: theme.ui.surface,
                  border: `1px solid ${theme.ui.border}`,
                }}
              >
                {themeList.map((t) => (
                  <button
                    key={t.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                    style={{
                      color: appearance.theme === t.id ? theme.ui.text : theme.ui.textMuted,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{
                        backgroundColor: t.bg,
                        border: `1px solid ${theme.ui.border}`,
                      }}
                    >
                      {appearance.theme === t.id && (
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill={t.accent}>
                          <path d="M6.5 11.5L3 8l1-1 2.5 2.5 5-5 1 1-6 6z" />
                        </svg>
                      )}
                    </div>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span style={{ color: theme.ui.textSubtle }}>|</span>

        {/* Clock */}
        <span className="font-mono tabular-nums">
          {time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
    </div>
  );
}
