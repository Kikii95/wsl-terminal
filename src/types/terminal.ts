export interface Tab {
  id: string;
  title: string;
  shell: string;
  distro?: string;
  cwd?: string;
  color?: string;
}

// Split pane types
export type SplitDirection = "horizontal" | "vertical";

export interface PaneNode {
  id: string;
  type: "terminal" | "split";
  // For terminal type
  shell?: string;
  distro?: string;
  cwd?: string;
  // For split type
  direction?: SplitDirection;
  children?: PaneNode[];
  sizes?: number[];
}

export interface TabPane {
  tabId: string;
  root: PaneNode;
  activePaneId: string;
}

export interface TerminalTheme {
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface Config {
  shell: {
    default: string;
    profiles: ShellProfile[];
  };
  appearance: {
    theme: string;
    fontSize: number;
    fontFamily: string;
    cursorStyle: "block" | "underline" | "bar";
    cursorBlink: boolean;
    ligatures: boolean;
  };
  keybindings: Record<string, string>;
  window: {
    quakeMode: boolean;
    quakeHotkey: string;
    startMinimized: boolean;
  };
  notifications: {
    enabled: boolean;
    minDuration: number; // Minimum command duration in seconds to trigger notification
    onlyWhenUnfocused: boolean;
  };
  projects: {
    rootPath: string; // Base path for project switcher (e.g., ~/projects)
    categories: string[]; // Subdirectories to scan (e.g., ["ecole", "perso", "travail"])
  };
}

export interface ShellProfile {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
