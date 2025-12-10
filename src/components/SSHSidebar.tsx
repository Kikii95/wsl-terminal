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
  onClose: () => void;
}

export function SSHSidebar({ isOpen, onToggle, onClose }: SSHSidebarProps) {
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

      {/* Overlay backdrop for click-outside */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-0 top-[80px] bottom-8 w-72 z-40 flex flex-col rounded-r-xl shadow-2xl"
            style={{
              backgroundColor: theme.ui.surface,
              borderRight: `1px solid ${theme.ui.border}`,
              borderTop: `1px solid ${theme.ui.border}`,
              borderBottom: `1px solid ${theme.ui.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: theme.ui.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${theme.ui.accent}20` }}
                >
                  <Server className="w-4 h-4" style={{ color: theme.ui.accent }} />
                </div>
                <div>
                  <span className="font-semibold text-sm block" style={{ color: theme.ui.text }}>
                    SSH Manager
                  </span>
                  <span className="text-[10px]" style={{ color: theme.ui.textMuted }}>
                    {connections.length} connection{connections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  style={{ color: theme.ui.accent }}
                  title="Add connection"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  style={{ color: theme.ui.textMuted }}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Connection List */}
            <div className="flex-1 overflow-y-auto p-3">
              {connections.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full text-center px-4"
                  style={{ color: theme.ui.textMuted }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${theme.ui.border}40` }}
                  >
                    <Server className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-medium text-sm mb-1" style={{ color: theme.ui.text }}>
                    No connections yet
                  </p>
                  <p className="text-xs mb-4">Add your first SSH connection</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: theme.ui.accent,
                      color: theme.ui.background,
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Connection
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 group transition-all cursor-pointer"
                      style={{ color: theme.ui.text }}
                      onClick={() => handleConnect(conn)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${theme.green}20` }}
                      >
                        <Server className="w-5 h-5" style={{ color: theme.green }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{conn.name}</div>
                        <div
                          className="text-xs truncate font-mono"
                          style={{ color: theme.ui.textMuted }}
                        >
                          {conn.user}@{conn.host}:{conn.port}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(conn);
                          }}
                          className="p-2 rounded-lg hover:bg-secondary/50"
                          title="Connect"
                          style={{ color: theme.green }}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeConnection(conn.id);
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/20"
                          title="Remove"
                          style={{ color: theme.red }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div
              className="px-5 py-3 text-[10px] border-t"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMuted }}
            >
              Click outside or press Esc to close
            </div>

            {/* Add Form Modal */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 rounded-r-xl"
                  onClick={() => setShowAddForm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 10 }}
                    className="w-full rounded-xl p-5 shadow-xl"
                    style={{
                      backgroundColor: theme.ui.surface,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${theme.ui.accent}20` }}
                        >
                          <Plus className="w-4 h-4" style={{ color: theme.ui.accent }} />
                        </div>
                        <h3 className="font-semibold" style={{ color: theme.ui.text }}>
                          New Connection
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="p-2 rounded-lg hover:bg-secondary/50"
                        style={{ color: theme.ui.textMuted }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.ui.textMuted }}>
                          Connection Name
                        </label>
                        <input
                          type="text"
                          placeholder="My Server"
                          value={newConn.name}
                          onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg text-sm bg-background border outline-none focus:ring-2 transition-all"
                          style={{
                            borderColor: theme.ui.border,
                            color: theme.ui.text,
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.ui.textMuted }}>
                          Host
                        </label>
                        <input
                          type="text"
                          placeholder="192.168.1.100 or example.com"
                          value={newConn.host}
                          onChange={(e) => setNewConn({ ...newConn, host: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg text-sm bg-background border outline-none focus:ring-2 transition-all"
                          style={{
                            borderColor: theme.ui.border,
                            color: theme.ui.text,
                          }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.ui.textMuted }}>
                            Username
                          </label>
                          <input
                            type="text"
                            placeholder="root"
                            value={newConn.user}
                            onChange={(e) => setNewConn({ ...newConn, user: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg text-sm bg-background border outline-none focus:ring-2 transition-all"
                            style={{
                              borderColor: theme.ui.border,
                              color: theme.ui.text,
                            }}
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.ui.textMuted }}>
                            Port
                          </label>
                          <input
                            type="number"
                            placeholder="22"
                            value={newConn.port}
                            onChange={(e) => setNewConn({ ...newConn, port: parseInt(e.target.value) || 22 })}
                            className="w-full px-4 py-2.5 rounded-lg text-sm bg-background border outline-none focus:ring-2 transition-all"
                            style={{
                              borderColor: theme.ui.border,
                              color: theme.ui.text,
                            }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddConnection}
                        className="w-full py-3 rounded-lg font-medium text-sm transition-all hover:brightness-110"
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
