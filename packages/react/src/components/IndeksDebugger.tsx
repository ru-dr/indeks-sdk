import React, { useState, useEffect } from "react";
import { useIndeks } from "../hooks/useIndeks";
import type { IndeksEvent } from "@indeks/shared";

export interface IndeksDebuggerProps {
  /** Position of the debugger panel */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum number of events to display */
  maxEvents?: number;
}

/**
 * Debug component to visualize tracked events in development
 * Shows real-time events, session info, and event statistics
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <IndeksProvider apiKey="your-api-key">
 *       {process.env.NODE_ENV === 'development' && (
 *         <IndeksDebugger position="bottom-right" refreshInterval={1000} />
 *       )}
 *       <YourApp />
 *     </IndeksProvider>
 *   );
 * }
 * ```
 */
export const IndeksDebugger: React.FC<IndeksDebuggerProps> = ({
  position = "bottom-right",
  refreshInterval = 1000,
  maxEvents = 50,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [events, setEvents] = useState<IndeksEvent[]>([]);
  const { tracker, sessionId, userId, isInitialized } = useIndeks();

  const refresh = () => {
    if (!tracker) return;
    setEvents(tracker.getEvents());
  };

  const clearEvents = () => {
    if (!tracker) return;
    tracker.clearEvents();
    setEvents([]);
  };

  useEffect(() => {
    if (!tracker || !isInitialized) return;

    refresh();

    if (refreshInterval) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [tracker, isInitialized, refreshInterval]);

  const positionStyles: Record<string, React.CSSProperties> = {
    "top-right": { top: "1rem", right: "1rem" },
    "top-left": { top: "1rem", left: "1rem" },
    "bottom-right": { bottom: "1rem", right: "1rem" },
    "bottom-left": { bottom: "1rem", left: "1rem" },
  };

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    ...positionStyles[position],
    zIndex: 9999,
    fontFamily: "monospace",
    fontSize: "12px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    backgroundColor: "#1e293b",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
  };

  const panelStyle: React.CSSProperties = {
    marginTop: "8px",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    borderRadius: "8px",
    padding: "16px",
    maxWidth: "500px",
    maxHeight: "600px",
    overflow: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  };

  const eventItemStyle: React.CSSProperties = {
    padding: "8px",
    margin: "4px 0",
    backgroundColor: "#334155",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #475569",
  };

  const count = events.length;
  const displayedEvents = events.slice(-maxEvents);
  const eventTypes = new Set(events.map((e: IndeksEvent) => e.type));

  if (!isInitialized) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <button style={buttonStyle} onClick={() => setIsOpen(!isOpen)}>
        🔍 Indeks Debug ({count})
      </button>

      {isOpen && (
        <div style={panelStyle}>
          <div style={headerStyle}>
            <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
              📊 Indeks Analytics Debugger
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              Session: {sessionId?.substring(0, 12)}...
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              User: {userId?.substring(0, 12)}...
            </div>
            <div
              style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}
            >
              Event Types: {eventTypes.size} | Total: {count}
            </div>
          </div>

          <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
            <button
              style={{ ...buttonStyle, padding: "4px 8px", flex: 1 }}
              onClick={refresh}
            >
              🔄 Refresh
            </button>
            <button
              style={{
                ...buttonStyle,
                padding: "4px 8px",
                flex: 1,
                backgroundColor: "#dc2626",
              }}
              onClick={clearEvents}
            >
              🗑️ Clear
            </button>
          </div>

          <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
            Recent Events:
          </div>

          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            {displayedEvents.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                No events tracked yet
              </div>
            ) : (
              displayedEvents.reverse().map((event, index) => (
                <div
                  key={index}
                  style={eventItemStyle}
                  onClick={() =>
                    setSelectedEvent(selectedEvent === event ? null : event)
                  }
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#60a5fa", fontWeight: "bold" }}>
                      {event.type}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "10px" }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {selectedEvent === event && (
                    <pre
                      style={{
                        marginTop: "8px",
                        padding: "8px",
                        backgroundColor: "#0f172a",
                        borderRadius: "4px",
                        overflow: "auto",
                        maxHeight: "200px",
                        fontSize: "10px",
                      }}
                    >
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
