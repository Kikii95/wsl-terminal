import { create } from "zustand";
import type { PaneNode, SplitDirection, TabPane } from "@/types/terminal";

interface PaneState {
  panes: Record<string, TabPane>;

  // Actions
  initTabPane: (tabId: string, shell: string, distro?: string, cwd?: string) => string;
  restoreTabPane: (tabId: string, paneId: string, shell: string, distro?: string, cwd?: string) => void;
  splitPane: (tabId: string, paneId: string, direction: SplitDirection, shell: string, distro?: string) => void;
  closePane: (tabId: string, paneId: string) => boolean; // returns true if tab should be closed
  setActivePane: (tabId: string, paneId: string) => void;
  updatePaneCwd: (tabId: string, paneId: string, cwd: string) => void;
  removeTabPanes: (tabId: string) => void;
  getTabPane: (tabId: string) => TabPane | undefined;
}

const generateId = () => crypto.randomUUID();

// Helper: Find a pane node by ID recursively
function findPaneNode(node: PaneNode, paneId: string): PaneNode | null {
  if (node.id === paneId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findPaneNode(child, paneId);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Find parent of a pane node
function findParentNode(node: PaneNode, paneId: string): { parent: PaneNode; index: number } | null {
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i].id === paneId) {
        return { parent: node, index: i };
      }
      const found = findParentNode(node.children[i], paneId);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Replace a pane node in the tree
function replacePaneNode(node: PaneNode, paneId: string, newNode: PaneNode): PaneNode {
  if (node.id === paneId) return newNode;
  if (node.children) {
    return {
      ...node,
      children: node.children.map(child => replacePaneNode(child, paneId, newNode)),
    };
  }
  return node;
}

// Helper: Get first terminal pane ID
function getFirstTerminalId(node: PaneNode): string | null {
  if (node.type === "terminal") return node.id;
  if (node.children) {
    for (const child of node.children) {
      const id = getFirstTerminalId(child);
      if (id) return id;
    }
  }
  return null;
}

// Helper: Get all terminal IDs
function getAllTerminalIds(node: PaneNode): string[] {
  if (node.type === "terminal") return [node.id];
  if (node.children) {
    return node.children.flatMap(child => getAllTerminalIds(child));
  }
  return [];
}

export const usePaneStore = create<PaneState>((set, get) => ({
  panes: {},

  initTabPane: (tabId: string, shell: string, distro?: string, cwd?: string) => {
    const paneId = generateId();
    const root: PaneNode = {
      id: paneId,
      type: "terminal",
      shell,
      distro,
      cwd,
    };

    set(state => ({
      panes: {
        ...state.panes,
        [tabId]: {
          tabId,
          root,
          activePaneId: paneId,
        },
      },
    }));

    return paneId;
  },

  // Restore a tab pane with skipSpawn for re-attaching detached windows
  restoreTabPane: (tabId: string, paneId: string, shell: string, distro?: string, cwd?: string) => {
    const root: PaneNode = {
      id: paneId,
      type: "terminal",
      shell,
      distro,
      cwd,
      skipSpawn: true, // Don't spawn a new shell - PTY already exists
    };

    set(state => ({
      panes: {
        ...state.panes,
        [tabId]: {
          tabId,
          root,
          activePaneId: paneId,
        },
      },
    }));
  },

  splitPane: (tabId: string, paneId: string, direction: SplitDirection, shell: string, distro?: string) => {
    const { panes } = get();
    const tabPane = panes[tabId];
    if (!tabPane) return;

    const targetPane = findPaneNode(tabPane.root, paneId);
    if (!targetPane || targetPane.type !== "terminal") return;

    const newPaneId = generateId();
    const newSplitId = generateId();

    // Create new split node with original pane and new pane as children
    const newSplitNode: PaneNode = {
      id: newSplitId,
      type: "split",
      direction,
      children: [
        { ...targetPane }, // Keep original pane
        {
          id: newPaneId,
          type: "terminal",
          shell,
          distro,
        },
      ],
      sizes: [50, 50],
    };

    // Replace the target pane with the new split node
    const newRoot = replacePaneNode(tabPane.root, paneId, newSplitNode);

    set(state => ({
      panes: {
        ...state.panes,
        [tabId]: {
          ...tabPane,
          root: newRoot,
          activePaneId: newPaneId,
        },
      },
    }));
  },

  closePane: (tabId: string, paneId: string) => {
    const { panes } = get();
    const tabPane = panes[tabId];
    if (!tabPane) return false;

    // If root is a terminal, closing it means closing the tab
    if (tabPane.root.type === "terminal" && tabPane.root.id === paneId) {
      return true;
    }

    const parentInfo = findParentNode(tabPane.root, paneId);
    if (!parentInfo) return false;

    const { parent, index } = parentInfo;
    if (!parent.children) return false;

    // Remove the pane from parent
    const remainingChildren = parent.children.filter((_, i) => i !== index);

    let newRoot: PaneNode;
    if (remainingChildren.length === 1) {
      // If only one child remains, replace parent with that child
      const remainingChild = remainingChildren[0];
      if (parent.id === tabPane.root.id) {
        // Parent is root
        newRoot = remainingChild;
      } else {
        // Find grandparent and replace parent with remaining child
        newRoot = replacePaneNode(tabPane.root, parent.id, remainingChild);
      }
    } else {
      // Multiple children remain, just update the parent
      newRoot = replacePaneNode(tabPane.root, parent.id, {
        ...parent,
        children: remainingChildren,
        sizes: remainingChildren.map(() => 100 / remainingChildren.length),
      });
    }

    // Update active pane if needed
    let newActivePane = tabPane.activePaneId;
    if (newActivePane === paneId) {
      newActivePane = getFirstTerminalId(newRoot) || tabPane.activePaneId;
    }

    set(state => ({
      panes: {
        ...state.panes,
        [tabId]: {
          ...tabPane,
          root: newRoot,
          activePaneId: newActivePane,
        },
      },
    }));

    return false;
  },

  setActivePane: (tabId: string, paneId: string) => {
    const { panes } = get();
    const tabPane = panes[tabId];
    if (!tabPane) return;

    set(state => ({
      panes: {
        ...state.panes,
        [tabId]: {
          ...tabPane,
          activePaneId: paneId,
        },
      },
    }));
  },

  updatePaneCwd: (tabId: string, paneId: string, cwd: string) => {
    const { panes } = get();
    const tabPane = panes[tabId];
    if (!tabPane) return;

    // Helper to recursively update cwd in the pane tree
    const updateCwdInNode = (node: PaneNode): PaneNode => {
      if (node.id === paneId) {
        return { ...node, cwd };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateCwdInNode),
        };
      }
      return node;
    };

    set(state => ({
      panes: {
        ...state.panes,
        [tabId]: {
          ...tabPane,
          root: updateCwdInNode(tabPane.root),
        },
      },
    }));
  },

  removeTabPanes: (tabId: string) => {
    set(state => {
      const { [tabId]: _, ...rest } = state.panes;
      return { panes: rest };
    });
  },

  getTabPane: (tabId: string) => {
    return get().panes[tabId];
  },
}));

// Export helper for getting all pane IDs
export { getAllTerminalIds };
