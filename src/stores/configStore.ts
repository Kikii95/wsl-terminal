import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config } from "@/types/terminal";

interface ConfigState extends Config {
  setTheme: (theme: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setCursorStyle: (style: "block" | "underline" | "bar") => void;
  setCursorBlink: (blink: boolean) => void;
  setDefaultShell: (shell: string) => void;
}

const defaultConfig: Config = {
  shell: {
    default: "wsl",
    profiles: [
      { name: "WSL", command: "wsl", args: ["-e", "bash", "-l"] },
      { name: "PowerShell", command: "powershell", args: ["-NoLogo"] },
      { name: "CMD", command: "cmd", args: ["/K"] },
    ],
  },
  appearance: {
    theme: "catppuccin-mocha",
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    cursorStyle: "block",
    cursorBlink: true,
  },
  keybindings: {
    new_tab: "Ctrl+Shift+T",
    close_tab: "Ctrl+W",
    next_tab: "Ctrl+Tab",
    prev_tab: "Ctrl+Shift+Tab",
    copy: "Ctrl+Shift+C",
    paste: "Ctrl+Shift+V",
  },
  window: {
    quakeMode: false,
    quakeHotkey: "Ctrl+`",
    startMinimized: false,
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...defaultConfig,

      setTheme: (theme) =>
        set((state) => ({
          appearance: { ...state.appearance, theme },
        })),

      setFontSize: (fontSize) =>
        set((state) => ({
          appearance: { ...state.appearance, fontSize },
        })),

      setFontFamily: (fontFamily) =>
        set((state) => ({
          appearance: { ...state.appearance, fontFamily },
        })),

      setCursorStyle: (cursorStyle) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorStyle },
        })),

      setCursorBlink: (cursorBlink) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorBlink },
        })),

      setDefaultShell: (shell) =>
        set((state) => ({
          shell: { ...state.shell, default: shell },
        })),
    }),
    {
      name: "wsl-terminal-config",
    }
  )
);
