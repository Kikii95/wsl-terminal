import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useTheme } from "@/App";

interface SearchBarProps {
  onSearch: (query: string, direction: "next" | "prev") => void;
  onClose: () => void;
}

export function SearchBar({ onSearch, onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSearch(query, e.shiftKey ? "prev" : "next");
      } else if (e.key === "F3") {
        e.preventDefault();
        onSearch(query, e.shiftKey ? "prev" : "next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, onSearch, onClose]);

  // Search on query change
  useEffect(() => {
    if (query) {
      onSearch(query, "next");
    }
  }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-2 right-2 z-50 flex items-center gap-1 p-1.5 rounded-lg shadow-lg border"
      style={{
        backgroundColor: theme.ui.surface,
        borderColor: theme.ui.border,
      }}
    >
      {/* Search Icon */}
      <Search className="w-4 h-4 ml-1" style={{ color: theme.ui.textMuted }} />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-48 px-2 py-1 text-sm bg-transparent outline-none"
        style={{ color: theme.ui.text }}
      />

      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5">
        <button
          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-secondary"
          onClick={() => onSearch(query, "prev")}
          title="Previous (Shift+Enter)"
          style={{ color: theme.ui.textMuted }}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-secondary"
          onClick={() => onSearch(query, "next")}
          title="Next (Enter)"
          style={{ color: theme.ui.textMuted }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Close button */}
      <button
        className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-secondary ml-1"
        onClick={onClose}
        title="Close (Escape)"
        style={{ color: theme.ui.textMuted }}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
