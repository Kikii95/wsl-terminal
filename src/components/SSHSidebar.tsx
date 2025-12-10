import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Play,
  X,
} from "lucide-react";
import { useSSHStore, SSHConnection } from "@/stores/sshStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useTheme } from "@/App";

interface SSHSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SSHSidebar({ isOpen, onToggle }: SSHSidebarProps) {
  const theme = useTheme();
  const { connections, addConnection, removeConnection } = useSSHStore();
  const { addTab } = useTerminalStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConn, setNewConn] = useState({
    name: "",
    host: "",
    port: 22,
    user: "",
  });

  const handleConnect = (_conn: SSHConnection) => {
    // Create a new tab with SSH command
    addTab("wsl");
    // The SSH command will be typed into the terminal
    // This is a simple approach - a more advanced version would
    // spawn SSH directly
  };

  const handleAddConnection = () => {
    if (newConn.name && newConn.host && newConn.user) {
      addConnection(newConn);
      setNewConn({ name: "", host: "", port: 22, user: "" });
      setShowAddForm(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 p-1.5 rounded-r-lg transition-colors"
        style={{
          backgroundColor: theme.ui.surface,
          color: theme.ui.textMuted,
          borderTop: `1px solid ${theme.ui.border}`,
          borderRight: `1px solid ${theme.ui.border}`,
          borderBottom: `1px solid ${theme.ui.border}`,
        }}
        title="SSH Manager"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 top-[72px] bottom-6 w-64 z-40 flex flex-col"
            style={{
              backgroundColor: theme.ui.surface,
              borderRight: `1px solid ${theme.ui.border}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: theme.ui.border }}
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" style={{ color: theme.ui.accent }} />
                <span className="font-medium text-sm" style={{ color: theme.ui.text }}>
                  SSH Manager
                </span>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="p-1 rounded hover:bg-secondary/50 transition-colors"
                style={{ color: theme.ui.textMuted }}
                title="Add connection"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Connection List */}
            <div className="flex-1 overflow-y-auto py-2">
              {connections.length === 0 ? (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: theme.ui.textMuted }}
                >
                  <Server className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No SSH connections</p>
                  <p className="text-xs mt-1">Click + to add one</p>
                </div>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center gap-2 px-3 py-2 mx-2 rounded-lg hover:bg-secondary/30 group transition-colors"
                    style={{ color: theme.ui.text }}
                  >
                    <Server className="w-4 h-4 flex-shrink-0" style={{ color: theme.ui.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{conn.name}</div>
                      <div
                        className="text-xs truncate"
                        style={{ color: theme.ui.textMuted }}
                      >
                        {conn.user}@{conn.host}:{conn.port}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleConnect(conn)}
                        className="p-1 rounded hover:bg-secondary/50"
                        title="Connect"
                        style={{ color: theme.green }}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeConnection(conn.id)}
                        className="p-1 rounded hover:bg-secondary/50"
                        title="Remove"
                        style={{ color: theme.red }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Form Modal */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-sm rounded-lg p-4"
                    style={{
                      backgroundColor: theme.ui.surface,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium" style={{ color: theme.ui.text }}>
                        New SSH Connection
                      </h3>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="p-1 rounded hover:bg-secondary/50"
                        style={{ color: theme.ui.textMuted }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Connection name"
                        value={newConn.name}
                        onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                        className="w-full px-3 py-2 rounded text-sm bg-background border outline-none focus:ring-1"
                        style={{
                          borderColor: theme.ui.border,
                          color: theme.ui.text,
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Host"
                        value={newConn.host}
                        onChange={(e) => setNewConn({ ...newConn, host: e.target.value })}
                        className="w-full px-3 py-2 rounded text-sm bg-background border outline-none focus:ring-1"
                        style={{
                          borderColor: theme.ui.border,
                          color: theme.ui.text,
                        }}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="User"
                          value={newConn.user}
                          onChange={(e) => setNewConn({ ...newConn, user: e.target.value })}
                          className="flex-1 px-3 py-2 rounded text-sm bg-background border outline-none focus:ring-1"
                          style={{
                            borderColor: theme.ui.border,
                            color: theme.ui.text,
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Port"
                          value={newConn.port}
                          onChange={(e) => setNewConn({ ...newConn, port: parseInt(e.target.value) || 22 })}
                          className="w-20 px-3 py-2 rounded text-sm bg-background border outline-none focus:ring-1"
                          style={{
                            borderColor: theme.ui.border,
                            color: theme.ui.text,
                          }}
                        />
                      </div>
                      <button
                        onClick={handleAddConnection}
                        className="w-full py-2 rounded font-medium text-sm transition-colors"
                        style={{
                          backgroundColor: theme.ui.accent,
                          color: theme.ui.background,
                        }}
                      >
                        Add Connection
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
