import { useIndeksContext } from "@/context/IndeksContext";
import type { IndeksTracker, IndeksConfig } from "@indeks/core";

/**
 * Main hook to access Indeks tracker functionality
 * Must be used within an IndeksProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tracker, isInitialized, sessionId } = useIndeks();
 *
 *   if (!isInitialized) {
 *     return <div>Loading tracker...</div>;
 *   }
 *
 *   return <div>Session: {sessionId}</div>;
 * }
 * ```
 */
export interface UseIndeksReturn {
  tracker: IndeksTracker | null;
  isInitialized: boolean;
  sessionId: string | null;
  userId: string | null;
  config: Partial<IndeksConfig> | null;
}

export const useIndeks = (): UseIndeksReturn => {
  const { tracker, isInitialized, sessionId, userId, config } = useIndeksContext();

  return {
    tracker,
    isInitialized,
    sessionId,
    userId,
    config,
  };
};
