import { useRef, useCallback } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { useConfigStore } from "@/stores/configStore";

interface CommandTracker {
  startTime: number | null;
  lastOutputTime: number | null;
  hasReceivedOutput: boolean;
}

export function useCommandNotification(tabTitle: string) {
  const { notifications } = useConfigStore();
  const trackerRef = useRef<CommandTracker>({
    startTime: null,
    lastOutputTime: null,
    hasReceivedOutput: false,
  });
  const idleTimeoutRef = useRef<number | null>(null);

  // Called when user sends input (Enter key typically starts a command)
  const onCommandStart = useCallback(() => {
    trackerRef.current = {
      startTime: Date.now(),
      lastOutputTime: null,
      hasReceivedOutput: false,
    };
  }, []);

  // Called when terminal receives output
  const onOutput = useCallback(() => {
    trackerRef.current.lastOutputTime = Date.now();
    trackerRef.current.hasReceivedOutput = true;

    // Reset idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set a new idle timeout - if no output for 1.5s, command is likely done
    idleTimeoutRef.current = window.setTimeout(() => {
      checkAndNotify();
    }, 1500);
  }, []);

  const checkAndNotify = useCallback(async () => {
    if (!notifications.enabled) return;
    if (!trackerRef.current.startTime || !trackerRef.current.hasReceivedOutput) return;

    const duration = Date.now() - trackerRef.current.startTime;
    const minDurationMs = notifications.minDuration * 1000;

    // Only notify if command took longer than minDuration
    if (duration < minDurationMs) return;

    // Only notify if window is not focused (if setting enabled)
    if (notifications.onlyWhenUnfocused && document.hasFocus()) return;

    // Check permission
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification({
        title: "Command Finished",
        body: `${tabTitle} (${formatDuration(duration)})`,
      });
    }

    // Reset tracker
    trackerRef.current = {
      startTime: null,
      lastOutputTime: null,
      hasReceivedOutput: false,
    };
  }, [notifications, tabTitle]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
  }, []);

  return {
    onCommandStart,
    onOutput,
    cleanup,
  };
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Legacy export for compatibility
export async function notifyCommandFinished(tabTitle: string, duration?: number) {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  if (permissionGranted) {
    const durationText = duration ? ` (${formatDuration(duration)})` : "";
    sendNotification({
      title: "Command Finished",
      body: `${tabTitle}${durationText}`,
    });
  }
}
