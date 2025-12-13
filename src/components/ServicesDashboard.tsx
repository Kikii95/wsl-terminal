import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  RotateCw,
  Plus,
  Trash2,
  Edit2,
  X,
  Server,
  Database,
  Container,
  Zap,
  Cpu,
  MemoryStick,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "@/App";
import { useServiceStore, Service, ServiceStatus, ServiceTemplate } from "@/stores/serviceStore";
import { useToastStore } from "@/stores/toastStore";

interface ServicesDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<ServiceStatus, string> = {
  running: "#22c55e",
  stopped: "#6b7280",
  starting: "#eab308",
  stopping: "#f97316",
  crashed: "#ef4444",
  restarting: "#3b82f6",
};

const statusIcons: Record<ServiceStatus, React.ReactNode> = {
  running: <CheckCircle2 className="w-4 h-4" />,
  stopped: <Square className="w-4 h-4" />,
  starting: <Loader2 className="w-4 h-4 animate-spin" />,
  stopping: <Loader2 className="w-4 h-4 animate-spin" />,
  crashed: <AlertCircle className="w-4 h-4" />,
  restarting: <RefreshCw className="w-4 h-4 animate-spin" />,
};

const categoryIcons: Record<Service["category"], React.ReactNode> = {
  dev: <Zap className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  container: <Container className="w-4 h-4" />,
  custom: <Server className="w-4 h-4" />,
};

function formatUptime(startedAt?: number): string {
  if (!startedAt) return "-";
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ServicesDashboard({ isOpen, onClose }: ServicesDashboardProps) {
  const theme = useTheme();
  const { addToast } = useToastStore();
  const {
    services,
    templates,
    autoRestartEnabled,
    addService,
    removeService,
    updateService,
    setServiceStatus,
    incrementRestartCount,
    resetRestartCount,
    addFromTemplate,
    setAutoRestartEnabled,
  } = useServiceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["dev", "database", "container", "custom"])
  );
  const [newService, setNewService] = useState({
    name: "",
    command: "",
    cwd: "",
    category: "custom" as Service["category"],
    autoRestart: true,
    maxRestarts: 3,
  });

  // Poll for resource usage
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(async () => {
      for (const service of services) {
        if (service.status === "running" && service.pid) {
          try {
            const usage = await invoke<{ cpu: number; memory: number }>("get_process_stats", {
              pid: service.pid,
            });
            useServiceStore.getState().updateResourceUsage(service.id, usage.cpu, usage.memory);
          } catch {
            // Process may have ended
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, services]);

  // Auto-restart handler
  useEffect(() => {
    if (!autoRestartEnabled) return;

    services.forEach((service) => {
      if (
        service.status === "crashed" &&
        service.autoRestart &&
        service.restartCount < service.maxRestarts
      ) {
        handleRestart(service.id);
      }
    });
  }, [services, autoRestartEnabled]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleStart = useCallback(async (id: string) => {
    const service = useServiceStore.getState().getServiceById(id);
    if (!service) return;

    setServiceStatus(id, "starting");
    addToast(`Starting ${service.name}...`, "info");

    try {
      const pid = await invoke<number>("start_service", {
        command: service.command,
        cwd: service.cwd || undefined,
      });
      setServiceStatus(id, "running", pid);
      resetRestartCount(id);
      addToast(`${service.name} started`, "success");
    } catch (error) {
      setServiceStatus(id, "crashed");
      addToast(`Failed to start ${service.name}: ${error}`, "error");
    }
  }, [setServiceStatus, resetRestartCount, addToast]);

  const handleStop = useCallback(async (id: string) => {
    const service = useServiceStore.getState().getServiceById(id);
    if (!service || !service.pid) return;

    setServiceStatus(id, "stopping");
    addToast(`Stopping ${service.name}...`, "info");

    try {
      await invoke("stop_service", { pid: service.pid });
      setServiceStatus(id, "stopped");
      addToast(`${service.name} stopped`, "success");
    } catch (error) {
      addToast(`Failed to stop ${service.name}: ${error}`, "error");
    }
  }, [setServiceStatus, addToast]);

  const handleRestart = useCallback(async (id: string) => {
    const service = useServiceStore.getState().getServiceById(id);
    if (!service) return;

    setServiceStatus(id, "restarting");
    incrementRestartCount(id);
    addToast(`Restarting ${service.name}...`, "info");

    if (service.pid) {
      try {
        await invoke("stop_service", { pid: service.pid });
      } catch {
        // Ignore
      }
    }

    try {
      const pid = await invoke<number>("start_service", {
        command: service.command,
        cwd: service.cwd || undefined,
      });
      setServiceStatus(id, "running", pid);
      addToast(`${service.name} restarted`, "success");
    } catch (error) {
      setServiceStatus(id, "crashed");
      addToast(`Failed to restart ${service.name}: ${error}`, "error");
    }
  }, [setServiceStatus, incrementRestartCount, addToast]);

  const handleDelete = useCallback(async (id: string) => {
    const service = useServiceStore.getState().getServiceById(id);
    if (!service) return;

    const serviceName = service.name;
    const wasRunning = service.status === "running" && service.pid;

    if (wasRunning) {
      try {
        await invoke("stop_service", { pid: service.pid });
        addToast(`${serviceName} stopped`, "warning");
      } catch {
        // Process might already be dead, continue with removal
      }
    }

    removeService(id);
    addToast(`${serviceName} removed`, "info");
  }, [removeService, addToast]);

  const handleAddService = useCallback(() => {
    if (!newService.name.trim() || !newService.command.trim()) {
      addToast("Name and command are required", "error");
      return;
    }

    addService({
      name: newService.name,
      command: newService.command,
      cwd: newService.cwd || undefined,
      category: newService.category,
      autoRestart: newService.autoRestart,
      maxRestarts: newService.maxRestarts,
    });

    setNewService({
      name: "",
      command: "",
      cwd: "",
      category: "custom",
      autoRestart: true,
      maxRestarts: 3,
    });
    setShowAddModal(false);
    addToast("Service added", "success");
  }, [newService, addService, addToast]);

  const handleAddFromTemplate = useCallback((template: ServiceTemplate) => {
    addFromTemplate(template.id);
    addToast(`${template.name} added from template`, "success");
    setShowAddModal(false);
  }, [addFromTemplate, addToast]);

  const handleUpdateService = useCallback(() => {
    if (!editingService) return;

    updateService(editingService.id, {
      name: editingService.name,
      command: editingService.command,
      cwd: editingService.cwd,
      category: editingService.category,
      autoRestart: editingService.autoRestart,
      maxRestarts: editingService.maxRestarts,
    });

    setEditingService(null);
    addToast("Service updated", "success");
  }, [editingService, updateService, addToast]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const categories: Service["category"][] = ["dev", "database", "container", "custom"];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-[800px] max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: theme.ui.surface,
          border: `1px solid ${theme.ui.border}`,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${theme.ui.border}` }}
        >
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5" style={{ color: theme.ui.accent }} />
            <h2 className="text-lg font-semibold" style={{ color: theme.ui.text }}>
              Services Dashboard
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: theme.ui.surfaceHover, color: theme.ui.textMuted }}
            >
              {services.filter((s) => s.status === "running").length} running
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-restart toggle */}
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                backgroundColor: autoRestartEnabled ? `${theme.green}20` : theme.ui.surfaceHover,
                color: autoRestartEnabled ? theme.green : theme.ui.textMuted,
              }}
              onClick={() => setAutoRestartEnabled(!autoRestartEnabled)}
            >
              <RefreshCw className="w-3 h-3" />
              Auto-restart {autoRestartEnabled ? "ON" : "OFF"}
            </button>
            {/* Add button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: theme.ui.accent, color: theme.ui.background }}
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
            {/* Close */}
            <button
              className="p-1.5 rounded-lg transition-colors hover:brightness-110"
              style={{ color: theme.ui.textMuted }}
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Server className="w-12 h-12 mb-4" style={{ color: theme.ui.textMuted }} />
              <p className="text-lg font-medium mb-2" style={{ color: theme.ui.text }}>
                No services configured
              </p>
              <p className="text-sm mb-4" style={{ color: theme.ui.textMuted }}>
                Add a service to manage background processes
              </p>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.background }}
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4" />
                Add Your First Service
              </button>
            </div>
          ) : (
            categories.map((category) => {
              const categoryServices = groupedServices[category] || [];
              if (categoryServices.length === 0) return null;

              const isExpanded = expandedCategories.has(category);
              const categoryLabels = {
                dev: "Development",
                database: "Databases",
                container: "Containers",
                custom: "Custom",
              };

              return (
                <div key={category}>
                  {/* Category Header */}
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-colors"
                    style={{ color: theme.ui.textMuted }}
                    onClick={() => toggleCategory(category)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {categoryIcons[category]}
                    <span className="text-sm font-medium">{categoryLabels[category]}</span>
                    <span className="text-xs">({categoryServices.length})</span>
                  </button>

                  {/* Services */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 mt-2 ml-6"
                      >
                        {categoryServices.map((service) => (
                          <motion.div
                            key={service.id}
                            layout
                            className="flex items-center gap-4 p-3 rounded-lg"
                            style={{
                              backgroundColor: theme.ui.background,
                              border: `1px solid ${theme.ui.border}`,
                            }}
                          >
                            {/* Status indicator */}
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-lg"
                              style={{
                                backgroundColor: `${statusColors[service.status]}20`,
                                color: statusColors[service.status],
                              }}
                            >
                              {service.icon ? (
                                <span className="text-lg">{service.icon}</span>
                              ) : (
                                statusIcons[service.status]
                              )}
                            </div>

                            {/* Service info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate" style={{ color: theme.ui.text }}>
                                  {service.name}
                                </span>
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: `${statusColors[service.status]}20`,
                                    color: statusColors[service.status],
                                  }}
                                >
                                  {service.status}
                                </span>
                                {service.autoRestart && (
                                  <span title={`Auto-restart (${service.restartCount}/${service.maxRestarts})`}>
                                    <RefreshCw
                                      className="w-3 h-3"
                                      style={{ color: theme.ui.textMuted }}
                                    />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <code
                                  className="text-xs truncate max-w-[200px]"
                                  style={{ color: theme.ui.textMuted }}
                                >
                                  {service.command}
                                </code>
                                {service.status === "running" && (
                                  <>
                                    <span className="flex items-center gap-1 text-xs" style={{ color: theme.ui.textMuted }}>
                                      <Clock className="w-3 h-3" />
                                      {formatUptime(service.startedAt)}
                                    </span>
                                    {service.cpu !== undefined && (
                                      <span className="flex items-center gap-1 text-xs" style={{ color: theme.cyan }}>
                                        <Cpu className="w-3 h-3" />
                                        {service.cpu.toFixed(1)}%
                                      </span>
                                    )}
                                    {service.memory !== undefined && (
                                      <span className="flex items-center gap-1 text-xs" style={{ color: theme.magenta }}>
                                        <MemoryStick className="w-3 h-3" />
                                        {formatBytes(service.memory)}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {service.status === "running" ? (
                                <>
                                  <button
                                    className="p-1.5 rounded-lg transition-colors hover:brightness-125"
                                    style={{ color: theme.yellow }}
                                    onClick={() => handleRestart(service.id)}
                                    title="Restart"
                                  >
                                    <RotateCw className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-1.5 rounded-lg transition-colors hover:brightness-125"
                                    style={{ color: theme.red }}
                                    onClick={() => handleStop(service.id)}
                                    title="Stop"
                                  >
                                    <Square className="w-4 h-4" />
                                  </button>
                                </>
                              ) : service.status === "stopped" || service.status === "crashed" ? (
                                <button
                                  className="p-1.5 rounded-lg transition-colors hover:brightness-125"
                                  style={{ color: theme.green }}
                                  onClick={() => handleStart(service.id)}
                                  title="Start"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              ) : null}
                              <button
                                className="p-1.5 rounded-lg transition-colors hover:brightness-125"
                                style={{ color: theme.ui.textMuted }}
                                onClick={() => setEditingService(service)}
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 rounded-lg transition-colors hover:brightness-125"
                                style={{ color: theme.red }}
                                onClick={() => handleDelete(service.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Add Service Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-[500px] rounded-xl overflow-hidden"
              style={{
                backgroundColor: theme.ui.surface,
                border: `1px solid ${theme.ui.border}`,
              }}
            >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: `1px solid ${theme.ui.border}` }}
              >
                <h3 className="text-lg font-semibold" style={{ color: theme.ui.text }}>
                  Add Service
                </h3>
                <button
                  className="p-1 rounded-lg"
                  style={{ color: theme.ui.textMuted }}
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Templates */}
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: theme.ui.textMuted }}>
                    Quick Add from Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {templates.slice(0, 6).map((template) => (
                      <button
                        key={template.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: theme.ui.background,
                          border: `1px solid ${theme.ui.border}`,
                          color: theme.ui.text,
                        }}
                        onClick={() => handleAddFromTemplate(template)}
                      >
                        <span className="text-lg">{template.icon}</span>
                        <span className="text-sm truncate">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: theme.ui.border }} />
                  <span className="text-xs px-2" style={{ color: theme.ui.textMuted }}>
                    or create custom
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: theme.ui.border }} />
                </div>

                {/* Custom Service Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="My Service"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: theme.ui.background,
                        border: `1px solid ${theme.ui.border}`,
                        color: theme.ui.text,
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                      Command
                    </label>
                    <input
                      type="text"
                      value={newService.command}
                      onChange={(e) => setNewService({ ...newService, command: e.target.value })}
                      placeholder="pnpm dev"
                      className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                      style={{
                        backgroundColor: theme.ui.background,
                        border: `1px solid ${theme.ui.border}`,
                        color: theme.ui.text,
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                      Working Directory (optional)
                    </label>
                    <input
                      type="text"
                      value={newService.cwd}
                      onChange={(e) => setNewService({ ...newService, cwd: e.target.value })}
                      placeholder="~/projects/my-app"
                      className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                      style={{
                        backgroundColor: theme.ui.background,
                        border: `1px solid ${theme.ui.border}`,
                        color: theme.ui.text,
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                        Category
                      </label>
                      <select
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value as Service["category"] })}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                          backgroundColor: theme.ui.background,
                          border: `1px solid ${theme.ui.border}`,
                          color: theme.ui.text,
                        }}
                      >
                        <option value="dev">Development</option>
                        <option value="database">Database</option>
                        <option value="container">Container</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                        Max Restarts
                      </label>
                      <input
                        type="number"
                        value={newService.maxRestarts}
                        onChange={(e) => setNewService({ ...newService, maxRestarts: parseInt(e.target.value) || 3 })}
                        min={0}
                        max={10}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                          backgroundColor: theme.ui.background,
                          border: `1px solid ${theme.ui.border}`,
                          color: theme.ui.text,
                        }}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newService.autoRestart}
                      onChange={(e) => setNewService({ ...newService, autoRestart: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: theme.ui.text }}>
                      Auto-restart on crash
                    </span>
                  </label>
                </div>

                <button
                  className="w-full py-2.5 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: theme.ui.accent, color: theme.ui.background }}
                  onClick={handleAddService}
                >
                  Add Service
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Service Modal */}
      <AnimatePresence>
        {editingService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={(e) => e.target === e.currentTarget && setEditingService(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-[450px] rounded-xl overflow-hidden"
              style={{
                backgroundColor: theme.ui.surface,
                border: `1px solid ${theme.ui.border}`,
              }}
            >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: `1px solid ${theme.ui.border}` }}
              >
                <h3 className="text-lg font-semibold" style={{ color: theme.ui.text }}>
                  Edit Service
                </h3>
                <button
                  className="p-1 rounded-lg"
                  style={{ color: theme.ui.textMuted }}
                  onClick={() => setEditingService(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingService.name}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      backgroundColor: theme.ui.background,
                      border: `1px solid ${theme.ui.border}`,
                      color: theme.ui.text,
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                    Command
                  </label>
                  <input
                    type="text"
                    value={editingService.command}
                    onChange={(e) => setEditingService({ ...editingService, command: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                    style={{
                      backgroundColor: theme.ui.background,
                      border: `1px solid ${theme.ui.border}`,
                      color: theme.ui.text,
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                    Working Directory
                  </label>
                  <input
                    type="text"
                    value={editingService.cwd || ""}
                    onChange={(e) => setEditingService({ ...editingService, cwd: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                    style={{
                      backgroundColor: theme.ui.background,
                      border: `1px solid ${theme.ui.border}`,
                      color: theme.ui.text,
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                      Category
                    </label>
                    <select
                      value={editingService.category}
                      onChange={(e) => setEditingService({ ...editingService, category: e.target.value as Service["category"] })}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: theme.ui.background,
                        border: `1px solid ${theme.ui.border}`,
                        color: theme.ui.text,
                      }}
                    >
                      <option value="dev">Development</option>
                      <option value="database">Database</option>
                      <option value="container">Container</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm mb-1 block" style={{ color: theme.ui.textMuted }}>
                      Max Restarts
                    </label>
                    <input
                      type="number"
                      value={editingService.maxRestarts}
                      onChange={(e) => setEditingService({ ...editingService, maxRestarts: parseInt(e.target.value) || 3 })}
                      min={0}
                      max={10}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: theme.ui.background,
                        border: `1px solid ${theme.ui.border}`,
                        color: theme.ui.text,
                      }}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.autoRestart}
                    onChange={(e) => setEditingService({ ...editingService, autoRestart: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm" style={{ color: theme.ui.text }}>
                    Auto-restart on crash
                  </span>
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    className="flex-1 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: theme.ui.surfaceHover, color: theme.ui.text }}
                    onClick={() => setEditingService(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: theme.ui.accent, color: theme.ui.background }}
                    onClick={handleUpdateService}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
