import React, { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeEventData } from "@indeks/shared";
import type { IndeksEvent } from "@indeks/shared";
import { useIndeks } from "../hooks/useIndeks";
import { styles, theme } from "./theme";

export interface IndeksDebuggerProps {
  refreshInterval?: number;
  maxEvents?: number;
}

const stripe = Object.values(theme.brand);

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <p style={styles.cardValue} title={value}>
        {value}
      </p>
    </div>
  );
}

function EventRow({ event }: { event: IndeksEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" style={styles.eventRow} onClick={() => setOpen(!open)}>
        <span style={{ color: theme.brand.blue, fontWeight: 600 }}>{event.type}</span>
        <span style={{ marginLeft: "auto", color: theme.muted }}>
          {formatTime(event.timestamp)}
        </span>
      </button>
      {open && (
        <pre style={styles.payload}>
          {JSON.stringify(sanitizeEventData(event as unknown as Record<string, unknown>), null, 2)}
        </pre>
      )}
    </div>
  );
}

export const IndeksDebugger: React.FC<IndeksDebuggerProps> = ({
  refreshInterval = 1000,
  maxEvents = 50,
}) => {
  const { tracker, sessionId, userId, isInitialized, config } = useIndeks();
  const [isOpen, setIsOpen] = useState(false);
  const eventIds = useRef(new WeakMap<IndeksEvent, number>());
  const nextEventId = useRef(0);
  const idOf = (event: IndeksEvent): number => {
    let id = eventIds.current.get(event);
    if (id === undefined) {
      id = nextEventId.current++;
      eventIds.current.set(event, id);
    }
    return id;
  };
  const [events, setEvents] = useState<IndeksEvent[]>([]);

  const refresh = useCallback(() => {
    if (!tracker) return;
    setEvents(tracker.getEvents().slice(-maxEvents).reverse());
  }, [tracker, maxEvents]);

  useEffect(() => {
    if (!tracker || !isInitialized) return;
    refresh();
    if (!refreshInterval) return;
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [tracker, isInitialized, refreshInterval, refresh]);

  const clear = () => {
    tracker?.clearEvents();
    setEvents([]);
  };

  const types = new Set(events.map((event) => event.type));
  const localOnly = config?.localOnly === true;

  return (
    <>
      <button
        type="button"
        style={styles.trigger}
        onClick={() => setIsOpen(true)}
        title={`Indeks debugger${localOnly ? " (local only)" : ""}`}
        aria-label="Open Indeks debugger"
      >
        <svg width={20} height={22} viewBox="0 0 60 68" aria-hidden="true">
          <rect width="3" height="67" fill={theme.brand.blue} />
          <rect x="8" width="6" height="67" fill={theme.brand.yellow} />
          <rect x="19" width="12" height="67" fill={theme.brand.orange} />
          <rect x="36" width="24" height="67" fill={theme.brand.green} />
        </svg>
        {events.length > 0 && (
          <span style={styles.badge}>{events.length > 99 ? "99+" : events.length}</span>
        )}
      </button>
      {isOpen && (
        <>
          <div style={styles.backdrop} onClick={() => setIsOpen(false)} />
          <div style={styles.overlay}>
            <div style={styles.panel} role="dialog" aria-label="Indeks debugger">
              <div style={styles.stripe}>
                {stripe.map((color) => (
                  <div key={color} style={{ flex: 1, background: color }} />
                ))}
              </div>
              <div style={styles.header}>
                <div>
                  <h2 style={styles.title}>Indeks Debugger</h2>
                  <p style={styles.subtitle}>
                    {localOnly ? "Local only: events are not sent" : "Real-time event monitor"}
                  </p>
                </div>
                <button type="button" style={styles.button} onClick={() => setIsOpen(false)}>
                  Close
                </button>
              </div>
              <div style={styles.grid}>
                <Card label="Session" value={sessionId ?? "-"} />
                <Card label="User" value={userId ?? "-"} />
                <Card label="Statistics" value={`${types.size} types, ${events.length} events`} />
              </div>
              <div style={styles.toolbar}>
                <button type="button" style={styles.button} onClick={refresh}>
                  Refresh
                </button>
                <button type="button" style={styles.button} onClick={clear}>
                  Clear
                </button>
              </div>
              <div style={styles.list}>
                {events.length === 0 ? (
                  <div style={styles.empty}>No events yet</div>
                ) : (
                  events.map((event) => <EventRow key={idOf(event)} event={event} />)
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
