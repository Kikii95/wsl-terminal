import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { useConfigStore } from "@/stores/configStore";
import { getTheme } from "@/config/themes";
import { useCommandNotification } from "@/hooks/useNotifications";
import { SearchBar } from "./SearchBar";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  tabId: string;
  shell: string;
  distro?: string;
  isActive: boolean;
}

export function Terminal({ tabId, shell, distro, isActive }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const ligaturesAddonRef = useRef<LigaturesAddon | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const shellSpawnedRef = useRef(false);
  const resizeTimeoutRef = useRef<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const { appearance } = useConfigStore();
  const theme = getTheme(appearance.theme);

  // Notification system for long-running commands
  const tabTitle = shell === "wsl" ? (distro || "WSL") : shell.toUpperCase();
  const { onCommandStart, onOutput, cleanup: cleanupNotification } = useCommandNotification(tabTitle);

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

  const resizePty = useCallback(
    async (cols: number, rows: number) => {
      try {
        await invoke("resize_pty", { tabId, cols, rows });
      } catch (error) {
        console.error("Failed to resize PTY:", error);
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
      allowProposedApi: true, // Required for ligatures addon
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    xterm.open(terminalRef.current);

    // Load ligatures addon AFTER open (required by the addon)
    if (appearance.ligatures) {
      try {
        const ligaturesAddon = new LigaturesAddon();
        xterm.loadAddon(ligaturesAddon);
        ligaturesAddonRef.current = ligaturesAddon;
      } catch (e) {
        console.warn("Failed to load ligatures addon:", e);
      }
    }

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Handle Ctrl+C: copy if selection exists, otherwise send SIGINT
    xterm.attachCustomKeyEventHandler((event) => {
      // Ctrl+C handling
      if (event.ctrlKey && event.key === "c" && event.type === "keydown") {
        const selection = xterm.getSelection();
        if (selection && selection.length > 0) {
          // Copy selection to clipboard
          writeText(selection).catch(console.error);
          xterm.clearSelection();
          return false; // Prevent default (don't send ^C)
        }
        // No selection: let it through to send SIGINT
        return true;
      }

      // Ctrl+V: paste from clipboard
      if (event.ctrlKey && event.key === "v" && event.type === "keydown") {
        readText().then((text) => {
          if (text) {
            writeToShell(text);
          }
        }).catch(console.error);
        return false; // Prevent default browser paste
      }

      // Ctrl+F: open search
      if (event.ctrlKey && event.key === "f" && event.type === "keydown") {
        setShowSearch(true);
        return false;
      }

      // Escape: close search
      if (event.key === "Escape" && event.type === "keydown" && showSearch) {
        setShowSearch(false);
        return false;
      }

      return true; // Allow all other keys
    });

    // Handle user input
    xterm.onData((data) => {
      // Detect Enter key (start of command)
      if (data === "\r" || data === "\n") {
        onCommandStart();
      }
      writeToShell(data);
    });

    // Handle resize
    xterm.onResize(({ cols, rows }) => {
      resizePty(cols, rows);
    });

    // Listen for shell output
    const setupListener = async () => {
      unlistenRef.current = await listen<string>(
        `shell-output-${tabId}`,
        (event) => {
          xterm.write(event.payload);
          // Track output for notification system
          onOutput();
        }
      );
    };
    setupListener();

    // Spawn the shell
    const spawnShell = async () => {
      if (shellSpawnedRef.current) return;
      shellSpawnedRef.current = true;

      try {
        await invoke("spawn_shell", { tabId, shell, distro: distro || null });

        // Resize after spawn
        setTimeout(() => {
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions();
          if (dims) {
            resizePty(dims.cols, dims.rows);
          }
        }, 100);
      } catch (error) {
        console.error("Failed to spawn shell:", error);
        xterm.writeln(`\x1b[31mFailed to spawn shell: ${error}\x1b[0m`);
        xterm.writeln("\x1b[33mMake sure WSL is installed and configured.\x1b[0m");
      }
    };
    spawnShell();

    // Handle window resize with debounce
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims) {
            resizePty(dims.cols, dims.rows);
          }
        }
      }, 50);
    };
    window.addEventListener("resize", handleResize);

    // Also observe container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      cleanupNotification();
      invoke("kill_shell", { tabId }).catch(console.error);
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      ligaturesAddonRef.current = null;
    };
    // NOTE: showSearch removed from deps - it was causing terminal re-init on search toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, shell, distro, appearance.ligatures]);

  // Focus terminal when tab becomes active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
      // Delay fit to ensure container is visible and sized
      setTimeout(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims) {
            resizePty(dims.cols, dims.rows);
          }
        }
      }, 50);
    }
  }, [isActive, resizePty]);

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

  const handleSearch = useCallback((query: string, direction: "next" | "prev") => {
    if (!searchAddonRef.current || !query) return;
    if (direction === "next") {
      searchAddonRef.current.findNext(query, { caseSensitive: false, regex: false });
    } else {
      searchAddonRef.current.findPrevious(query, { caseSensitive: false, regex: false });
    }
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    searchAddonRef.current?.clearDecorations();
    xtermRef.current?.focus();
  }, []);

  return (
    <div
      className="h-full w-full relative"
      style={{
        visibility: isActive ? "visible" : "hidden",
        position: isActive ? "relative" : "absolute",
        top: 0,
        left: 0,
      }}
    >
      {/* Search Bar */}
      {showSearch && (
        <SearchBar
          onSearch={handleSearch}
          onClose={handleCloseSearch}
        />
      )}

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="h-full w-full"
        style={{ backgroundColor: theme.background }}
      />
    </div>
  );
}
