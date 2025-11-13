import React, { useState, useEffect } from "react";
import { useIndeks } from "../hooks/useIndeks";
import type { IndeksEvent } from "@indeks/shared";
import {
  Activity,
  X,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  User,
  Hash,
  Clock,
  MousePointerClick,
  FileText,
  Scroll,
  AlertCircle,
} from "lucide-react";

export interface IndeksDebuggerProps {
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum number of events to display */
  maxEvents?: number;
}

/**
 * Modern debug component to visualize tracked events in development
 * Shows real-time events, session info, and event statistics
 */
export const IndeksDebugger: React.FC<IndeksDebuggerProps> = ({
  refreshInterval = 1000,
  maxEvents = 50,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IndeksEvent | null>(null);
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

  const count = events.length;
  const displayedEvents = events.slice(-maxEvents);
  const eventTypes = new Set(events.map((e: IndeksEvent) => e.type));

  const getEventIcon = (type: string) => {
    const iconProps = { size: 14, className: "text-blue-400" };
    switch (type) {
      case "click":
        return <MousePointerClick {...iconProps} />;
      case "pageview":
        return <FileText {...iconProps} />;
      case "scroll":
        return <Scroll {...iconProps} />;
      case "error":
        return <AlertCircle {...iconProps} className="text-red-400" />;
      default:
        return <Activity {...iconProps} />;
    }
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm"
        style={{
          backdropFilter: "blur(8px)",
        }}
      >
        <Activity size={18} />
        <span>Debug</span>
        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
          {count}
        </span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => setIsOpen(false)}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Modal Panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            style={{
              backdropFilter: "blur(16px)",
              backgroundColor: "rgba(24, 24, 27, 0.95)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Indeks Analytics Debugger
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Real-time event monitoring
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-zinc-800">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <Hash size={12} />
                  <span>Session ID</span>
                </div>
                <p className="text-white text-sm font-mono truncate">
                  {sessionId?.substring(0, 16)}...
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <User size={12} />
                  <span>User ID</span>
                </div>
                <p className="text-white text-sm font-mono truncate">
                  {userId?.substring(0, 16)}...
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <Activity size={12} />
                  <span>Statistics</span>
                </div>
                <p className="text-white text-sm font-medium">
                  {eventTypes.size} types · {count} total
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={clearEvents}
                className="flex items-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-200 rounded-lg transition-colors text-sm"
              >
                <Trash2 size={14} />
                Clear All
              </button>
              <div className="ml-auto text-xs text-zinc-500">
                Auto-refresh: {refreshInterval}ms
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto px-6 py-4">
                {displayedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <Activity size={48} className="mb-3 opacity-20" />
                    <p className="text-sm">No events tracked yet</p>
                    <p className="text-xs mt-1">
                      Interact with the page to see events
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...displayedEvents].reverse().map((event, index) => (
                      <div
                        key={index}
                        className={`rounded-lg border transition-all cursor-pointer ${
                          selectedEvent === event
                            ? "bg-zinc-800 border-blue-500/50"
                            : "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50 hover:border-zinc-600"
                        }`}
                        onClick={() =>
                          setSelectedEvent(selectedEvent === event ? null : event)
                        }
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3 flex-1">
                            {getEventIcon(event.type)}
                            <span className="text-sm font-medium text-white">
                              {event.type}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">
                              {event.url?.substring(0, 40)}
                              {(event.url?.length || 0) > 40 ? "..." : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-zinc-500">
                              <Clock size={12} />
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </div>
                            {selectedEvent === event ? (
                              <ChevronDown size={16} className="text-zinc-400" />
                            ) : (
                              <ChevronRight size={16} className="text-zinc-400" />
                            )}
                          </div>
                        </div>

                        {selectedEvent === event && (
                          <div className="px-3 pb-3 pt-0">
                            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-700/50">
                              <pre className="text-xs text-zinc-300 overflow-auto max-h-64 font-mono">
                                {JSON.stringify(event, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
              <span>Indeks SDK v1.3.4</span>
              <span>Showing {displayedEvents.length} of {count} events</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
