import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// Error Boundary to catch React errors gracefully
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#1e1e2e",
          color: "#cdd6f4",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center"
        }}>
          <h1 style={{ color: "#f38ba8", marginBottom: "1rem" }}>Something went wrong</h1>
          <p style={{ color: "#a6adc8", marginBottom: "1rem" }}>
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => {
              // Clear localStorage and reload
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#89b4fa",
              color: "#1e1e2e",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Reset & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Clear corrupted localStorage on version mismatch
const APP_VERSION = "0.3.1";
const storedVersion = localStorage.getItem("wsl-terminal-version");
if (storedVersion !== APP_VERSION) {
  // New version - clear potentially incompatible data
  localStorage.removeItem("wsl-terminal-config");
  localStorage.setItem("wsl-terminal-version", APP_VERSION);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
