import { useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { PaneNode } from "@/types/terminal";
import { Terminal } from "./Terminal";
import { usePaneStore } from "@/stores/paneStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useTheme } from "@/App";

interface PaneContainerProps {
  tabId: string;
  node: PaneNode;
  isTabActive: boolean;
}

export function PaneContainer({ tabId, node, isTabActive }: PaneContainerProps) {
  const theme = useTheme();
  const { panes, setActivePane, updatePaneCwd } = usePaneStore();
  const { updateTabCwd } = useTerminalStore();
  const tabPane = panes[tabId];
  const activePaneId = tabPane?.activePaneId;

  // Handle CWD changes from the terminal
  const handleCwdChange = useCallback((cwd: string) => {
    // Update pane cwd
    updatePaneCwd(tabId, node.id, cwd);
    // Also update tab cwd for session save (use root pane's cwd)
    if (node.id === tabPane?.root.id || node.id === activePaneId) {
      updateTabCwd(tabId, cwd);
    }
  }, [tabId, node.id, updatePaneCwd, updateTabCwd, tabPane?.root.id, activePaneId]);

  if (node.type === "terminal") {
    const isActive = isTabActive && activePaneId === node.id;

    return (
      <div
        className="h-full w-full relative"
        onClick={() => setActivePane(tabId, node.id)}
        style={{
          outline: isActive ? `2px solid ${theme.ui.accent}40` : "none",
          outlineOffset: "-2px",
        }}
      >
        <Terminal
          tabId={node.id}
          shell={node.shell || "wsl"}
          distro={node.distro}
          initialCwd={node.cwd}
          isActive={isActive}
          onCwdChange={handleCwdChange}
        />
      </div>
    );
  }

  // Split node
  const direction = node.direction === "horizontal" ? "horizontal" : "vertical";

  return (
    <PanelGroup direction={direction} className="h-full w-full">
      {node.children?.map((child, index) => (
        <div key={child.id} className="contents">
          <Panel defaultSize={node.sizes?.[index] || 50} minSize={10}>
            <PaneContainer
              tabId={tabId}
              node={child}
              isTabActive={isTabActive}
            />
          </Panel>
          {index < (node.children?.length || 0) - 1 && (
            <PanelResizeHandle
              className={`
                ${direction === "horizontal" ? "w-1" : "h-1"}
                bg-border/50 hover:bg-primary/50 transition-colors
                flex items-center justify-center
              `}
            >
              <div
                className={`
                  ${direction === "horizontal" ? "w-0.5 h-8" : "w-8 h-0.5"}
                  bg-muted-foreground/30 rounded-full
                `}
              />
            </PanelResizeHandle>
          )}
        </div>
      ))}
    </PanelGroup>
  );
}
