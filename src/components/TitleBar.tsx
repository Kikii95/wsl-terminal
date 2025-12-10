import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-10 select-none"
      style={{
        backgroundColor: theme.ui.surface,
        borderBottom: `1px solid ${theme.ui.border}`,
      }}
    >
      {/* Left: Logo + Title - Added more left padding */}
      <div className="flex items-center gap-3 pl-6 pr-4" data-tauri-drag-region>
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{
            background: `linear-gradient(135deg, ${theme.ui.accent}, ${theme.magenta})`,
          }}
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
        </div>
        <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
          WSL Terminal
        </span>
        <span className="text-xs font-mono" style={{ color: theme.ui.textMuted }}>
          v0.1.2
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex h-full">
        <button
          className="w-12 h-full flex items-center justify-center transition-all duration-150"
          style={{ color: theme.ui.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
            e.currentTarget.style.color = theme.ui.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.ui.textMuted;
          }}
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect
              x="1"
              y="5.5"
              width="10"
              height="1"
              fill="currentColor"
              rx="0.5"
            />
          </svg>
        </button>

        <button
          className="w-12 h-full flex items-center justify-center transition-all duration-150"
          style={{ color: theme.ui.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.ui.surfaceHover;
            e.currentTarget.style.color = theme.ui.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.ui.textMuted;
          }}
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect
                x="2.5"
                y="0.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                rx="1"
              />
              <rect
                x="0.5"
                y="2.5"
                width="9"
                height="9"
                fill={theme.ui.surface}
                stroke="currentColor"
                strokeWidth="1"
                rx="1"
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect
                x="1"
                y="1"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                rx="1.5"
              />
            </svg>
          )}
        </button>

        <button
          className="w-12 h-full flex items-center justify-center transition-all duration-150"
          style={{ color: theme.ui.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.red;
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.ui.textMuted;
          }}
          onClick={handleClose}
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
