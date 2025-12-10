import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Folder, FolderGit2, ChevronRight, GraduationCap, Home, Briefcase } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "@/App";
import { useTerminalStore } from "@/stores/terminalStore";
import { useConfigStore } from "@/stores/configStore";

interface ProjectInfo {
  name: string;
  path: string;
  category: string;
  has_git: boolean;
}

interface ProjectSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  ecole: <GraduationCap className="w-4 h-4" />,
  perso: <Home className="w-4 h-4" />,
  travail: <Briefcase className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  ecole: "#f9e2af",
  perso: "#89b4fa",
  travail: "#a6e3a1",
};

export function ProjectSwitcher({ isOpen, onClose }: ProjectSwitcherProps) {
  const theme = useTheme();
  const { activeTabId } = useTerminalStore();
  const { projects: projectsConfig } = useConfigStore();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load projects
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      invoke<ProjectInfo[]>("list_projects", {
        rootPath: projectsConfig.rootPath,
        categories: projectsConfig.categories,
      })
        .then((data) => {
          setProjects(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load projects:", err);
          setLoading(false);
        });
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen, projectsConfig]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const lower = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower)
    );
  }, [projects, search]);

  // Group by category
  const groupedProjects = useMemo(() => {
    const groups: Record<string, ProjectInfo[]> = {};
    filteredProjects.forEach((p) => {
      const cat = p.category.split("/")[0];
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProjects]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredProjects.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredProjects[selectedIndex]) {
        e.preventDefault();
        openProject(filteredProjects[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredProjects, selectedIndex, onClose]);

  const openProject = async (project: ProjectInfo) => {
    if (!activeTabId) return;

    try {
      await invoke("write_to_shell", {
        tabId: activeTabId,
        data: `cd "${project.path}" && ls -la\n`,
      });
      onClose();
    } catch (error) {
      console.error("Failed to open project:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-[520px] max-h-[70vh] z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: theme.ui.surface,
              border: `1px solid ${theme.ui.border}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: theme.ui.border }}
            >
              <Folder className="w-4 h-4" style={{ color: theme.blue }} />
              <span className="text-sm font-medium" style={{ color: theme.ui.text }}>
                Project Switcher
              </span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.ui.surfaceHover, color: theme.ui.textMuted }}>
                Ctrl+Shift+O
              </span>
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: theme.ui.border }}
            >
              <Search className="w-4 h-4" style={{ color: theme.ui.textMuted }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: theme.ui.text }}
              />
            </div>

            {/* Projects List */}
            <div className="overflow-y-auto max-h-[400px] p-2">
              {loading ? (
                <div
                  className="text-center py-8 text-sm"
                  style={{ color: theme.ui.textMuted }}
                >
                  Loading projects...
                </div>
              ) : (
                Object.entries(groupedProjects).map(([category, items]) => (
                  <div key={category} className="mb-3">
                    <div
                      className="flex items-center gap-2 px-3 py-1 text-xs font-medium uppercase tracking-wider"
                      style={{ color: categoryColors[category] || theme.ui.textMuted }}
                    >
                      {categoryIcons[category] || <Folder className="w-3 h-3" />}
                      <span>{category}</span>
                      <span style={{ color: theme.ui.textMuted }}>({items.length})</span>
                    </div>
                    {items.map((project) => {
                      const index = filteredProjects.indexOf(project);
                      const isSelected = index === selectedIndex;
                      const subcat = project.category.includes("/")
                        ? project.category.split("/")[1]
                        : null;

                      return (
                        <motion.button
                          key={project.path}
                          onClick={(e) => {
                            e.stopPropagation();
                            openProject(project);
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                          style={{
                            backgroundColor: isSelected ? theme.ui.surfaceHover : "transparent",
                          }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          {project.has_git ? (
                            <FolderGit2
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: isSelected ? theme.ui.accent : theme.green }}
                            />
                          ) : (
                            <Folder
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: isSelected ? theme.ui.accent : theme.ui.textMuted }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm font-medium truncate"
                                style={{ color: theme.ui.text }}
                              >
                                {project.name}
                              </span>
                              {subcat && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: theme.ui.surfaceHover,
                                    color: theme.ui.textMuted,
                                  }}
                                >
                                  {subcat}
                                </span>
                              )}
                            </div>
                            <div
                              className="text-xs truncate"
                              style={{ color: theme.ui.textSubtle }}
                            >
                              {project.path.replace(/^\/home\/[^/]+/, "~")}
                            </div>
                          </div>
                          {isSelected && (
                            <ChevronRight
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: theme.ui.accent }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ))
              )}

              {!loading && filteredProjects.length === 0 && (
                <div
                  className="text-center py-8 text-sm"
                  style={{ color: theme.ui.textMuted }}
                >
                  No projects found
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2 border-t text-xs"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMuted }}
            >
              <span>{filteredProjects.length} projects</span>
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
                <span>Esc Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
