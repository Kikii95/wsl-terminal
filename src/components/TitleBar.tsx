import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="
        flex items-center justify-between h-8
        bg-[var(--bg-secondary)] select-none
      "
    >
      <div className="flex items-center gap-2 px-3" data-tauri-drag-region>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span className="text-xs text-[var(--text-secondary)]">WSL Terminal</span>
      </div>

      <div className="flex">
        <button
          className="
            w-12 h-8 flex items-center justify-center
            hover:bg-[var(--bg-tertiary)] transition-colors
          "
          onClick={handleMinimize}
        >
          <svg
            width="10"
            height="1"
            viewBox="0 0 10 1"
            fill="var(--text-secondary)"
          >
            <rect width="10" height="1" />
          </svg>
        </button>

        <button
          className="
            w-12 h-8 flex items-center justify-center
            hover:bg-[var(--bg-tertiary)] transition-colors
          "
          onClick={handleMaximize}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1"
          >
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>

        <button
          className="
            w-12 h-8 flex items-center justify-center
            hover:bg-[var(--error)] transition-colors group
          "
          onClick={handleClose}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.5"
            className="group-hover:stroke-white"
          >
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
