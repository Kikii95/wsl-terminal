import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  Container,
  Box,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Terminal,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Pause,
  RotateCcw,
  Layers,
  HardDrive,
} from "lucide-react";
import { useTheme } from "@/App";
import { useTerminalStore } from "@/stores/terminalStore";
import { cn } from "@/lib/utils";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: "running" | "exited" | "paused" | "created" | "restarting";
  ports: string[];
  created: string;
}

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
}

interface DockerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DockerPanel({ isOpen, onClose }: DockerPanelProps) {
  const theme = useTheme();
  const { addTab } = useTerminalStore();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    containers: true,
    images: false,
    volumes: false,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchContainers = async () => {
    try {
      const result = await invoke<DockerContainer[]>("docker_containers");
      setContainers(result);
      setDockerAvailable(true);
    } catch (e) {
      const errorMsg = String(e);
      if (errorMsg.includes("docker") || errorMsg.includes("not found")) {
        setDockerAvailable(false);
      }
      console.error("Failed to fetch containers:", e);
    }
  };

  const fetchImages = async () => {
    try {
      const result = await invoke<DockerImage[]>("docker_images");
      setImages(result);
    } catch (e) {
      console.error("Failed to fetch images:", e);
    }
  };

  const fetchVolumes = async () => {
    try {
      const result = await invoke<DockerVolume[]>("docker_volumes");
      setVolumes(result);
    } catch (e) {
      console.error("Failed to fetch volumes:", e);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchContainers(), fetchImages(), fetchVolumes()]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const startContainer = async (id: string) => {
    setActionLoading(id);
    try {
      await invoke("docker_start", { containerId: id });
      await fetchContainers();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const stopContainer = async (id: string) => {
    setActionLoading(id);
    try {
      await invoke("docker_stop", { containerId: id });
      await fetchContainers();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const restartContainer = async (id: string) => {
    setActionLoading(id);
    try {
      await invoke("docker_restart", { containerId: id });
      await fetchContainers();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const removeContainer = async (id: string) => {
    setActionLoading(id);
    try {
      await invoke("docker_remove", { containerId: id });
      await fetchContainers();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const execInContainer = async (id: string, _name: string) => {
    // Open a new tab and exec into the container
    const tabId = addTab("wsl");
    setTimeout(async () => {
      await invoke("write_to_shell", {
        tabId,
        data: `docker exec -it ${id} /bin/sh\n`,
      });
    }, 500);
  };

  const viewLogs = async (id: string, _name: string) => {
    const tabId = addTab("wsl");
    setTimeout(async () => {
      await invoke("write_to_shell", {
        tabId,
        data: `docker logs -f ${id}\n`,
      });
    }, 500);
  };

  useEffect(() => {
    if (isOpen) {
      refreshAll();
    }
  }, [isOpen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "running":
        return theme.green;
      case "exited":
        return theme.red;
      case "paused":
        return theme.yellow;
      case "restarting":
        return theme.blue;
      default:
        return theme.ui.textMuted;
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case "running":
        return <Play className="w-3 h-3" fill="currentColor" />;
      case "exited":
        return <Square className="w-3 h-3" />;
      case "paused":
        return <Pause className="w-3 h-3" />;
      case "restarting":
        return <RotateCcw className="w-3 h-3 animate-spin" />;
      default:
        return <Box className="w-3 h-3" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col overflow-hidden"
        style={{
          backgroundColor: theme.ui.surface,
          borderLeft: `1px solid ${theme.ui.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between h-12 px-4 shrink-0"
          style={{ borderBottom: `1px solid ${theme.ui.border}` }}
        >
          <div className="flex items-center gap-2">
            <Container className="w-5 h-5" style={{ color: theme.blue }} />
            <span className="font-medium" style={{ color: theme.ui.text }}>
              Docker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
              style={{ color: theme.ui.textMuted }}
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
              style={{ color: theme.ui.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && containers.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.ui.accent }} />
            </div>
          )}

          {!dockerAvailable && (
            <div className="p-4">
              <div
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{ backgroundColor: `${theme.yellow}20`, color: theme.yellow }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">Docker is not available</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4">
              <div
                className="flex flex-col gap-2 p-3 rounded-lg"
                style={{ backgroundColor: `${theme.red}20`, color: theme.red }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-sm break-words overflow-hidden" style={{ wordBreak: "break-word" }}>
                      {error.length > 150 ? error.slice(0, 150) + "..." : error}
                    </span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="shrink-0 p-1 rounded hover:bg-secondary/30 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {error.length > 150 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer hover:opacity-80">Show full error</summary>
                    <pre className="mt-2 p-2 rounded text-xs overflow-x-auto max-h-32 overflow-y-auto" style={{ backgroundColor: `${theme.ui.background}80` }}>
                      {error}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {dockerAvailable && (
            <div className="p-3 space-y-4">
              {/* Containers */}
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.ui.background}80`, border: `1px solid ${theme.ui.border}` }}
              >
                <button
                  onClick={() => toggleSection("containers")}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {expandedSections.containers ? (
                    <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  )}
                  <Container className="w-4 h-4" style={{ color: theme.blue }} />
                  <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                    Containers ({containers.length})
                  </span>
                  <span className="text-xs ml-auto" style={{ color: theme.green }}>
                    {containers.filter((c) => c.state === "running").length} running
                  </span>
                </button>
                {expandedSections.containers && (
                  <div className="space-y-2 ml-2">
                    {containers.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: theme.ui.textMuted }}>
                        No containers found
                      </p>
                    )}
                    {containers.map((container, index) => (
                      <div
                        key={container.id}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: theme.ui.background,
                          borderTop: index > 0 ? `1px solid ${theme.ui.border}` : "none",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span style={{ color: getStateColor(container.state) }}>
                              {getStateIcon(container.state)}
                            </span>
                            <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                              {container.name}
                            </span>
                          </div>
                          {actionLoading === container.id && (
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: theme.ui.accent }} />
                          )}
                        </div>
                        <div className="text-xs mb-2" style={{ color: theme.ui.textMuted }}>
                          <div className="truncate">{container.image}</div>
                          {container.ports.length > 0 && (
                            <div className="mt-1">{container.ports.join(", ")}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {container.state === "running" ? (
                            <>
                              <button
                                onClick={() => stopContainer(container.id)}
                                className="p-1.5 rounded hover:bg-destructive/20 transition-colors"
                                style={{ color: theme.red }}
                                title="Stop"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => restartContainer(container.id)}
                                className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
                                style={{ color: theme.ui.textMuted }}
                                title="Restart"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => execInContainer(container.id, container.name)}
                                className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
                                style={{ color: theme.ui.accent }}
                                title="Exec"
                              >
                                <Terminal className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startContainer(container.id)}
                                className="p-1.5 rounded hover:bg-accent/20 transition-colors"
                                style={{ color: theme.green }}
                                title="Start"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeContainer(container.id)}
                                className="p-1.5 rounded hover:bg-destructive/20 transition-colors"
                                style={{ color: theme.red }}
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => viewLogs(container.id, container.name)}
                            className="p-1.5 rounded hover:bg-secondary/50 transition-colors ml-auto"
                            style={{ color: theme.ui.textMuted }}
                            title="View Logs"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Images */}
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.ui.background}80`, border: `1px solid ${theme.ui.border}` }}
              >
                <button
                  onClick={() => toggleSection("images")}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {expandedSections.images ? (
                    <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  )}
                  <Layers className="w-4 h-4" style={{ color: theme.magenta }} />
                  <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                    Images ({images.length})
                  </span>
                </button>
                {expandedSections.images && (
                  <div className="space-y-1 ml-6">
                    {images.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: theme.ui.textMuted }}>
                        No images found
                      </p>
                    )}
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-secondary/30"
                        style={{
                          borderTop: index > 0 ? `1px solid ${theme.ui.border}30` : "none",
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: theme.ui.text }}>
                            {image.repository}:{image.tag}
                          </div>
                          <div className="text-[10px]" style={{ color: theme.ui.textMuted }}>
                            {image.size}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Volumes */}
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.ui.background}80`, border: `1px solid ${theme.ui.border}` }}
              >
                <button
                  onClick={() => toggleSection("volumes")}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {expandedSections.volumes ? (
                    <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  )}
                  <HardDrive className="w-4 h-4" style={{ color: theme.cyan }} />
                  <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                    Volumes ({volumes.length})
                  </span>
                </button>
                {expandedSections.volumes && (
                  <div className="space-y-1 ml-6">
                    {volumes.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: theme.ui.textMuted }}>
                        No volumes found
                      </p>
                    )}
                    {volumes.map((volume, index) => (
                      <div
                        key={volume.name}
                        className="p-2 rounded hover:bg-secondary/30"
                        style={{
                          borderTop: index > 0 ? `1px solid ${theme.ui.border}30` : "none",
                        }}
                      >
                        <div className="text-xs font-medium truncate" style={{ color: theme.ui.text }}>
                          {volume.name}
                        </div>
                        <div className="text-[10px]" style={{ color: theme.ui.textMuted }}>
                          {volume.driver}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
