import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, FolderOpen, Plus, Clock, Layers } from "lucide-react";
import { useWorkspaceStore, SavedWorkspace } from "@/stores/workspaceStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useToastStore } from "@/stores/toastStore";
import { useTheme } from "@/App";

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceManager({ isOpen, onClose }: WorkspaceManagerProps) {
  const theme = useTheme();
  const { tabs, addTab, removeTab } = useTerminalStore();
  const { workspaces, saveWorkspace, deleteWorkspace, renameWorkspace } = useWorkspaceStore();
  const { addToast } = useToastStore();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleSaveWorkspace = () => {
    if (!newWorkspaceName.trim()) {
      addToast("Please enter a workspace name", "warning");
      return;
    }
    if (tabs.length === 0) {
      addToast("No tabs to save", "warning");
      return;
    }
    saveWorkspace(newWorkspaceName.trim(), tabs);
    setNewWorkspaceName("");
    addToast(`Workspace "${newWorkspaceName}" saved!`, "success");
  };

  const handleLoadWorkspace = (workspace: SavedWorkspace) => {
    // Close all current tabs
    tabs.forEach((tab) => removeTab(tab.id));

    // Open tabs from workspace
    workspace.tabs.forEach((savedTab) => {
      addTab(savedTab.shell, savedTab.distro, savedTab.cwd);
    });

    addToast(`Loaded workspace "${workspace.name}"`, "success");
    onClose();
  };

  const handleDeleteWorkspace = (id: string, name: string) => {
    deleteWorkspace(id);
    addToast(`Workspace "${name}" deleted`, "info");
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameWorkspace(id, editName.trim());
      addToast("Workspace renamed", "success");
    }
    setEditingId(null);
    setEditName("");
  };

  const startEditing = (workspace: SavedWorkspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: theme.ui.surface,
            border: `1px solid ${theme.ui.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${theme.ui.border}` }}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5" style={{ color: theme.ui.accent }} />
              <h2 className="text-lg font-semibold" style={{ color: theme.ui.text }}>
                Workspace Manager
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: theme.ui.textMuted }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Save New Workspace */}
          <div
            className="p-4"
            style={{ borderBottom: `1px solid ${theme.ui.border}` }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="New workspace name..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: theme.ui.background,
                  color: theme.ui.text,
                  border: `1px solid ${theme.ui.border}`,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSaveWorkspace()}
              />
              <button
                onClick={handleSaveWorkspace}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
                style={{
                  backgroundColor: theme.ui.accent,
                  color: theme.ui.background,
                }}
              >
                <Save className="w-4 h-4" />
                Save Current
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: theme.ui.textMuted }}>
              Save your current {tabs.length} tab{tabs.length !== 1 ? "s" : ""} as a workspace
            </p>
          </div>

          {/* Saved Workspaces List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen
                  className="w-12 h-12 mb-3"
                  style={{ color: theme.ui.textMuted, opacity: 0.5 }}
                />
                <p className="text-sm" style={{ color: theme.ui.textMuted }}>
                  No saved workspaces yet
                </p>
                <p className="text-xs mt-1" style={{ color: theme.ui.textSubtle }}>
                  Save your current tabs as a workspace above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <motion.div
                    key={workspace.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group p-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor: theme.ui.background,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingId === workspace.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => handleRename(workspace.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(workspace.id);
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditName("");
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1 rounded text-sm outline-none"
                            style={{
                              backgroundColor: theme.ui.surfaceHover,
                              color: theme.ui.text,
                              border: `1px solid ${theme.ui.accent}`,
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => startEditing(workspace)}
                            className="font-medium text-left truncate hover:underline"
                            style={{ color: theme.ui.text }}
                          >
                            {workspace.name}
                          </button>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: theme.ui.textMuted }}
                          >
                            <Layers className="w-3 h-3" />
                            {workspace.tabs.length} tab{workspace.tabs.length !== 1 ? "s" : ""}
                          </span>
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: theme.ui.textSubtle }}
                          >
                            <Clock className="w-3 h-3" />
                            {formatDate(workspace.savedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleLoadWorkspace(workspace)}
                          className="p-1.5 rounded transition-colors hover:bg-white/10"
                          style={{ color: theme.green }}
                          title="Load workspace"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                          className="p-1.5 rounded transition-colors hover:bg-white/10"
                          style={{ color: theme.red }}
                          title="Delete workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-3 text-xs"
            style={{
              backgroundColor: theme.ui.background,
              color: theme.ui.textSubtle,
              borderTop: `1px solid ${theme.ui.border}`,
            }}
          >
            <kbd
              className="px-1.5 py-0.5 rounded mr-1"
              style={{
                backgroundColor: theme.ui.surface,
                border: `1px solid ${theme.ui.border}`,
              }}
            >
              Ctrl+Shift+L
            </kbd>
            Open Workspace Manager
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
