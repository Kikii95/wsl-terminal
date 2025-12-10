export interface Tab {
  id: string;
  title: string;
  shell: string;
  distro?: string;
  cwd?: string;
  color?: string;
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
  };
  keybindings: Record<string, string>;
  window: {
    quakeMode: boolean;
    quakeHotkey: string;
    startMinimized: boolean;
  };
}

export interface ShellProfile {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
