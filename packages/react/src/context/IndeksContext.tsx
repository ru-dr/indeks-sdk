import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { IndeksTracker } from '@indeks/core';
import type { IndeksConfig } from '@indeks/shared';

interface IndeksContextValue {
  tracker: IndeksTracker | null;
  isInitialized: boolean;
  sessionId: string | null;
  userId: string | null;
}

const IndeksContext = createContext<IndeksContextValue | undefined>(undefined);

export interface IndeksProviderProps {
  apiKey: string;
  config?: Partial<IndeksConfig>;
  enableConsoleLogging?: boolean;
  children: React.ReactNode;
}

export const Indeks: React.FC<IndeksProviderProps> = ({
  apiKey,
  config = {},
  enableConsoleLogging = false,
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const trackerRef = useRef<IndeksTracker | null>(null);

  useEffect(() => {
    if (!apiKey) {
      console.error('Indeks: API key is required');
      return;
    }

    const fullConfig: IndeksConfig = {
      apiKey,
      enableConsoleLogging,
      ...config,
    };

    const tracker = new IndeksTracker(fullConfig);
    trackerRef.current = tracker;

    tracker
      .init()
      .then(() => {
        setIsInitialized(true);
        setSessionId(tracker.getSessionId());
        setUserId(tracker.getUserId());
      })
      .catch((error: unknown) => {
        console.error('Failed to initialize Indeks tracker:', error);
      });

    return () => {
      if (trackerRef.current) {
        trackerRef.current.destroy();
        trackerRef.current = null;
      }
    };
  }, [apiKey, enableConsoleLogging]);

  const value: IndeksContextValue = {
    tracker: trackerRef.current,
    isInitialized,
    sessionId,
    userId,
  };

  return (
    <IndeksContext.Provider value={value}>
      {children}
    </IndeksContext.Provider>
  );
};

export const useIndeksContext = (): IndeksContextValue => {
  const context = useContext(IndeksContext);
  if (!context) {
    throw new Error('useIndeksContext must be used within an IndeksProvider');
  }
  return context;
};
