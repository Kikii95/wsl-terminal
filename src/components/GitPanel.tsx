import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  GitCommit as GitCommitIcon,
  Plus,
  Minus,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FolderGit2,
  AlertCircle,
  FileText,
  Loader2,
  ArrowUp,
  ArrowDown,
  Undo2,
} from "lucide-react";
import { useTheme } from "@/App";
import { cn } from "@/lib/utils";

// Match backend types
interface GitStatusFile {
  path: string;
  status: string; // "M", "A", "D", "R", "C", "U", "?"
  staged: boolean;
}

interface GitStatusResult {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitStatusFile[];
}

interface GitBranchInfo {
  name: string;
  current: boolean;
  upstream: string | null;
}

interface GitCommit {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  date: string;
}

interface GitPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cwd?: string;
}

export function GitPanel({ isOpen, onClose, cwd }: GitPanelProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [recentCommits, setRecentCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    staged: true,
    unstaged: true,
    branches: false,
    history: false,
  });
  const [commitMessage, setCommitMessage] = useState("");

  const stagedFiles = status?.files.filter((f) => f.staged) || [];
  const unstagedFiles = status?.files.filter((f) => !f.staged) || [];

  const fetchGitStatus = async () => {
    if (!cwd) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<GitStatusResult>("git_status", { cwd });
      setStatus(result);
    } catch (e) {
      setError(String(e));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!cwd) return;
    try {
      const result = await invoke<GitBranchInfo[]>("git_branches", { cwd });
      setBranches(result);
    } catch (e) {
      console.error("Failed to fetch branches:", e);
    }
  };

  const fetchRecentCommits = async () => {
    if (!cwd) return;
    try {
      const result = await invoke<GitCommit[]>("git_log", { cwd, count: 10 });
      setRecentCommits(result);
    } catch (e) {
      console.error("Failed to fetch commits:", e);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchGitStatus(), fetchBranches(), fetchRecentCommits()]);
  };

  const stageFile = async (path: string) => {
    if (!cwd) return;
    setActionLoading(path);
    try {
      await invoke("git_stage", { cwd, path });
      await fetchGitStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const unstageFile = async (path: string) => {
    if (!cwd) return;
    setActionLoading(path);
    try {
      await invoke("git_unstage", { cwd, path });
      await fetchGitStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const discardFile = async (path: string) => {
    if (!cwd) return;
    setActionLoading(path);
    try {
      await invoke("git_discard", { cwd, path });
      await fetchGitStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const stageAll = async () => {
    if (!cwd) return;
    setActionLoading("stage-all");
    try {
      await invoke("git_stage_all", { cwd });
      await fetchGitStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const commit = async () => {
    if (!cwd || !commitMessage.trim()) return;
    setActionLoading("commit");
    try {
      await invoke("git_commit", { cwd, message: commitMessage });
      setCommitMessage("");
      await refreshAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const checkoutBranch = async (branch: string) => {
    if (!cwd) return;
    setActionLoading(branch);
    try {
      await invoke("git_checkout", { cwd, branch });
      await refreshAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const pull = async () => {
    if (!cwd) return;
    setActionLoading("pull");
    try {
      await invoke("git_pull", { cwd });
      await refreshAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const push = async () => {
    if (!cwd) return;
    setActionLoading("push");
    try {
      await invoke("git_push", { cwd });
      await refreshAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (isOpen && cwd) {
      refreshAll();
    }
  }, [isOpen, cwd]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case "M":
        return <FileText className="w-3 h-3" style={{ color: theme.yellow }} />;
      case "A":
        return <Plus className="w-3 h-3" style={{ color: theme.green }} />;
      case "D":
        return <Minus className="w-3 h-3" style={{ color: theme.red }} />;
      case "R":
        return <RefreshCw className="w-3 h-3" style={{ color: theme.blue }} />;
      case "?":
        return <FileText className="w-3 h-3" style={{ color: theme.cyan }} />;
      default:
        return <FileText className="w-3 h-3" style={{ color: theme.ui.textMuted }} />;
    }
  };

  const getStatusLabel = (fileStatus: string) => {
    switch (fileStatus) {
      case "M":
        return "Modified";
      case "A":
        return "Added";
      case "D":
        return "Deleted";
      case "R":
        return "Renamed";
      case "?":
        return "Untracked";
      default:
        return fileStatus;
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
            <FolderGit2 className="w-5 h-5" style={{ color: theme.ui.accent }} />
            <span className="font-medium" style={{ color: theme.ui.text }}>
              Git
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
          {loading && !status && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.ui.accent }} />
            </div>
          )}

          {error && (
            <div className="p-4">
              <div
                className="flex flex-col gap-1 p-3 rounded-lg"
                style={{ backgroundColor: `${theme.red}20`, color: theme.red }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
                {cwd && (
                  <span className="text-xs opacity-75 ml-6">Path: {cwd}</span>
                )}
              </div>
            </div>
          )}

          {!cwd && (
            <div className="p-4">
              <div
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{ backgroundColor: `${theme.yellow}20`, color: theme.yellow }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">No directory selected</span>
              </div>
            </div>
          )}

          {status && (
            <div className="p-3 space-y-3">
              {/* Branch Info */}
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: theme.ui.background }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4" style={{ color: theme.ui.accent }} />
                  <span className="font-medium" style={{ color: theme.ui.text }}>
                    {status.branch}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: theme.ui.textMuted }}>
                  {status.ahead > 0 && (
                    <span className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" style={{ color: theme.green }} />
                      <span style={{ color: theme.green }}>{status.ahead}</span> ahead
                    </span>
                  )}
                  {status.behind > 0 && (
                    <span className="flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" style={{ color: theme.red }} />
                      <span style={{ color: theme.red }}>{status.behind}</span> behind
                    </span>
                  )}
                  {status.ahead === 0 && status.behind === 0 && status.upstream && (
                    <span>Up to date</span>
                  )}
                  {!status.upstream && (
                    <span>No upstream</span>
                  )}
                </div>
                {/* Push/Pull buttons */}
                {status.upstream && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={pull}
                      disabled={actionLoading === "pull"}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors hover:brightness-110 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.ui.surfaceHover,
                        color: theme.ui.text,
                      }}
                    >
                      {actionLoading === "pull" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                      Pull
                    </button>
                    <button
                      onClick={push}
                      disabled={actionLoading === "push"}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors hover:brightness-110 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.ui.surfaceHover,
                        color: theme.ui.text,
                      }}
                    >
                      {actionLoading === "push" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowUp className="w-3 h-3" />
                      )}
                      Push
                    </button>
                  </div>
                )}
              </div>

              {/* Staged Changes */}
              {stagedFiles.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection("staged")}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedSections.staged ? (
                      <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                    )}
                    <span className="text-sm font-medium" style={{ color: theme.green }}>
                      Staged ({stagedFiles.length})
                    </span>
                  </button>
                  {expandedSections.staged && (
                    <div className="space-y-1 ml-6">
                      {stagedFiles.map((file) => (
                        <div
                          key={`staged-${file.path}`}
                          className="flex items-center justify-between group p-1.5 rounded hover:bg-secondary/30"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getStatusIcon(file.status)}
                            <span
                              className="text-xs truncate"
                              style={{ color: theme.ui.text }}
                              title={`${file.path} (${getStatusLabel(file.status)})`}
                            >
                              {file.path}
                            </span>
                          </div>
                          <button
                            onClick={() => unstageFile(file.path)}
                            disabled={actionLoading === file.path}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-all"
                            title="Unstage"
                          >
                            {actionLoading === file.path ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Minus className="w-3 h-3" style={{ color: theme.red }} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Unstaged Changes */}
              {unstagedFiles.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection("unstaged")}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedSections.unstaged ? (
                      <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                    )}
                    <span className="text-sm font-medium" style={{ color: theme.yellow }}>
                      Changes ({unstagedFiles.length})
                    </span>
                  </button>
                  {expandedSections.unstaged && (
                    <div className="space-y-1 ml-6">
                      {unstagedFiles.map((file) => (
                        <div
                          key={`unstaged-${file.path}`}
                          className="flex items-center justify-between group p-1.5 rounded hover:bg-secondary/30"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getStatusIcon(file.status)}
                            <span
                              className="text-xs truncate"
                              style={{ color: theme.ui.text }}
                              title={`${file.path} (${getStatusLabel(file.status)})`}
                            >
                              {file.path}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {file.status !== "?" && (
                              <button
                                onClick={() => discardFile(file.path)}
                                disabled={actionLoading === file.path}
                                className="p-1 rounded hover:bg-destructive/20"
                                title="Discard changes"
                              >
                                <Undo2 className="w-3 h-3" style={{ color: theme.red }} />
                              </button>
                            )}
                            <button
                              onClick={() => stageFile(file.path)}
                              disabled={actionLoading === file.path}
                              className="p-1 rounded hover:bg-accent/20"
                              title="Stage"
                            >
                              {actionLoading === file.path ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3" style={{ color: theme.green }} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Commit Section */}
              {(stagedFiles.length > 0 || unstagedFiles.length > 0) && (
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: theme.ui.background }}
                >
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className="w-full h-20 p-2 rounded text-sm resize-none outline-none"
                    style={{
                      backgroundColor: theme.ui.surface,
                      color: theme.ui.text,
                      border: `1px solid ${theme.ui.border}`,
                    }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={stageAll}
                      disabled={actionLoading === "stage-all" || unstagedFiles.length === 0}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors hover:brightness-110 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.ui.surfaceHover,
                        color: theme.ui.text,
                      }}
                    >
                      {actionLoading === "stage-all" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Stage All
                    </button>
                    <button
                      onClick={commit}
                      disabled={!commitMessage.trim() || stagedFiles.length === 0 || actionLoading === "commit"}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors hover:brightness-110 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.ui.accent,
                        color: theme.ui.background,
                      }}
                    >
                      {actionLoading === "commit" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Commit
                    </button>
                  </div>
                </div>
              )}

              {/* No changes message */}
              {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
                <div className="text-center py-6" style={{ color: theme.ui.textMuted }}>
                  <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Working tree clean</p>
                </div>
              )}

              {/* Branches */}
              <div>
                <button
                  onClick={() => toggleSection("branches")}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {expandedSections.branches ? (
                    <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  )}
                  <GitBranch className="w-4 h-4" style={{ color: theme.ui.accent }} />
                  <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                    Branches ({branches.filter((b) => !b.name.startsWith("remotes/")).length})
                  </span>
                </button>
                {expandedSections.branches && (
                  <div className="space-y-1 ml-6">
                    {branches
                      .filter((b) => !b.name.startsWith("remotes/"))
                      .map((branch) => (
                        <button
                          key={branch.name}
                          onClick={() => !branch.current && checkoutBranch(branch.name)}
                          disabled={branch.current || actionLoading === branch.name}
                          className={cn(
                            "flex items-center gap-2 w-full p-1.5 rounded text-left transition-colors",
                            branch.current
                              ? "bg-accent/20"
                              : "hover:bg-secondary/30"
                          )}
                        >
                          {actionLoading === branch.name ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span
                              className="text-xs"
                              style={{
                                color: branch.current ? theme.ui.accent : theme.ui.text,
                              }}
                            >
                              {branch.name}
                            </span>
                          )}
                          {branch.current && (
                            <Check className="w-3 h-3 ml-auto" style={{ color: theme.ui.accent }} />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Recent Commits */}
              <div>
                <button
                  onClick={() => toggleSection("history")}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {expandedSections.history ? (
                    <ChevronDown className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
                  )}
                  <GitCommitIcon className="w-4 h-4" style={{ color: theme.magenta }} />
                  <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                    Recent Commits
                  </span>
                </button>
                {expandedSections.history && (
                  <div className="space-y-2 ml-6">
                    {recentCommits.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: theme.ui.textMuted }}>
                        No commits yet
                      </p>
                    ) : (
                      recentCommits.map((commit) => (
                        <div
                          key={commit.hash}
                          className="p-2 rounded"
                          style={{ backgroundColor: theme.ui.background }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: theme.ui.surfaceHover,
                                color: theme.ui.accent,
                              }}
                            >
                              {commit.short_hash}
                            </span>
                            <span className="text-[10px]" style={{ color: theme.ui.textMuted }}>
                              {commit.date}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-2" style={{ color: theme.ui.text }}>
                            {commit.message}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: theme.ui.textMuted }}>
                            {commit.author}
                          </p>
                        </div>
                      ))
                    )}
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
