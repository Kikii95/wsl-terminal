import { useTerminalStore } from "@/stores/terminalStore";

export function TabBar() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } =
    useTerminalStore();

  return (
    <div className="flex items-center h-9 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-4 h-full cursor-pointer
              border-r border-[var(--border)] min-w-[120px] max-w-[200px]
              transition-colors duration-150
              ${
                tab.id === activeTabId
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-sm truncate flex-1">{tab.title}</span>
            <button
              className="
                w-4 h-4 flex items-center justify-center rounded
                hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]
                hover:text-[var(--error)] transition-colors
              "
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        className="
          w-9 h-9 flex items-center justify-center
          text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          hover:bg-[var(--bg-tertiary)] transition-colors
        "
        onClick={() => addTab()}
        title="New Tab (Ctrl+Shift+T)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
