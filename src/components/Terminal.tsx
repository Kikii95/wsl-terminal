import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useConfigStore } from "@/stores/configStore";
import { getTheme } from "@/config/themes";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  tabId: string;
  shell: string;
  isActive: boolean;
}

export function Terminal({ tabId, shell, isActive }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const shellSpawnedRef = useRef(false);

  const { appearance } = useConfigStore();
  const theme = getTheme(appearance.theme);

  const writeToShell = useCallback(
    async (data: string) => {
      try {
        await invoke("write_to_shell", { tabId, data });
      } catch (error) {
        console.error("Failed to write to shell:", error);
      }
    },
    [tabId]
  );

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const xterm = new XTerm({
      theme,
      fontFamily: appearance.fontFamily,
      fontSize: appearance.fontSize,
      cursorStyle: appearance.cursorStyle,
      cursorBlink: appearance.cursorBlink,
      allowTransparency: true,
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle user input
    xterm.onData((data) => {
      writeToShell(data);
    });

    // Listen for shell output
    const setupListener = async () => {
      unlistenRef.current = await listen<string>(
        `shell-output-${tabId}`,
        (event) => {
          xterm.write(event.payload);
        }
      );
    };
    setupListener();

    // Spawn the shell
    const spawnShell = async () => {
      if (shellSpawnedRef.current) return;
      shellSpawnedRef.current = true;

      try {
        await invoke("spawn_shell", { tabId, shell });
      } catch (error) {
        console.error("Failed to spawn shell:", error);
        xterm.writeln(`\x1b[31mFailed to spawn shell: ${error}\x1b[0m`);
        xterm.writeln("\x1b[33mMake sure WSL is installed and configured.\x1b[0m");
      }
    };
    spawnShell();

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      invoke("kill_shell", { tabId }).catch(console.error);
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [tabId, shell, writeToShell, theme, appearance]);

  // Focus terminal when tab becomes active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
      fitAddonRef.current?.fit();
    }
  }, [isActive]);

  // Update theme when it changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme;
      xtermRef.current.options.fontSize = appearance.fontSize;
      xtermRef.current.options.fontFamily = appearance.fontFamily;
      xtermRef.current.options.cursorStyle = appearance.cursorStyle;
      xtermRef.current.options.cursorBlink = appearance.cursorBlink;
    }
  }, [theme, appearance]);

  return (
    <div
      ref={terminalRef}
      className={`h-full w-full ${isActive ? "" : "hidden"}`}
      style={{ backgroundColor: theme.background }}
    />
  );
}
