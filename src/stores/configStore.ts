import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config } from "@/types/terminal";

interface ConfigState extends Config {
  setTheme: (theme: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setCursorStyle: (style: "block" | "underline" | "bar") => void;
  setCursorBlink: (blink: boolean) => void;
  setLigatures: (ligatures: boolean) => void;
  setDefaultShell: (shell: string) => void;
  setQuakeMode: (enabled: boolean) => void;
  setQuakeHotkey: (hotkey: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationMinDuration: (seconds: number) => void;
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
    fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", monospace',
    cursorStyle: "block",
    cursorBlink: true,
    ligatures: true,
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
  notifications: {
    enabled: true,
    minDuration: 5, // Notify for commands that take > 5 seconds
    onlyWhenUnfocused: true,
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...defaultConfig,
      // Ensure all nested objects exist with defaults
      shell: defaultConfig.shell,
      appearance: defaultConfig.appearance,
      keybindings: defaultConfig.keybindings,
      window: defaultConfig.window,
      notifications: defaultConfig.notifications,

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

      setLigatures: (ligatures) =>
        set((state) => ({
          appearance: { ...state.appearance, ligatures },
        })),

      setDefaultShell: (shell) =>
        set((state) => ({
          shell: { ...state.shell, default: shell },
        })),

      setQuakeMode: (quakeMode) =>
        set((state) => ({
          window: { ...state.window, quakeMode },
        })),

      setQuakeHotkey: (quakeHotkey) =>
        set((state) => ({
          window: { ...state.window, quakeHotkey },
        })),

      setNotificationsEnabled: (enabled) =>
        set((state) => ({
          notifications: { ...state.notifications, enabled },
        })),

      setNotificationMinDuration: (minDuration) =>
        set((state) => ({
          notifications: { ...state.notifications, minDuration },
        })),
    }),
    {
      name: "wsl-terminal-config",
      version: 2, // Bump this when adding new fields
      merge: (persistedState, currentState) => {
        // Deep merge persisted state with defaults to handle missing fields
        const persisted = persistedState as Partial<Config>;
        return {
          ...currentState,
          shell: { ...defaultConfig.shell, ...persisted?.shell },
          appearance: { ...defaultConfig.appearance, ...persisted?.appearance },
          keybindings: { ...defaultConfig.keybindings, ...persisted?.keybindings },
          window: { ...defaultConfig.window, ...persisted?.window },
          notifications: { ...defaultConfig.notifications, ...persisted?.notifications },
        };
      },
    }
  )
);
