import { useState, useEffect } from "react";
import { useConfigStore } from "@/stores/configStore";
import { themes } from "@/config/themes";

export function StatusBar() {
  const { appearance, setTheme } = useConfigStore();
  const [time, setTime] = useState(new Date());
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const themeList = Object.entries(themes).map(([id, theme]) => ({
    id,
    name: theme.name,
    bg: theme.background,
    accent: theme.blue,
  }));

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-[#181825] border-t border-[#313244] text-[10px] text-[#6c7086]">
      {/* Left: Shell info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
          <span>Connected</span>
        </div>
        <span className="text-[#45475a]">|</span>
        <span>WSL2</span>
        <span className="text-[#45475a]">|</span>
        <span className="font-mono">bash</span>
      </div>

      {/* Center: Shortcuts hint */}
      <div className="flex items-center gap-3 text-[#45475a]">
        <span>
          <kbd className="px-1 py-0.5 bg-[#313244] rounded text-[#a6adc8]">Ctrl+Shift+T</kbd> New tab
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-[#313244] rounded text-[#a6adc8]">Ctrl+W</kbd> Close
        </span>
      </div>

      {/* Right: Theme selector + Clock */}
      <div className="flex items-center gap-4">
        {/* Theme Selector */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 hover:text-[#cdd6f4] transition-colors"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
          >
            <div
              className="w-3 h-3 rounded-sm border border-[#313244]"
              style={{ backgroundColor: themes[appearance.theme]?.background || "#1e1e2e" }}
            />
            <span>{themes[appearance.theme]?.name || "Theme"}</span>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
              <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </button>

          {showThemeMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowThemeMenu(false)}
              />
              <div className="absolute bottom-full right-0 mb-1 z-50 w-44 py-1 bg-[#1e1e2e] border border-[#313244] rounded-lg shadow-xl">
                {themeList.map((t) => (
                  <button
                    key={t.id}
                    className={`
                      w-full flex items-center gap-2 px-3 py-1.5
                      text-xs hover:bg-[#313244] transition-colors
                      ${appearance.theme === t.id ? "text-[#cdd6f4]" : "text-[#a6adc8]"}
                    `}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded border border-[#313244]"
                      style={{ backgroundColor: t.bg }}
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

        <span className="text-[#45475a]">|</span>

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
