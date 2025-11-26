'use client';

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
  MousePointerClick,
  FileText,
  Scroll,
  AlertCircle,
  Clock,
  BarChart3,
} from "lucide-react";

// Indeks Brand Colors (exact from your globals.css)
const INDEKS_COLORS = {
  blue: '#3B82F6',      // indeks-blue
  yellow: '#FBBF24',    // indeks-yellow  
  orange: '#FB923C',    // indeks-orange
  green: '#4ADE80',     // indeks-green
  black: '#0A0A0A',     // indeks-black
  white: '#FAFAFA',     // indeks-white
};

// Indeks Logo Icon Component
const IndeksIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size * (68/60)} 
    viewBox="0 0 60 68" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect y="0.559998" width="3" height="67" fill="#00A8E8"/>
    <rect x="8" y="0.559998" width="6" height="67" fill="#FFD60A"/>
    <rect x="19" y="0.559998" width="12" height="67" fill="#FF6B35"/>
    <rect x="36" y="0.559998" width="24" height="67" fill="#06FFA5"/>
  </svg>
);

export interface IndeksDebuggerProps {
  refreshInterval?: number;
  maxEvents?: number;
}

export const IndeksDebugger: React.FC<IndeksDebuggerProps> = ({
  refreshInterval = 1000,
  maxEvents = 50,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IndeksEvent | null>(null);
  const [events, setEvents] = useState<IndeksEvent[]>([]);
  const [buttonHover, setButtonHover] = useState(false);
  const { tracker, sessionId, userId, isInitialized, config } = useIndeks();

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
    const size = 16;
    switch (type) {
      case "click":
        return <MousePointerClick size={size} style={{ color: INDEKS_COLORS.blue }} />;
      case "pageview":
        return <FileText size={size} style={{ color: INDEKS_COLORS.green }} />;
      case "scroll":
      case "scroll_depth":
        return <Scroll size={size} style={{ color: INDEKS_COLORS.yellow }} />;
      case "error":
        return <AlertCircle size={size} style={{ color: '#EF4444' }} />;
      default:
        return <Activity size={size} style={{ color: INDEKS_COLORS.orange }} />;
    }
  };

  return (
    <>
      {/* Floating Trigger Button - Transparent outline style, icon only */}
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setButtonHover(true)}
        onMouseLeave={() => setButtonHover(false)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          border: `1.5px solid ${buttonHover ? INDEKS_COLORS.green : 'rgba(74, 222, 128, 0.5)'}`,
          background: buttonHover ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
          color: INDEKS_COLORS.green,
          cursor: 'pointer',
          transition: 'all 0.2s',
          transform: buttonHover ? 'translateY(-2px)' : 'translateY(0)',
          backdropFilter: 'blur(8px)',
        }}
        title={`Indeks Debug${count > 0 ? ` (${count} events)` : ''}${config?.localOnly ? ' - LOCAL' : ''}`}
      >
        <IndeksIcon size={20} />
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            borderRadius: '9px',
            background: INDEKS_COLORS.green,
            color: INDEKS_COLORS.black,
            fontSize: '10px',
            fontWeight: '700',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dialog Modal - Matches your auth card design */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal Content */}
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '85vh',
                background: '#1A1A1A',  // Same as auth card
                border: '1px solid #2A2A2A',  // Same as auth card
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Colored Top Border - Same as auth card */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                height: '4px',
                zIndex: 10,
              }}>
                <div style={{ flex: 1, background: INDEKS_COLORS.blue }} />
                <div style={{ flex: 1, background: INDEKS_COLORS.yellow }} />
                <div style={{ flex: 1, background: INDEKS_COLORS.orange }} />
                <div style={{ flex: 1, background: INDEKS_COLORS.green }} />
              </div>

              {/* Content */}
              <div style={{ padding: '24px', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflow: 'hidden' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: `${INDEKS_COLORS.blue}15`,
                    }}>
                      <Activity size={24} style={{ color: INDEKS_COLORS.blue }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{
                          fontSize: '24px',
                          fontWeight: '700',
                          color: '#FAFAFA',
                          margin: 0,
                        }}>
                          Indeks Analytics Debugger
                        </h2>
                        {config?.localOnly && (
                          <span style={{
                            display: 'inline-flex',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: 'rgba(251, 191, 36, 0.15)',
                            border: '1px solid rgba(251, 191, 36, 0.25)',
                            color: INDEKS_COLORS.yellow,
                            fontSize: '12px',
                            fontWeight: '700',
                          }}>
                            LOCAL ONLY MODE
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: '#9CA3AF',
                        marginTop: '4px',
                        margin: 0,
                      }}>
                        {config?.localOnly
                          ? "Events tracked locally only (not sent to API)"
                          : "Real-time event monitoring"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2A2A2A';
                      e.currentTarget.style.color = '#FAFAFA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#9CA3AF';
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderRadius: '12px',
                    border: '1px solid #2A2A2A',
                    background: '#0D0D0D',
                    padding: '16px',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#9CA3AF',
                    }}>
                      <Hash size={14} />
                      <span>Session ID</span>
                    </div>
                    <p style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: '600',
                      color: '#FAFAFA',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {sessionId ? `${sessionId.substring(0, 16)}...` : 'Not initialized'}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderRadius: '12px',
                    border: '1px solid #2A2A2A',
                    background: '#0D0D0D',
                    padding: '16px',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#9CA3AF',
                    }}>
                      <User size={14} />
                      <span>User ID</span>
                    </div>
                    <p style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: '600',
                      color: '#FAFAFA',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {userId ? `${userId.substring(0, 16)}...` : 'Not initialized'}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderRadius: '12px',
                    border: '1px solid #2A2A2A',
                    background: '#0D0D0D',
                    padding: '16px',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#9CA3AF',
                    }}>
                      <BarChart3 size={14} />
                      <span>Statistics</span>
                    </div>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#FAFAFA',
                      margin: 0,
                    }}>
                      {eventTypes.size} types · {count} total
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={refresh}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '36px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      border: '1px solid #2A2A2A',
                      background: '#0D0D0D',
                      color: '#FAFAFA',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2A2A2A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0D0D0D';
                    }}
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                  <button
                    onClick={clearEvents}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '36px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#FCA5A5',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    <Trash2 size={14} />
                    Clear All
                  </button>
                  <div style={{
                    marginLeft: 'auto',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}>
                    Auto-refresh: {refreshInterval}ms
                  </div>
                </div>

                {/* Events List Container */}
                <div style={{
                  flex: 1,
                  borderRadius: '12px',
                  border: '1px solid #2A2A2A',
                  background: '#0D0D0D',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                  }}>
                    {!isInitialized ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '400px',
                        color: '#6B7280',
                      }}>
                        <Activity size={48} style={{ opacity: 0.2, marginBottom: 12 }} className="animate-pulse" />
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                          Initializing tracker...
                        </p>
                        <p style={{ fontSize: '12px', opacity: 0.7, marginTop: 4 }}>
                          Please wait while the SDK initializes
                        </p>
                      </div>
                    ) : displayedEvents.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '400px',
                        color: '#6B7280',
                      }}>
                        <Activity size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                          No events tracked yet
                        </p>
                        <p style={{ fontSize: '12px', opacity: 0.7, marginTop: 4 }}>
                          Interact with the page to see events
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[...displayedEvents].reverse().map((event, index) => {
                          const isSelected = selectedEvent === event;
                          return (
                            <div
                              key={index}
                              onClick={() => setSelectedEvent(isSelected ? null : event)}
                              style={{
                                borderRadius: '10px',
                                border: isSelected 
                                  ? `1px solid ${INDEKS_COLORS.blue}` 
                                  : '1px solid rgba(42, 42, 42, 0.8)',
                                background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.5)';
                                  e.currentTarget.style.borderColor = '#2A2A2A';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'rgba(42, 42, 42, 0.8)';
                                }
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px',
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  flex: 1,
                                  minWidth: 0,
                                }}>
                                  {getEventIcon(event.type)}
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#FAFAFA',
                                  }}>
                                    {event.type}
                                  </span>
                                  <span style={{
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    color: '#6B7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {event.url?.substring(0, 60)}
                                    {(event.url?.length || 0) > 60 ? "..." : ""}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    color: '#6B7280',
                                  }}>
                                    <Clock size={12} />
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                  </div>
                                  {isSelected ? (
                                    <ChevronDown size={16} style={{ color: '#9CA3AF' }} />
                                  ) : (
                                    <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div style={{ padding: '0 14px 14px' }}>
                                  <div style={{
                                    borderRadius: '8px',
                                    background: '#000000',
                                    border: '1px solid rgba(42, 42, 42, 0.8)',
                                    padding: '12px',
                                  }}>
                                    <pre style={{
                                      fontSize: '12px',
                                      fontFamily: 'monospace',
                                      color: '#D1D5DB',
                                      margin: 0,
                                      overflow: 'auto',
                                      maxHeight: '300px',
                                    }}>
                                      {JSON.stringify(event, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(42, 42, 42, 0.8)',
                  fontSize: '12px',
                  color: '#6B7280',
                }}>
                  <span>Indeks SDK v1.4.1</span>
                  <span>Showing {displayedEvents.length} of {count} events</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
};
