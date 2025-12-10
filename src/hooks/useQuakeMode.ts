import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";
import { useConfigStore } from "@/stores/configStore";

export function useQuakeMode() {
  const { window: windowConfig } = useConfigStore();
  const [isQuakeModeEnabled, setIsQuakeModeEnabled] = useState(false);

  useEffect(() => {
    if (!windowConfig.quakeMode) {
      // Cleanup if quake mode is disabled
      unregister(windowConfig.quakeHotkey).catch(() => {});
      setIsQuakeModeEnabled(false);
      return;
    }

    const setupQuakeMode = async () => {
      try {
        // Check if already registered
        const registered = await isRegistered(windowConfig.quakeHotkey);
        if (!registered) {
          await register(windowConfig.quakeHotkey, async () => {
            await invoke("toggle_quake_mode");
          });
        }
        setIsQuakeModeEnabled(true);
      } catch (error) {
        console.error("Failed to setup quake mode:", error);
        setIsQuakeModeEnabled(false);
      }
    };

    setupQuakeMode();

    return () => {
      unregister(windowConfig.quakeHotkey).catch(() => {});
    };
  }, [windowConfig.quakeMode, windowConfig.quakeHotkey]);

  const toggleQuakeMode = async () => {
    try {
      await invoke("toggle_quake_mode");
    } catch (error) {
      console.error("Failed to toggle quake mode:", error);
    }
  };

  const setQuakePosition = async (heightPercent: number) => {
    try {
      await invoke("set_quake_position", { heightPercent });
    } catch (error) {
      console.error("Failed to set quake position:", error);
    }
  };

  return {
    isQuakeModeEnabled,
    toggleQuakeMode,
    setQuakePosition,
  };
}
