import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToastStore, ToastType } from "@/stores/toastStore";
import { useTheme } from "@/App";

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<ToastType, string> = {
  success: "#a6e3a1",
  error: "#f38ba8",
  info: "#89b4fa",
  warning: "#f9e2af",
};

export function ToastContainer() {
  const theme = useTheme();
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const color = colorMap[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-[400px]"
              style={{
                backgroundColor: theme.ui.surface,
                border: `1px solid ${theme.ui.border}`,
              }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
              <span className="flex-1 text-sm" style={{ color: theme.ui.text }}>
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                style={{ color: theme.ui.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
